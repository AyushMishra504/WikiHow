import { useState, useRef, useCallback } from "react";
import { EXAMPLES, RANDOM_TOPICS } from "../utils/knowledge";
import Graph from "../components/Graph";
import Search from "../components/Search";
import "../styles/Explore.css";

// ── Wikipedia API Fetcher ──────────────────────────────────────────────────────────────

const API_BASE = "http://localhost:5000";

async function fetchRelated(topic) {
  try {
      const res = await fetch(`${API_BASE}/api/wiki/getData/${encodeURIComponent(topic)}`);
    if (!res.ok){
      console.log(res);
       throw new Error("API error");
    }
    const data = await res.json();
    return {
      links: (data.links || []).slice(0, 6),
      pageData: data.pageData || { title: topic, extract: "", image: null },
    };
  } catch (err) {
    console.error("Failed to fetch topic:", topic, err);
    return {
      links: [],
      pageData: { title: topic, extract: "Could not load data for this topic.", image: null },
    };
  }
}

export default function Explore() {
  const graphRef = useRef(null);
  const [isExploring, setIsExploring] = useState(false);
  const [query, setQuery] = useState("");
  const [topicDetails, setTopicDetails] = useState({});

  // Wraps the async fetcher so it: (1) returns links for the graph, (2) caches pageData
  const fetchNodeData = useCallback(async (topic) => {
    const result = await fetchRelated(topic);
    // Cache the pageData for the info panel
    setTopicDetails((prev) => ({
      ...prev,
      [topic.toLowerCase()]: result.pageData,
    }));
    return result.links;
  }, []);

  const handleSearch = useCallback((topic) => {
    const t = topic || query; 
    if (!t.trim()) return;
    setQuery(""); 
    setTopicDetails({});
    setIsExploring(true);
    graphRef.current?.startExploration(t);
  }, [query]);

  const handleRandom = () => {
    const topic = RANDOM_TOPICS[Math.floor(Math.random() * RANDOM_TOPICS.length)];
    setTopicDetails({});
    setIsExploring(true);
    graphRef.current?.startExploration(topic);
  };
  
  const handleGoHome = () => {
    graphRef.current?.collapseToParent();
  };

  const handleCollapseEnd = () => {
    setIsExploring(false);
    setTopicDetails({});
  };

  return(
    <div className="explore-container">
      <Graph 
        ref={graphRef}
        fetchNodeData={fetchNodeData}
        topicDetails={topicDetails}
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