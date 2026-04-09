import { useState, useEffect, useRef } from "react";
import '../styles/Search.css';

export default function Search({ onSearch, placeholder = "From atoms to art—start your journey", mini = false }) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState(query);
  const [results, setResults] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounce logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Fetch Wikipedia autocompletion with race condition protection
  useEffect(() => {
    if (!debounced.trim()) {
      setResults([]);
      setSelectedIndex(-1);
      return;
    }

    const controller = new AbortController();
    const fetchData = async () => {
      try {
        const res = await fetch(
          `https://en.wikipedia.org/w/api.php?origin=*&action=opensearch&search=${encodeURIComponent(debounced)}&limit=5&namespace=0&format=json`,
          { signal: controller.signal }
        );
        const data = await res.json();
        setResults(data[1] || []);
        setSelectedIndex(-1); // Reset selection on new results
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Failed to fetch autocomplete suggestions", error);
          setResults([]);
        }
      }
    };

    fetchData();
    return () => controller.abort();
  }, [debounced]);

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    setIsDropdownOpen(true);
  };

  const handleSelect = (topic) => {
    setQuery(topic);
    setIsDropdownOpen(false);
    onSearch(topic);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
      setIsDropdownOpen(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleSelect(results[selectedIndex]);
      } else {
        setIsDropdownOpen(false);
        onSearch(query);
      }
    } else if (e.key === "Escape") {
      setIsDropdownOpen(false);
    }
  };

  const executeSearchClick = () => {
    setIsDropdownOpen(false);
    onSearch(query);
  };

  return (
    <div className="search-box" ref={wrapperRef}>
      <div className="search-input-wrapper">
        <span className="search-icon" style={{ color: "rgba(196,168,130,0.5)", fontSize: "0.82rem" }}>⌕</span>
        <input 
          className="search-input"
          value={query} 
          onChange={handleInputChange} 
          onKeyDown={handleKeyDown}
          onFocus={() => setIsDropdownOpen(true)}
          placeholder={placeholder} 
        />
        <button 
          className={mini ? "mini-search-btn" : "search-btn"} 
          onClick={executeSearchClick}
        >
          {mini ? "Go" : "Explore"}
        </button>
      </div>

      {isDropdownOpen && results.length > 0 && (
  <ul className="search-dropdown">
    {results.map((item, i) =>
      item.length > 2 && (
        <li
          key={i}
          className={`search-dropdown-item ${i === selectedIndex ? 'active' : ''}`}
          onClick={() => handleSelect(item)}
          onMouseEnter={() => setSelectedIndex(i)}
        >
          <span className="search-dropdown-icon">↳</span>
          {item}
        </li>
      )
    )}
  </ul>
)}
    </div>
  );
}