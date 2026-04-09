import React from 'react';
import '../styles/GraphFooter.css';

export default function GraphFooter({ stats }) {
  if (!stats) return null;
  return (
    <footer className="footer-overlay">
      <div className="footer-info">
        Spatial map of idea neighborhoods<br/>Click nodes to expand context
      </div>
      <div className="footer-stats">
        <span><span className="footer-stat-value">{stats.nodes}</span> nodes</span>
        <span className="footer-stat-divider"/>
        <span><span className="footer-stat-value">{stats.edges}</span> connections</span>
        <span className="footer-stat-divider"/>
        <span><span className="footer-stat-value">{stats.depth}</span> depth</span>
      </div>
    </footer>
  );
}
