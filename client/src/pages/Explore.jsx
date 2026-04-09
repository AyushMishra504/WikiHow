import { useState, useRef, useCallback } from "react";
import { knowledgeDB, EXAMPLES, RANDOM_TOPICS } from "../utils/knowledge";
import Graph from "../components/Graph";
import Search from "../components/Search";
import "../styles/Explore.css";

// ── Knowledge DB Fetcher ──────────────────────────────────────────────────────────────

function fetchRelated(topic) {
  const key = topic.toLowerCase();
  if (knowledgeDB[key]) return knowledgeDB[key];
  const general = ["History","Science","Mathematics","Culture","Technology","Society","Art","Nature","Physics","Biology","Chemistry","Literature","Music","Economics"];
  const seed = topic.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const results = [];
  for (let i = 0; i < 6; i++) {
    const idx = (seed * (i + 1) * 7) % general.length;
    const t = general[idx];
    if (!results.includes(t) && t.toLowerCase() !== key) results.push(t);
  }
  return results;
}

export default function Explore() {
  const graphRef = useRef(null);
  const [isExploring, setIsExploring] = useState(false);
  const [query, setQuery] = useState("");

  const handleSearch = useCallback((topic) => {
    const t = topic || query; 
    if (!t.trim()) return;
    setQuery(""); 
    setIsExploring(true);
    graphRef.current?.startExploration(t);
  }, [query]);

  const handleRandom = () => {
    const topic = RANDOM_TOPICS[Math.floor(Math.random() * RANDOM_TOPICS.length)];
    setIsExploring(true);
    graphRef.current?.startExploration(topic);
  };
  
  const handleGoHome = () => {
    graphRef.current?.collapseToParent();
  };

  const handleCollapseEnd = () => {
    setIsExploring(false);
  };

  return(
    <div className="explore-container">
      <Graph 
        ref={graphRef}
        fetchNodeData={fetchRelated}
        onGoHome={handleCollapseEnd}
      />

      {/* HERO */}
      {!isExploring && (
        <div className="hero-overlay">
          <div className="hero-text-container">
            <div className="hero-eyebrow">Knowledge Graph Explorer</div>
            <h1 className="hero-heading">
              Explore Living <em>Connections</em><br/>
              <span>Across Human Knowledge</span>
            </h1>
            <p className="hero-description">
              Type any topic and watch a living network of ideas bloom outward.<br/>Click nodes to dive deeper into the rabbit hole.
            </p>
          </div>
          <div className="search-container">
            <Search 
              onSearch={handleSearch} 
              placeholder="Type any topic: Quantum Physics, Renaissance, DNA" 
            />
            <div className="examples-container">
              {EXAMPLES.map(ex=>(
                <button key={ex} onClick={()=>handleSearch(ex)} className="example-btn">
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* EXPLORING UI */}
      {isExploring && (
        <>
          <nav className="nav-overlay">
            <button onClick={handleGoHome} className="nav-brand-btn">WikiDive</button>
            <div className="nav-actions">
              {[["00","Back",handleGoHome],["01","Random Topic",handleRandom]].map(([idx,label,fn])=>(
                <button key={idx} onClick={fn} className="nav-action-btn">
                  <span>{idx}</span>{label}
                </button>
              ))}
            </div>
          </nav>

          <div className="mini-search-container">
            <Search 
              onSearch={handleSearch} 
              mini={true} 
              placeholder="From atoms to art—start your journey" 
            />
          </div>
        </>
      )}
    </div>
  );
}