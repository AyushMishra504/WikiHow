import React from 'react';
import '../styles/GraphNodeInfo.css';

export default function GraphNodeInfo({ nodeLabel }) {
  if (!nodeLabel) return null;
  return (
    <div className="graph-node-info">
      <div className="node-info-eyebrow">Current Subject</div>
      <div className="node-info-title">{nodeLabel}</div>
      <div className="node-info-content">
        Information goes here. In the future, this box will populate with data from the Wikipedia API to provide deeper context about this topic.
      </div>
    </div>
  );
}
