import React, { useState } from 'react';
import '../styles/GraphRightPanel.css';

export default function GraphRightPanel({ stats, panelConnections, rootTopic, currentNode, onPanelClick }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!stats || !rootTopic) return null;

  return (
    <>
      <div className="graph-right-panel">
        <div className="panel-header" onClick={() => setCollapsed(c => !c)}>
          <span className="panel-header-title">Graph Info</span>
          <button className="panel-minimize-btn" tabIndex={-1}>
            {collapsed ? '▼' : '▲'}
          </button>
        </div>
        <div className={`panel-body ${collapsed ? 'collapsed' : 'expanded'}`}>
          <div className="panel-section">
            <div className="panel-label">Graph Depth</div>
            <div className="panel-value-large">{stats.depth}</div>
          </div>
          <div>
            <div className="panel-label">Connected Topics</div>
            <div className="panel-connections-list">
              {panelConnections.map((conn, i) => (
                <div key={i} onClick={() => onPanelClick(conn)} className="panel-connection">
                  <span className="panel-connection-dot"/>
                  {conn.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="root-topic-display">
        <div className="root-topic-label">Root Topic</div>
        <div className="root-topic-value">{rootTopic}</div>
        {currentNode && currentNode !== rootTopic && (
          <>
            <div className="root-topic-label" style={{ marginTop: '1rem' }}>Current Topic</div>
            <div className="root-topic-value">{currentNode}</div>
          </>
        )}
      </div>
    </>
  );
}
