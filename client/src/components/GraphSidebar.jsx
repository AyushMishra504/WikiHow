import React from 'react';
import '../styles/GraphSidebar.css';

export default function GraphSidebar({ history, currentIndex, onHistoryClick }) {
  if (!history || history.length === 0) return null;

  return (
    <div className="graph-sidebar">
      <div className="sidebar-label">Exploration Path</div>
      <div className="sidebar-history-list">
        {history.map((item, index) => {
          const isActive = index === currentIndex;
          const isFuture = index > currentIndex;
          return (
            <div
              key={`${item.label}-${index}`}
              className={`sidebar-history-item ${isActive ? 'active' : ''} ${isFuture ? 'future' : ''}`}
              onClick={() => onHistoryClick(item, index)}
            >
              <div className="sidebar-history-step">Step {index + 1}</div>
              <div className="sidebar-history-label">{item.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
