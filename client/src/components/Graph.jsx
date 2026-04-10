import React, { useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import GraphCanvas from './GraphCanvas';
import GraphSidebar from './GraphSidebar';
import GraphNodeInfo from './GraphNodeInfo';
import GraphRightPanel from './GraphRightPanel';
import GraphOverlay from './GraphOverlay';
import GraphFooter from './GraphFooter';

const Graph = forwardRef(({ fetchNodeData, topicDetails, onGoHome }, ref) => {
  const canvasRef = useRef(null);
  const [stats, setStats] = useState({ nodes: 0, edges: 0, depth: 0 });
  const [panelConnections, setPanelConnections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentNode, setCurrentNode] = useState("");
  const [nodeLabels, setNodeLabels] = useState([]);
  const [history, setHistory] = useState([]); // Array of { label, nodeRef }
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [rootTopic, setRootTopic] = useState("");

  const handleNodeSelect = useCallback((node) => {
    setHistory((prev) => {
      const existingIdx = prev.findIndex((h) => h.label === node.label);

      // CASE 1: Node already in history → user is navigating back, preserve everything
      if (existingIdx !== -1) {
        setCurrentIndex(existingIdx);
        setCurrentNode(node.label);
        return prev;
      }

      // Get current position's label (the "parent" we're expanding from)
      const parentLabel = node.parent?.label; // node.parent is a Three.js node OBJECT, not a string

      // CASE 2: Normal forward navigation from current position
      // The clicked node's parent matches the node we're currently on
      const current = prev[currentIndex];
      if (current && parentLabel === current.label) {
        // Trim anything after currentIndex, then append
        const nextHistory = [...prev.slice(0, currentIndex + 1), {
          label: node.label,
          nodeRef: node
        }];
        setCurrentIndex(nextHistory.length - 1);
        setCurrentNode(node.label);
        return nextHistory;
      }

      // CASE 3: Parent changed (user went back and chose a different branch)
      // Find where the parent lives in history, trim everything after it, append new choice
      const parentIndex = prev.findIndex((h) => h.label === parentLabel);

      const base = parentIndex !== -1
        ? prev.slice(0, parentIndex + 1)
        : prev.slice(0, currentIndex + 1);

      const nextHistory = [...base, {
        label: node.label,
        nodeRef: node
      }];

      setCurrentIndex(nextHistory.length - 1);
      setCurrentNode(node.label);

      return nextHistory;
    });
  }, [currentIndex]);

  const handlePanelClick = useCallback((conn) => {
    canvasRef.current?.focusNode(conn.nodeRef);
    canvasRef.current?.expandNode(conn.nodeRef);
    setPanelConnections(canvasRef.current?.getPanelConnections(conn.nodeRef) || []);
  }, []);

  const handleHistoryClick = useCallback((item, index) => {
    // Navigate to this history entry — do NOT trim descendants yet.
    // Descendants only get trimmed if the user picks a DIFFERENT node from this position.
    setCurrentIndex(index);
    setCurrentNode(item.label);
    canvasRef.current?.focusNode(item.nodeRef);
    canvasRef.current?.expandNode(item.nodeRef);
    setPanelConnections(canvasRef.current?.getPanelConnections(item.nodeRef) || []);
  }, []);

  useImperativeHandle(ref, () => ({
    startExploration: (topic) => {
      setRootTopic(topic);
      setHistory([]);
      setCurrentIndex(-1);
      canvasRef.current?.startExploration(topic);
    },
    collapseToParent: () => {
      canvasRef.current?.collapseToParent();
    }
  }));

  const handleCollapseEnd = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
    setRootTopic("");
    setCurrentNode("");
    onGoHome?.();
  }, [onGoHome]);

  return (
    <>
      <GraphCanvas 
        ref={canvasRef}
        fetchNodeData={fetchNodeData}
        onHover={() => {}} // Deprecated
        onNodeLabelsUpdate={setNodeLabels}
        onSelect={setPanelConnections}
        onNodeSelect={handleNodeSelect}
        onStatsUpdate={setStats}
        onLoading={setLoading}
        onCollapseEnd={handleCollapseEnd}
      />
      <GraphSidebar history={history} currentIndex={currentIndex} onHistoryClick={handleHistoryClick} currentNode={currentNode} />
      <GraphNodeInfo nodeLabel={currentNode} topicDetails={topicDetails} />
      <GraphRightPanel stats={stats} panelConnections={panelConnections} rootTopic={rootTopic} currentNode={currentNode} onPanelClick={handlePanelClick} />
      <GraphOverlay nodeLabels={nodeLabels} loading={loading} />
      {history.length > 0 && <GraphFooter stats={stats} />}
    </>
  );
});

export default Graph;
