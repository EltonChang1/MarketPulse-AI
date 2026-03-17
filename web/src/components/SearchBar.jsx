import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export default function SearchBar({ onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/search`, {
          params: { q: query },
        });
        setResults(data.results || []);
        setShowResults(true);
      } catch (error) {
        console.error("Search failed:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target) &&
        resultsRef.current &&
        !resultsRef.current.contains(e.target)
      ) {
        setShowResults(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(result) {
    setQuery("");
    setShowResults(false);
    setResults([]);
    onSelect(result.symbol);
  }

  return (
    <div className="search-bar-container">
      <div className="search-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setShowResults(true)}
          placeholder="Search stocks by name or ticker... (e.g., AAPL or Apple)"
          className="search-input"
        />
        {loading && <span className="search-spinner">⋯</span>}
      </div>

      {showResults && (
        <div ref={resultsRef} className="search-results">
          {results.length > 0 ? (
            results.map((result) => (
              <div
                key={result.symbol}
                className="search-result-item"
                onClick={() => handleSelect(result)}
              >
                <div className="result-symbol">{result.symbol}</div>
                <div className="result-name">{result.name}</div>
                <div className="result-exchange">{result.exchange || result.type || ""}</div>
              </div>
            ))
          ) : query.trim() ? (
            <div className="search-no-results">No stocks found</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
