import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createCollapseToParentController } from "./createCollapseToParentController";
import "../styles/Graph.css";

const depthColors = [
  new THREE.Color(0xc4a882),
  new THREE.Color(0xd2b89a),
  new THREE.Color(0xb39a7a),
  new THREE.Color(0xe0d3c4),
  new THREE.Color(0x8b7355),
  new THREE.Color(0xcab29a),
  new THREE.Color(0xf0ebe3),
];
function getDepthColor(d) {
  return depthColors[Math.min(d, depthColors.length - 1)];
}

const GraphCanvas = forwardRef(
  (
    {
      fetchNodeData,
      onHover,
      onSelect,
      onNodeSelect,
      onStatsUpdate,
      onLoading,
      onCollapseEnd,
      onNodeLabelsUpdate,
    },
    ref,
  ) => {
    const mountRef = useRef(null);
    const sharedMethods = useRef({});

    useImperativeHandle(ref, () => ({
      startExploration: (topic) =>
        sharedMethods.current.startExploration?.(topic),
      goHome: () => sharedMethods.current.goHome?.(),
      expandNode: (node) => sharedMethods.current.expandNode?.(node),
      focusNode: (node) => sharedMethods.current.focusNode?.(node),
      collapseToParent: () => sharedMethods.current.collapseToParent?.(),
      getPanelConnections: (node) =>
        sharedMethods.current.getPanelConnections?.(node),
    }));

    useEffect(() => {
      const container = mountRef.current;

      // Safety check in case of fast unmounts
      if (!container) return;

      const renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.8;
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0e0e0e);
      scene.fog = new THREE.FogExp2(0x0e0e0e, 0.06);
      const camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        500,
      );
      camera.position.set(0, 0, 30);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.enablePan = true;
      controls.rotateSpeed = 0.75;
      controls.zoomSpeed = 1.05;
      controls.minDistance = 10;
      controls.maxDistance = 80;

      const targetOrbitCenter = new THREE.Vector3(0, 0, 0);
      let isTransitioningZoom = false;

      scene.add(new THREE.AmbientLight(0x7a756d, 1.8));
      const pl1 = new THREE.PointLight(0xc4a882, 10, 100);
      pl1.position.set(10, 10, 15);
      scene.add(pl1);
      const pl2 = new THREE.PointLight(0x8b7355, 8, 100);
      pl2.position.set(-10, -5, 10);
      scene.add(pl2);
      const pl3 = new THREE.PointLight(0xf0ebe3, 5, 100);
      pl3.position.set(0, 15, -10);
      scene.add(pl3);

      const MAX_NODES = 500;
      const nodeMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xc4a882,
        emissiveIntensity: 0.6,
        metalness: 0.3,
        roughness: 0.4,
      });
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xc4a882,
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide,
      });

      const nodeInstanced = new THREE.InstancedMesh(
        new THREE.SphereGeometry(1, 10, 8),
        nodeMat,
        MAX_NODES,
      );
      nodeInstanced.count = 0;
      nodeInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      nodeInstanced.frustumCulled = false;
      scene.add(nodeInstanced);

      const nodeColors = new Float32Array(MAX_NODES * 3);
      nodeInstanced.instanceColor = new THREE.InstancedBufferAttribute(
        nodeColors,
        3,
      );

      const glowInstanced = new THREE.InstancedMesh(
        new THREE.SphereGeometry(1, 10, 8),
        glowMat,
        MAX_NODES,
      );
      glowInstanced.count = 0;
      glowInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      glowInstanced.frustumCulled = false;
      scene.add(glowInstanced);

      const dummy = new THREE.Object3D();
      const edgeGroup = new THREE.Group();
      scene.add(edgeGroup);

      const BG_COUNT = 900;
      const bgGeo = new THREE.BufferGeometry();
      const bPos = new Float32Array(BG_COUNT * 3),
        bSz = new Float32Array(BG_COUNT),
        bAl = new Float32Array(BG_COUNT);
      for (let i = 0; i < BG_COUNT; i++) {
        bPos[i * 3] = (Math.random() - 0.5) * 120;
        bPos[i * 3 + 1] = (Math.random() - 0.5) * 120;
        bPos[i * 3 + 2] = (Math.random() - 0.5) * 120;
        bSz[i] = 0.3 + Math.random() * 0.8;
        bAl[i] = 0.1 + Math.random() * 0.4;
      }
      bgGeo.setAttribute("position", new THREE.BufferAttribute(bPos, 3));
      bgGeo.setAttribute("aSize", new THREE.BufferAttribute(bSz, 1));
      bgGeo.setAttribute("aAlpha", new THREE.BufferAttribute(bAl, 1));
      const bgMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: renderer.getPixelRatio() },
        },
        vertexShader: `attribute float aSize;attribute float aAlpha;varying float vAlpha;uniform float uTime;uniform float uPixelRatio;void main(){vAlpha=aAlpha;vec3 pos=position;pos.x+=sin(uTime*0.03+position.y*0.1)*0.3;pos.y+=cos(uTime*0.02+position.z*0.1)*0.3;vec4 mvPos=modelViewMatrix*vec4(pos,1.0);gl_PointSize=aSize*uPixelRatio*80.0/-mvPos.z;gl_PointSize=max(gl_PointSize,0.8);gl_Position=projectionMatrix*mvPos;}`,
        fragmentShader: `varying float vAlpha;void main(){float d=length(gl_PointCoord-vec2(0.5));if(d>0.5)discard;float alpha=smoothstep(0.5,0.0,d)*vAlpha*0.25;gl_FragColor=vec4(0.77,0.66,0.51,alpha);}`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      scene.add(new THREE.Points(bgGeo, bgMat));

      const graphNodes = [],
        graphEdges = [],
        clock = new THREE.Clock();
      let maxDepth = 0,
        hoveredNode = null,
        selectedNode = null,
        isExploringLocal = false;

      function findNode(label) {
        return graphNodes.find(
          (n) => n.label.toLowerCase() === label.toLowerCase() && n.alive,
        );
      }

      function addNode(label, depth, parent) {
        if (graphNodes.length >= MAX_NODES) return null;
        const ex = findNode(label);
        if (ex) return ex;
        const a = Math.random() * Math.PI * 2,
          p = Math.random() * Math.PI,
          r = parent ? 4 + Math.random() * 3 : 0;
        const x = parent ? parent.x + Math.sin(p) * Math.cos(a) * r : 0;
        const y = parent ? parent.y + Math.sin(p) * Math.sin(a) * r : 0;
        const z = parent ? parent.z + Math.cos(p) * r : 0;
        const color = getDepthColor(depth),
          baseSize = depth === 0 ? 0.55 : Math.max(0.2, 0.45 - depth * 0.05);
        const node = {
          id: graphNodes.length,
          label,
          x,
          y,
          z,
          vx: 0,
          vy: 0,
          vz: 0,
          depth,
          parent,
          connections: [],
          size: baseSize,
          targetSize: baseSize,
          currentSize: 0,
          color: color.clone(),
          birthTime: clock.getElapsedTime(),
          alive: true,
          expanded: false,
        };
        graphNodes.push(node);
        return node;
      }

      function addEdge(src, tgt) {
        if (
          graphEdges.find(
            (e) =>
              (e.source === src && e.target === tgt) ||
              (e.source === tgt && e.target === src),
          )
        )
          return;
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(src.x, src.y, src.z),
          new THREE.Vector3(tgt.x, tgt.y, tgt.z),
        ]);
        const mat = new THREE.LineBasicMaterial({
          color: src.color.clone().lerp(tgt.color, 0.5),
          transparent: true,
          opacity: 0,
        });
        const line = new THREE.Line(geo, mat);
        edgeGroup.add(line);
        graphEdges.push({
          source: src,
          target: tgt,
          line,
          birthTime: clock.getElapsedTime(),
          alive: true,
          targetOpacity: 0.2,
        });
        src.connections.push(tgt);
        tgt.connections.push(src);
      }

      function updateStatsLocal() {
        const newStats = {
          nodes: graphNodes.filter((n) => n.alive).length,
          edges: graphEdges.filter((e) => e.alive).length,
          depth: maxDepth,
        };
        onStatsUpdate?.(newStats);
      }

      const collapseController = createCollapseToParentController({
        THREE,
        graphNodes,
        graphEdges,
        clock,
        updateStats: updateStatsLocal,
        clearInteraction: () => {
          selectedNode = null;
          hoveredNode = null;
          onHover?.((tip) => ({ ...tip, visible: false }));
        },
        clearSelection: () => {
          selectedNode = null;
          hoveredNode = null;
          onHover?.((tip) => ({ ...tip, visible: false }));
          onSelect?.([]);
        },
        setCursorGrab: () => {
          if (renderer.domElement) renderer.domElement.style.cursor = "grab";
        },
        onComplete: () => {
          onCollapseEnd?.();
        },
        onFocusNode: (node) => {
          if (!node) return;
          selectedNode = node;
          targetOrbitCenter.set(node.x, node.y, node.z);
          isTransitioningZoom = true;
        },
      });

      async function collapseToParent() {
        const rootNode = graphNodes.find(n => n.alive && n.depth === 0);
        if (rootNode) {
          focusNode(rootNode);
          
          if (isTransitioningZoom) {
            await new Promise(resolve => {
              const checkInterval = setInterval(() => {
                if (!isTransitioningZoom) {
                  clearInterval(checkInterval);
                  resolve();
                }
              }, 50);
            });
          }
        }
        collapseController.collapseToParent();
      }

      async function expandNode(node) {
        if (node.expanded) return;
        node.expanded = true;
        if (node.depth + 1 > maxDepth) maxDepth = node.depth + 1;
        onLoading?.(true);

        let related = [];
        try {
          related = (await fetchNodeData(node.label)) || [];
        } catch (err) {
          console.error("Failed to fetch node data:", err);
        }
        onLoading?.(false);

        for (let i = 0; i < related.length; i++) {
          if (graphNodes.length >= MAX_NODES) break;
          const child = addNode(related[i], node.depth + 1, node);
          if (child && child !== node) addEdge(node, child);
        }
        updateStatsLocal();
        onNodeSelect?.(node);
        onSelect?.(
          node.connections.map((c) => ({ label: c.label, nodeRef: c })),
        );
      }

      function clearGraph() {
        collapseController.reset();
        graphNodes.length = 0;
        graphEdges.forEach((e) => {
          edgeGroup.remove(e.line);
          e.line.geometry.dispose();
          e.line.material.dispose();
        });
        graphEdges.length = 0;
        nodeInstanced.count = 0;
        glowInstanced.count = 0;
        maxDepth = 0;
        hoveredNode = null;
        selectedNode = null;
        updateStatsLocal();
      }

      function simulateForces(dt) {
        const nodes = graphNodes.filter((n) => n.alive);
        const rep = 3,
          att = 0.015,
          damp = 0.82,
          cp = 0.005,
          jit = 0.0003,
          rSq = 36 * 36;
        for (let i = 0; i < nodes.length; i++)
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i],
              b = nodes[j];
            let dx = a.x - b.x,
              dy = a.y - b.y,
              dz = a.z - b.z,
              dSq = dx * dx + dy * dy + dz * dz;
            if (dSq > rSq) continue;
            let d = Math.sqrt(dSq);
            if (d < 0.5) d = 0.5;
            const f = rep / (dSq + 4),
              fx = (dx / d) * f,
              fy = (dy / d) * f,
              fz = (dz / d) * f;
            a.vx += fx;
            a.vy += fy;
            a.vz += fz;
            b.vx -= fx;
            b.vy -= fy;
            b.vz -= fz;
          }
        for (const e of graphEdges) {
          if (!e.alive) continue;
          const a = e.source,
            b = e.target,
            dx = b.x - a.x,
            dy = b.y - a.y,
            dz = b.z - a.z;
          let d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const ideal = 5 + (a.depth + b.depth) * 0.5;
          if (d > 0.1) {
            const f = (d - ideal) * att,
              fx = (dx / d) * f,
              fy = (dy / d) * f,
              fz = (dz / d) * f;
            a.vx += fx;
            a.vy += fy;
            a.vz += fz;
            b.vx -= fx;
            b.vy -= fy;
            b.vz -= fz;
          }
        }
        for (const n of nodes) {
          n.vx -= n.x * cp;
          n.vy -= n.y * cp;
          n.vz -= n.z * cp;
          n.vx += (Math.random() - 0.5) * jit;
          n.vy += (Math.random() - 0.5) * jit;
          n.vz += (Math.random() - 0.5) * jit;
          n.vx *= damp;
          n.vy *= damp;
          n.vz *= damp;
          if (n.depth === 0) {
            n.vx *= 0.5;
            n.vy *= 0.5;
            n.vz *= 0.5;
          }
          n.x += n.vx * dt;
          n.y += n.vy * dt;
          n.z += n.vz * dt;
        }
      }

      function updateInstancedMeshes(elapsed) {
        const alive = graphNodes.filter((n) => n.alive);
        nodeInstanced.count = alive.length;
        glowInstanced.count = alive.length;
        for (let i = 0; i < alive.length; i++) {
          const node = alive[i],
            age = elapsed - node.birthTime,
            growT = Math.min(age / 0.6, 1);
          node.currentSize = node.targetSize * (1 - Math.pow(1 - growT, 3));
          let scale = node.currentSize;
          if (node === hoveredNode) scale *= 1.4;
          else if (node === selectedNode) scale *= 1.3;
          let alpha = 1;
          if (
            hoveredNode &&
            node !== hoveredNode &&
            !hoveredNode.connections.includes(node)
          )
            alpha = 0.25;
          dummy.position.set(node.x, node.y, node.z);
          dummy.scale.setScalar(scale);
          dummy.updateMatrix();
          nodeInstanced.setMatrixAt(i, dummy.matrix);
          const c = node.color;
          nodeColors[i * 3] = c.r * alpha;
          nodeColors[i * 3 + 1] = c.g * alpha;
          nodeColors[i * 3 + 2] = c.b * alpha;
          dummy.scale.setScalar(scale * 2.5);
          dummy.updateMatrix();
          glowInstanced.setMatrixAt(i, dummy.matrix);
        }
        nodeInstanced.instanceMatrix.needsUpdate = true;
        nodeInstanced.instanceColor.needsUpdate = true;
        glowInstanced.instanceMatrix.needsUpdate = true;
      }

      function updateEdges(elapsed) {
        for (const e of graphEdges) {
          if (!e.alive) continue;
          const fadeIn = Math.min((elapsed - e.birthTime) / 0.8, 1);
          let alpha = e.targetOpacity;
          if (hoveredNode) {
            alpha =
              e.source === hoveredNode || e.target === hoveredNode ? 0.6 : 0.03;
          }
          e.line.material.opacity = alpha * fadeIn;
          const p = e.line.geometry.attributes.position.array;
          p[0] = e.source.x;
          p[1] = e.source.y;
          p[2] = e.source.z;
          p[3] = e.target.x;
          p[4] = e.target.y;
          p[5] = e.target.z;
          e.line.geometry.attributes.position.needsUpdate = true;
        }
      }

      const raycaster = new THREE.Raycaster(),
        mouseNDC = new THREE.Vector2(9999, 9999);
      function checkNodeHover(sx, sy) {
        mouseNDC.x = (sx / window.innerWidth) * 2 - 1;
        mouseNDC.y = -(sy / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouseNDC, camera);
        let closest = null,
          closestD = Infinity;
        for (const n of graphNodes) {
          if (!n.alive) continue;
          const d = raycaster.ray.distanceToPoint(
            new THREE.Vector3(n.x, n.y, n.z),
          );
          if (d < n.currentSize * 2 && d < closestD) {
            closestD = d;
            closest = n;
          }
        }
        if (closest !== hoveredNode) {
          hoveredNode = closest;
          if (hoveredNode) {
            renderer.domElement.style.cursor = "pointer";
          } else {
            if (renderer.domElement) renderer.domElement.style.cursor = "grab";
          }
        }
      }

      async function startExploration(topic) {
        collapseController.reset();
        clearGraph();
        maxDepth = 0;
        targetOrbitCenter.set(0, 0, 0);
        camera.position.set(0, 2, 18);
        controls.target.set(0, 0, 0);
        controls.update();
        isExploringLocal = true;

        const root = addNode(topic, 0, null);
        await expandNode(root);

        selectedNode = root;
        onNodeSelect?.(root);
        onSelect?.(
          root.connections.map((c) => ({ label: c.label, nodeRef: c })),
        );
      }

      function goHome() {
        collapseController.reset();
        clearGraph();
        isExploringLocal = false;
        targetOrbitCenter.set(0, 0, 0);
        controls.target.set(0, 0, 0);
        camera.position.set(0, 0, 30);
        controls.update();
        onHover?.((t) => ({ ...t, visible: false }));
        if (renderer.domElement) renderer.domElement.style.cursor = "grab";
      }

      function focusNode(node) {
        if (!node) return;
        selectedNode = node;
        targetOrbitCenter.set(node.x, node.y, node.z);
        isTransitioningZoom = true;
      }

      // Attach to shared ref so imperative handle can reach inside useEffect scope
      sharedMethods.current = {
        startExploration,
        goHome,
        expandNode: (node) => expandNode(node),
        focusNode,
        collapseToParent,
        getPanelConnections: (node) =>
          node.connections.map((c) => ({ label: c.label, nodeRef: c })),
      };

      const onMouseMove = (e) => {
        if (isExploringLocal) checkNodeHover(e.clientX, e.clientY);
      };
      const onClick = async () => {
        if (!isExploringLocal || !hoveredNode || collapseController.isActive())
          return;
        selectedNode = hoveredNode;
        targetOrbitCenter.set(hoveredNode.x, hoveredNode.y, hoveredNode.z);
        isTransitioningZoom = true;
        if (!hoveredNode.expanded) await expandNode(hoveredNode);
        onNodeSelect?.(hoveredNode);
        onSelect?.(
          hoveredNode.connections.map((c) => ({ label: c.label, nodeRef: c })),
        );
      };

      const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        bgMat.uniforms.uPixelRatio.value = renderer.getPixelRatio();
      };

      // Note: react fast-refresh can sometimes detach listeners weirdly if DOM elements recreate,
      // so it's always good practice ensuring we attach to the created dom element
      const canvasDom = renderer.domElement;
      canvasDom.addEventListener("mousemove", onMouseMove);
      canvasDom.addEventListener("click", onClick);
      window.addEventListener("resize", onResize);

      let simFrame = 0,
        animId;
      function animate() {
        animId = requestAnimationFrame(animate);
        const elapsed = clock.getElapsedTime();
        clock.getDelta();
        bgMat.uniforms.uTime.value = elapsed;
        if (graphNodes.length > 0 && simFrame++ % 2 === 0)
          simulateForces(0.016 * 60);
        collapseController.update(elapsed);
        updateInstancedMeshes(elapsed);
        updateEdges(elapsed);
        controls.target.lerp(targetOrbitCenter, 0.05);

        if (isTransitioningZoom) {
          const offset = new THREE.Vector3().subVectors(
            camera.position,
            controls.target,
          );
          const currentDist = offset.length();
          const newDist = THREE.MathUtils.lerp(currentDist, 18, 0.04);
          if (Math.abs(newDist - 18) < 0.2) isTransitioningZoom = false;
          offset.setLength(newDist);
          camera.position.addVectors(controls.target, offset);
        }

        controls.update();
        pl1.position.x = 10 + Math.sin(elapsed * 0.15) * 5;
        pl2.position.y = -5 + Math.cos(elapsed * 0.12) * 3;

        // --- Handle Node Labels Projection ---
        const labelsArray = [];
        const project = (node, type) => {
          if (!node || !node.alive) return;
          const pos = new THREE.Vector3(node.x, node.y, node.z);
          pos.project(camera);
          
          // Check if node is in front of camera
          if (pos.z > 1) return;

          const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
          const y = (-(pos.y * 0.5) + 0.5) * window.innerHeight;
          
          // Offset Y based on node size
          const offset = (node.currentSize * 250) / camera.position.distanceTo(new THREE.Vector3(node.x, node.y, node.z));
          
          labelsArray.push({
            id: node.id,
            label: node.label,
            x,
            y: y - (10 + offset),
            type
          });
        };

        if (hoveredNode) {
          project(hoveredNode, 'hovered');
        }
        if (selectedNode && selectedNode !== hoveredNode) {
          project(selectedNode, 'selected');
        }
        
        onNodeLabelsUpdate?.(labelsArray);
        // ------------------------------------

        renderer.render(scene, camera);
      }
      animate();

      return () => {
        cancelAnimationFrame(animId);
        canvasDom.removeEventListener("mousemove", onMouseMove);
        canvasDom.removeEventListener("click", onClick);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
        if (container.contains(canvasDom)) container.removeChild(canvasDom);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <div ref={mountRef} className="graph-canvas-container" />;
  },
);

export default GraphCanvas;
