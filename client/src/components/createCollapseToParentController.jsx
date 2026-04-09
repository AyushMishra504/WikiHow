export function createCollapseToParentController({
  THREE,
  graphNodes,
  graphEdges,
  clock,
  updateStats,
  clearInteraction,
  clearSelection,
  setCursorGrab,
  onComplete,
  onFocusNode,
}) {
  const state = {
    active: false,
    phase: "idle",
    currentRound: [],
    roundStartTime: 0,
    roundDuration: 0.45,
    nodeStartPositions: new Map(),
    rootNode: null,
    rootStartTime: 0,
    rootDuration: 0.5,
  };

  function hideDeadNodeEdges() {
    for (const edge of graphEdges) {
      if (!edge.alive) continue;
      if (!edge.source.alive || !edge.target.alive) {
        edge.alive = false;
        edge.line.visible = false;
      }
    }
  }

  function getRootNode() {
    const alive = graphNodes.filter((node) => node.alive);
    if (alive.length === 0) return null;
    return (
      alive.find((node) => node.depth === 0) ||
      alive.find((node) => !node.parent) ||
      alive[0]
    );
  }

  function beginRound(elapsed) {
    const root = state.rootNode;
    const alive = graphNodes.filter((node) => node.alive && node !== root);

    if (alive.length === 0) {
      state.phase = "root";
      state.rootStartTime = elapsed;
      return;
    }

    const leaves = alive.filter(
      (node) => !alive.some((candidate) => candidate.parent === node),
    );

    if (leaves.length === 0) {
      state.phase = "root";
      state.rootStartTime = elapsed;
      return;
    }

    state.phase = "round";
    state.currentRound = leaves;
    state.roundStartTime = elapsed;
    state.nodeStartPositions.clear();

    // Focus the last surviving non-leaf node (the new "tip" of the graph)
    const aliveAfter = alive.filter(n => !leaves.includes(n));
    if (aliveAfter.length > 0) {
      onFocusNode?.(aliveAfter[aliveAfter.length - 1]);
    } else if (state.rootNode) {
      onFocusNode?.(state.rootNode);
    }

    for (const node of leaves) {
      state.nodeStartPositions.set(node.id, {
        x: node.x,
        y: node.y,
        z: node.z,
      });
    }
  }

  function reset() {
    state.active = false;
    state.phase = "idle";
    state.currentRound = [];
    state.nodeStartPositions.clear();
    state.rootNode = null;
  }

  function isActive() {
    return state.active;
  }

  function collapseToParent() {
    if (state.active) return;

    const root = getRootNode();
    if (!root) return;

    state.active = true;
    state.rootNode = root;
    clearInteraction?.();
    setCursorGrab?.();
    beginRound(clock.getElapsedTime());
  }

  function update(elapsed) {
    if (!state.active) return;

    if (state.phase === "round") {
      const t = Math.min(
        (elapsed - state.roundStartTime) / state.roundDuration,
        1,
      );

      for (const node of state.currentRound) {
        if (!node.alive || !node.parent || !node.parent.alive) continue;

        const start = state.nodeStartPositions.get(node.id);
        if (!start) continue;

        node.x = THREE.MathUtils.lerp(start.x, node.parent.x, t);
        node.y = THREE.MathUtils.lerp(start.y, node.parent.y, t);
        node.z = THREE.MathUtils.lerp(start.z, node.parent.z, t);
        node.targetSize = Math.max(0.02, node.size * (1 - t));
      }

      if (t >= 1) {
        for (const node of state.currentRound) {
          node.alive = false;
          node.currentSize = 0;
          node.targetSize = 0;
        }

        hideDeadNodeEdges();
        updateStats?.();
        beginRound(elapsed);
      }
      return;
    }

    if (state.phase === "root") {
      const root = state.rootNode;
      if (!root || !root.alive) {
        reset();
        return;
      }

      const t = Math.min(
        (elapsed - state.rootStartTime) / state.rootDuration,
        1,
      );
      root.targetSize = Math.max(0, root.size * (1 - t));

      if (t >= 1) {
        root.alive = false;
        root.currentSize = 0;
        root.targetSize = 0;

        hideDeadNodeEdges();
        clearSelection?.();
        updateStats?.();
        reset();
        onComplete?.();
      }
    }
  }

  return {
    reset,
    isActive,
    update,
    collapseToParent,
    getRootNode,
  };
}
