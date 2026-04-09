import React from 'react';
import '../styles/GraphOverlay.css';

export default function GraphOverlay({ nodeLabels, loading }) {
  return (
    <>
      <div className="node-labels-container">
        {nodeLabels?.map((label) => (
          <div 
            key={`${label.type}-${label.id}`} 
            className={`node-floating-label ${label.type}`}
            style={{ 
              left: label.x, 
              top: label.y 
            }}
          >
            {label.label}
          </div>
        ))}
      </div>

      {loading && (
        <div className="explore-loading">
          <svg className="spinner" width={34} height={34} viewBox="0 0 50 50">
            <circle cx={25} cy={25} r={20} stroke="#c4a882" strokeWidth={2} strokeDasharray={82} strokeDashoffset={62} fill="none"/>
          </svg>
        </div>
      )}
    </>
  );
}
