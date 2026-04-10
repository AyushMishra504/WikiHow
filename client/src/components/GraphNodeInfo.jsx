import React from 'react';
import '../styles/GraphNodeInfo.css';

export default function GraphNodeInfo({ nodeLabel, topicDetails }) {
  if (!nodeLabel) return null;

  const details = topicDetails?.[nodeLabel.toLowerCase()];
  const isLoading = !details;

  return (
    <div className="graph-node-info">
      <div className="node-info-eyebrow">Current Subject</div>

      {isLoading ? (
        <div className="node-info-skeleton">
          <div className="skeleton-title" />
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
        </div>
      ) : (
        <>
          {details.image && (
            <div className="node-info-image-wrapper">
              <img
                src={details.image}
                alt={details.title}
                className="node-info-image"
              />
            </div>
          )}
          <div className="node-info-title">{details.title || nodeLabel}</div>
          <div className="node-info-content">
            {details.extract
              ? details.extract.length > 280
                ? details.extract.slice(0, 280) + "…"
                : details.extract
              : "No description available."}
          </div>
        </>
      )}
    </div>
  );
}
