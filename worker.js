// worker.js — Web Worker for MultiwaySystem evolution
// Runs the computation off the main thread to avoid UI jank.

class MultiwaySystem {
  constructor(rules) {
    this.rules = rules || [
      { from: 'Xo', to: 'oX' },
      { from: 'oX', to: 'Xo' }
    ];
    this.hasGrowthRules = this.rules.some(r => r.to.length > r.from.length);
    this.hasShrinkRules = this.rules.some(r => r.to.length < r.from.length);
    this.maxStateLength = 256;
    this.maxTotalStates = 5000;
    this.truncated = false;
    this.nodes = [];
    this.edges = [];
    this.stateMap = new Map();
    this.stepStates = [];
    this.branchialEdges = [];
    this._cachedBranchialSteps = null;
    this._currentStep = 0;
    this._initialState = '';
    this._maxWeight = 1; // tracked incrementally during evolve

    // Causal graph: events and their causal relationships
    this.causalEvents = [];  // { id, parentNodeId, childNodeId, ruleIdx, position, inputRange, outputRange, step }
    this.causalEdges = [];   // { from: eventId, to: eventId }
  }

  applyRules(state) {
    const results = [];
    for (let ri = 0; ri < this.rules.length; ri++) {
      const rule = this.rules[ri];
      let pos = 0;
      while (true) {
        const idx = state.indexOf(rule.from, pos);
        if (idx === -1) break;
        const newState = state.substring(0, idx) + rule.to + state.substring(idx + rule.from.length);
        results.push({ result: newState, ruleIdx: ri, position: idx });
        pos = idx + 1;
      }
    }
    return results;
  }

  getOrCreateNode(state, step) {
    if (!this.stateMap.has(step)) {
      this.stateMap.set(step, new Map());
      this.stepStates[step] = [];
    }
    const stepMap = this.stateMap.get(step);
    if (stepMap.has(state)) {
      return stepMap.get(state);
    }
    const id = this.nodes.length;
    const node = { id, state, step, weight: 0, x: 0, y: 0 };
    this.nodes.push(node);
    stepMap.set(state, id);
    this.stepStates[step].push(id);
    return id;
  }

  evolve(initialState, maxSteps) {
    this.nodes = [];
    this.edges = [];
    this.stateMap = new Map();
    this.stepStates = [];
    this.branchialEdges = [];
    this.causalEvents = [];
    this.causalEdges = [];
    this.truncated = false;
    this._currentStep = 0;
    this._adjCacheVersion = -1; // invalidate adjacency cache
    this._initialState = initialState;
    this._maxWeight = 1; // reset incremental max weight

    const rootId = this.getOrCreateNode(initialState, 0);
    this.nodes[rootId].weight = 1;

    for (let step = 0; step < maxSteps; step++) {
      const currentStepMap = this.stateMap.get(step);
      if (!currentStepMap) break;

      if (this.nodes.length >= this.maxTotalStates) {
        this.truncated = true;
        break;
      }

      for (const [state, nodeId] of currentStepMap) {
        const parentWeight = this.nodes[nodeId].weight;
        const results = this.applyRules(state);

        for (const r of results) {
          if (r.result.length > this.maxStateLength) continue;
          if (this.nodes.length >= this.maxTotalStates) {
            this.truncated = true;
            break;
          }
          const childId = this.getOrCreateNode(r.result, step + 1);
          this.edges.push({ from: nodeId, to: childId });
          this.nodes[childId].weight += parentWeight;
          // Track max weight incrementally (avoids O(n) scan later)
          if (this.nodes[childId].weight > this._maxWeight) this._maxWeight = this.nodes[childId].weight;

          // Record causal event
          const eventId = this.causalEvents.length;
          this.causalEvents.push({
            id: eventId,
            parentNodeId: nodeId,
            childNodeId: childId,
            ruleIdx: r.ruleIdx,
            position: r.position,
            inputRange: [r.position, r.position + this.rules[r.ruleIdx].from.length - 1],
            outputRange: [r.position, r.position + this.rules[r.ruleIdx].to.length - 1],
            step: step
          });
        }
        if (this.truncated) break;
      }
      if (this.truncated) break;
    }

    this._buildCausalEdges();
    this._currentStep = this.stepStates.length - 1;

    const actualFinalStep = this.stepStates.length - 1;
    this._buildBranchialGraph(actualFinalStep);
    this._computeLayout();

    return this;
  }

  /**
   * Initialize for interactive mode — sets up step 0 only.
   */
  initInteractive(initialState) {
    this.nodes = [];
    this.edges = [];
    this.stateMap = new Map();
    this.stepStates = [];
    this.branchialEdges = [];
    this.causalEvents = [];
    this.causalEdges = [];
    this.truncated = false;
    this._currentStep = 0;
    this._initialState = initialState;
    this._maxWeight = 1;

    const rootId = this.getOrCreateNode(initialState, 0);
    this.nodes[rootId].weight = 1;

    this._buildBranchialGraph(0);
    this._computeLayout();
    return this;
  }

  /**
   * Evolve one step forward from the current frontier.
   * Returns true if new states were generated.
   */
  evolveOneStep() {
    const step = this._currentStep;
    const currentStepMap = this.stateMap.get(step);
    if (!currentStepMap) return false;

    if (this.nodes.length >= this.maxTotalStates) {
      this.truncated = true;
      return false;
    }

    let generated = false;
    for (const [state, nodeId] of currentStepMap) {
      const parentWeight = this.nodes[nodeId].weight;
      const results = this.applyRules(state);

      for (const r of results) {
        if (r.result.length > this.maxStateLength) continue;
        if (this.nodes.length >= this.maxTotalStates) {
          this.truncated = true;
          break;
        }
        const childId = this.getOrCreateNode(r.result, step + 1);
        this.edges.push({ from: nodeId, to: childId });
        this.nodes[childId].weight += parentWeight;
        if (this.nodes[childId].weight > this._maxWeight) this._maxWeight = this.nodes[childId].weight;
        generated = true;

        // Record causal event
        const eventId = this.causalEvents.length;
        this.causalEvents.push({
          id: eventId,
          parentNodeId: nodeId,
          childNodeId: childId,
          ruleIdx: r.ruleIdx,
          position: r.position,
          inputRange: [r.position, r.position + this.rules[r.ruleIdx].from.length - 1],
          outputRange: [r.position, r.position + this.rules[r.ruleIdx].to.length - 1],
          step: step
        });
      }
      if (this.truncated) break;
    }

    if (generated || this.stepStates[step + 1]) {
      this._buildCausalEdges();
      this._currentStep = step + 1;
      this._buildBranchialGraph(this._currentStep);
      this._computeLayout();
      return true;
    }
    return false;
  }

  /**
   * Remove the latest step (pop nodes and edges).
   * Returns true if step was successfully removed.
   */
  removeLastStep() {
    if (this._currentStep <= 0) return false;

    const step = this._currentStep;
    const stepIds = this.stepStates[step];
    if (!stepIds) return false;

    // Remove edges that point to nodes at this step
    const stepIdSet = new Set(stepIds);
    this.edges = this.edges.filter(e => !stepIdSet.has(e.to));

    // Remove nodes at this step
    // We need to be careful: reset weights of any node at this step
    // and remove from stateMap
    const stepMap = this.stateMap.get(step);
    if (stepMap) {
      this.stateMap.delete(step);
    }

    // Remove from stepStates
    this.stepStates.length = step;

    // Remove nodes from end (they were added last)
    // We need to remove all nodes with step === current step
    // Since nodes are added in order, all step-N nodes are at the end
    this.nodes = this.nodes.filter(n => n.step !== step);

    // Re-index: since we only remove end nodes, IDs are still valid for earlier nodes
    // But we need to reassign IDs to be contiguous
    // Actually, the simpler approach: since nodes at later steps are appended,
    // and we only remove the last step, we can just truncate
    // Let's rebuild IDs properly
    const oldToNew = new Map();
    const newNodes = [];
    for (let i = 0; i < this.nodes.length; i++) {
      oldToNew.set(this.nodes[i].id, i);
      this.nodes[i].id = i;
      newNodes.push(this.nodes[i]);
    }
    this.nodes = newNodes;

    // Remap edges
    this.edges = this.edges.map(e => ({
      from: oldToNew.get(e.from),
      to: oldToNew.get(e.to)
    })).filter(e => e.from !== undefined && e.to !== undefined);

    // Rebuild stateMap references
    this.stateMap = new Map();
    this.stepStates = [];
    for (const node of this.nodes) {
      if (!this.stateMap.has(node.step)) {
        this.stateMap.set(node.step, new Map());
        this.stepStates[node.step] = [];
      }
      this.stateMap.get(node.step).set(node.state, node.id);
      this.stepStates[node.step].push(node.id);
    }

    this._currentStep = step - 1;

    // Remove causal events whose child node was at the removed step
    // Events are recorded with step = parent step, so ev.step === step-1
    // for the transition that created nodes at `step`. Filter by child node membership.
    this.causalEvents = this.causalEvents.filter(ev => !stepIdSet.has(ev.childNodeId));
    for (let i = 0; i < this.causalEvents.length; i++) {
      this.causalEvents[i].id = i;
      // Remap node references to match re-indexed node IDs
      const newParent = oldToNew.get(this.causalEvents[i].parentNodeId);
      const newChild = oldToNew.get(this.causalEvents[i].childNodeId);
      if (newParent !== undefined) this.causalEvents[i].parentNodeId = newParent;
      if (newChild !== undefined) this.causalEvents[i].childNodeId = newChild;
    }
    this._buildCausalEdges();

    // Recompute max weight after node removal
    this._maxWeight = 1;
    for (let _ri = 0; _ri < this.nodes.length; _ri++) {
      if (this.nodes[_ri].weight > this._maxWeight) this._maxWeight = this.nodes[_ri].weight;
    }

    this._buildBranchialGraph(this._currentStep);
    this._computeLayout();
    return true;
  }

  /**
   * Build/cache adjacency maps for fast BFS traversal.
   * Called lazily on first use, invalidated when graph changes.
   */
  _ensureAdjacencyMaps() {
    if (this._adjCacheVersion === this.edges.length) return;
    this._childToParents = new Map();
    this._parentToChildren = new Map();
    for (const e of this.edges) {
      if (!this._childToParents.has(e.to)) this._childToParents.set(e.to, []);
      this._childToParents.get(e.to).push(e.from);
      if (!this._parentToChildren.has(e.from)) this._parentToChildren.set(e.from, []);
      this._parentToChildren.get(e.from).push(e.to);
    }
    this._adjCacheVersion = this.edges.length;
  }

  /**
   * Trace ancestry backward from a node — returns set of all ancestor node IDs.
   */
  traceAncestry(nodeId) {
    this._ensureAdjacencyMaps();
    const ancestors = new Set();
    ancestors.add(nodeId);

    // BFS backward
    const queue = [nodeId];
    while (queue.length > 0) {
      const current = queue.shift();
      const parents = this._childToParents.get(current) || [];
      for (const p of parents) {
        if (!ancestors.has(p)) {
          ancestors.add(p);
          queue.push(p);
        }
      }
    }
    return ancestors;
  }

  /**
   * Trace descendants forward from a node — returns set of all descendant node IDs.
   */
  traceDescendants(nodeId) {
    this._ensureAdjacencyMaps();
    const descendants = new Set();
    descendants.add(nodeId);

    const queue = [nodeId];
    while (queue.length > 0) {
      const current = queue.shift();
      const children = this._parentToChildren.get(current) || [];
      for (const c of children) {
        if (!descendants.has(c)) {
          descendants.add(c);
          queue.push(c);
        }
      }
    }
    return descendants;
  }

  /**
   * Full causal history: ancestors + descendants from a node.
   */
  traceCausalHistory(nodeId) {
    const ancestors = this.traceAncestry(nodeId);
    const descendants = this.traceDescendants(nodeId);
    const full = new Set([...ancestors, ...descendants]);
    return { full, ancestors, descendants };
  }

  /**
   * Get edges within a node set (edges where both endpoints are in the set).
   */
  getAncestryEdges(nodeSet) {
    return this.edges.filter(e => nodeSet.has(e.from) && nodeSet.has(e.to));
  }

  /**
   * Build causal edges between events.
   * Event A causally precedes event B when:
   *   - A's output state (childNodeId) is B's input state (parentNodeId)
   *   - A's output character range overlaps B's input character range
   * This captures: "the characters A produced were consumed by B."
   */
  _buildCausalEdges() {
    this.causalEdges = [];
    if (this.causalEvents.length === 0) return;

    // Group events by their parent node (the state they read from)
    const eventsByParentNode = new Map();
    for (const ev of this.causalEvents) {
      if (!eventsByParentNode.has(ev.parentNodeId)) eventsByParentNode.set(ev.parentNodeId, []);
      eventsByParentNode.get(ev.parentNodeId).push(ev);
    }

    // For each event A, find events B where B reads from A's output node
    // and B's input range overlaps A's output range
    for (const evA of this.causalEvents) {
      const childNode = evA.childNodeId;
      const consumers = eventsByParentNode.get(childNode) || [];
      for (const evB of consumers) {
        // Check character range overlap
        const aOut = evA.outputRange;
        const bIn = evB.inputRange;
        if (aOut[0] <= bIn[1] && bIn[0] <= aOut[1]) {
          this.causalEdges.push({ from: evA.id, to: evB.id });
        }
      }
    }
  }

  /**
   * Trace causal ancestors/descendants in the EVENT graph (not state graph).
   */
  traceCausalEventCone(eventId) {
    // Build adjacency
    const childToParents = new Map();
    const parentToChildren = new Map();
    for (const e of this.causalEdges) {
      if (!childToParents.has(e.to)) childToParents.set(e.to, []);
      childToParents.get(e.to).push(e.from);
      if (!parentToChildren.has(e.from)) parentToChildren.set(e.from, []);
      parentToChildren.get(e.from).push(e.to);
    }

    // BFS backward (past light cone)
    const pastCone = new Set([eventId]);
    let queue = [eventId];
    while (queue.length > 0) {
      const cur = queue.shift();
      for (const p of (childToParents.get(cur) || [])) {
        if (!pastCone.has(p)) { pastCone.add(p); queue.push(p); }
      }
    }

    // BFS forward (future light cone)
    const futureCone = new Set([eventId]);
    queue = [eventId];
    while (queue.length > 0) {
      const cur = queue.shift();
      for (const c of (parentToChildren.get(cur) || [])) {
        if (!futureCone.has(c)) { futureCone.add(c); queue.push(c); }
      }
    }

    const fullCone = new Set([...pastCone, ...futureCone]);
    return { pastCone, futureCone, fullCone };
  }

  /**
   * Get the causal events that touch a given state node (as input or output).
   */
  getEventsForNode(nodeId) {
    return this.causalEvents.filter(ev => ev.parentNodeId === nodeId || ev.childNodeId === nodeId);
  }

  /**
   * Check causal invariance via critical pair convergence (Gorard-correct).
   * A critical pair is two events from the same parent with overlapping
   * input ranges. Causal invariance requires ALL critical pairs converge:
   * the divergent branches must reach the same state within bounded steps.
   */
  checkCausalInvariance() {
    this._ensureAdjacencyMaps();
    let confluent = 0, divergent = 0;

    // Find critical pairs: events from same parent with overlapping input
    const eventsByParent = new Map();
    for (const ev of this.causalEvents) {
      if (!eventsByParent.has(ev.parentNodeId)) eventsByParent.set(ev.parentNodeId, []);
      eventsByParent.get(ev.parentNodeId).push(ev);
    }

    const criticalPairs = [];
    for (const [parentId, evs] of eventsByParent) {
      if (evs.length <= 1) continue;
      for (let i = 0; i < evs.length; i++) {
        for (let j = i + 1; j < evs.length; j++) {
          const aIn = evs[i].inputRange;
          const bIn = evs[j].inputRange;
          if (aIn[0] <= bIn[1] && bIn[0] <= aIn[1]) {
            criticalPairs.push({
              childA: evs[i].childNodeId,
              childB: evs[j].childNodeId
            });
          } else {
            confluent++; // Non-overlapping inputs always commute
          }
        }
      }
    }

    // For each critical pair, check convergence via lookahead
    const maxLookahead = 3;
    for (const cp of criticalPairs) {
      if (cp.childA === cp.childB) { confluent++; continue; }
      const sA = this.nodes[cp.childA]?.state;
      const sB = this.nodes[cp.childB]?.state;
      if (sA && sB && sA === sB) { confluent++; continue; }

      let converged = false;
      let frontierA = new Set([cp.childA]);
      let frontierB = new Set([cp.childB]);
      let reachedA = new Set([cp.childA]);
      let reachedB = new Set([cp.childB]);

      for (let d = 0; d < maxLookahead && !converged; d++) {
        const nextA = new Set(), nextB = new Set();
        for (const n of frontierA) {
          for (const c of (this._parentToChildren.get(n) || [])) {
            if (!reachedA.has(c)) { reachedA.add(c); nextA.add(c); }
          }
        }
        for (const n of frontierB) {
          for (const c of (this._parentToChildren.get(n) || [])) {
            if (!reachedB.has(c)) { reachedB.add(c); nextB.add(c); }
          }
        }
        // Check node-level intersection
        for (const n of reachedA) {
          if (reachedB.has(n)) { converged = true; break; }
        }
        if (!converged) {
          // Check state-level convergence
          const statesA = new Set();
          for (const n of reachedA) { const s = this.nodes[n]?.state; if (s) statesA.add(s); }
          for (const n of reachedB) {
            const s = this.nodes[n]?.state;
            if (s && statesA.has(s)) { converged = true; break; }
          }
        }
        frontierA = nextA;
        frontierB = nextB;
        if (frontierA.size === 0 && frontierB.size === 0) break;
      }

      if (converged) confluent++; else divergent++;
    }

    return {
      confluent, divergent, criticalPairs: criticalPairs.length,
      total: confluent + divergent,
      invariance: (confluent + divergent) > 0 ? confluent / (confluent + divergent) : 1.0
    };
  }

  _buildBranchialGraph(maxSteps) {
    this.branchialEdges = [];
    const finalStep = maxSteps;
    const finalMap = this.stateMap.get(finalStep);
    if (!finalMap) return;

    const parentMap = new Map();
    for (const edge of this.edges) {
      const child = this.nodes[edge.to];
      if (child && child.step === finalStep) {
        if (!parentMap.has(edge.to)) parentMap.set(edge.to, new Set());
        parentMap.get(edge.to).add(edge.from);
      }
    }

    const finalIds = this.stepStates[finalStep] || [];
    for (let i = 0; i < finalIds.length; i++) {
      for (let j = i + 1; j < finalIds.length; j++) {
        const pi = parentMap.get(finalIds[i]);
        const pj = parentMap.get(finalIds[j]);
        if (pi && pj) {
          for (const p of pi) {
            if (pj.has(p)) {
              this.branchialEdges.push({ from: finalIds[i], to: finalIds[j] });
              break;
            }
          }
        }
      }
    }
  }


  // Build branchial graph for a specific step (not just the final step)
  buildBranchialForStep(targetStep) {
    const stepIds = this.stepStates[targetStep];
    if (!stepIds || stepIds.length === 0) return { nodes: [], edges: [], step: targetStep };

    // Build parent map: for each node at targetStep, find its parents (at step-1)
    const parentMap = new Map();
    for (const edge of this.edges) {
      const child = this.nodes[edge.to];
      if (child && child.step === targetStep) {
        if (!parentMap.has(edge.to)) parentMap.set(edge.to, new Set());
        parentMap.get(edge.to).add(edge.from);
      }
    }

    // Build branchial edges: connect states at targetStep that share a parent
    const edges = [];
    for (let i = 0; i < stepIds.length; i++) {
      for (let j = i + 1; j < stepIds.length; j++) {
        const pi = parentMap.get(stepIds[i]);
        const pj = parentMap.get(stepIds[j]);
        if (pi && pj) {
          for (const p of pi) {
            if (pj.has(p)) {
              edges.push({ from: stepIds[i], to: stepIds[j] });
              break;
            }
          }
        }
      }
    }

    // Return node data with weights
    const maxWeight = Math.max(1, ...stepIds.map(id => this.nodes[id].weight));
    const nodes = stepIds.map(id => ({
      id,
      state: this.nodes[id].state,
      weight: this.nodes[id].weight,
      normWeight: this.nodes[id].weight / maxWeight
    }));

    return { nodes, edges, step: targetStep };
  }

  // Build branchial graphs for ALL steps (cached)
  buildAllBranchialGraphs() {
    if (this._cachedBranchialSteps) return this._cachedBranchialSteps;
    const result = [];
    const totalSteps = this.getTotalSteps();
    for (let s = 0; s <= totalSteps; s++) {
      result.push(this.buildBranchialForStep(s));
    }
    this._cachedBranchialSteps = result;
    return result;
  }

  // Compute branchial distance distribution using BFS
  computeBranchialDistances(targetStep) {
    const data = this.buildBranchialForStep(targetStep);
    if (data.nodes.length < 2) return { histogram: [], maxDist: 0, meanDist: 0, diameter: 0 };

    // Build adjacency list
    const adj = new Map();
    for (const n of data.nodes) adj.set(n.id, []);
    for (const e of data.edges) {
      adj.get(e.from)?.push(e.to);
      adj.get(e.to)?.push(e.from);
    }

    // BFS from each node to get all pairwise distances
    const distances = [];
    const nodeIds = data.nodes.map(n => n.id);
    for (let i = 0; i < nodeIds.length; i++) {
      const dist = new Map();
      dist.set(nodeIds[i], 0);
      const queue = [nodeIds[i]];
      let qi = 0;
      while (qi < queue.length) {
        const curr = queue[qi++];
        const d = dist.get(curr);
        for (const neighbor of (adj.get(curr) || [])) {
          if (!dist.has(neighbor)) {
            dist.set(neighbor, d + 1);
            queue.push(neighbor);
          }
        }
      }
      // Only count pairs (i,j) where j > i to avoid duplicates
      for (let j = i + 1; j < nodeIds.length; j++) {
        const d = dist.get(nodeIds[j]);
        if (d !== undefined) distances.push(d);
      }
    }

    if (distances.length === 0) return { histogram: [], maxDist: 0, meanDist: 0, diameter: 0 };

    const maxDist = Math.max(...distances);
    const histogram = new Array(maxDist + 1).fill(0);
    for (const d of distances) histogram[d]++;
    const meanDist = distances.reduce((a, b) => a + b, 0) / distances.length;

    return { histogram, maxDist, meanDist, diameter: maxDist, totalPairs: distances.length };
  }


    _computeLayout() {
    for (let step = 0; step <= this.stepStates.length; step++) {
      const ids = this.stepStates[step];
      if (!ids) continue;

      ids.sort((a, b) => this.nodes[a].state.localeCompare(this.nodes[b].state));

      const count = ids.length;
      for (let i = 0; i < count; i++) {
        const node = this.nodes[ids[i]];
        node.x = count === 1 ? 0 : (i / (count - 1) - 0.5);
        node.y = -step;
      }
    }
  }

  getIntensityPattern(filterNodeIds) {
    let finalStep = 0;
    for (let s = this.stepStates.length - 1; s >= 0; s--) {
      if (this.stepStates[s] && this.stepStates[s].length > 0) {
        finalStep = s;
        break;
      }
    }

    const finalIds = this.stepStates[finalStep] || [];
    if (finalIds.length === 0) return { positions: [], weights: [], normalized: [] };

    // If filterNodeIds is provided, only include those final states
    const filterSet = filterNodeIds ? new Set(filterNodeIds) : null;

    const statesAndWeights = finalIds.map(id => ({
      state: this.nodes[id].state,
      weight: (filterSet && !filterSet.has(id)) ? 0 : this.nodes[id].weight
    }));
    statesAndWeights.sort((a, b) => a.state.localeCompare(b.state));

    const rawWeights = statesAndWeights.map(sw => sw.weight);

    const halfIdx = Math.ceil(rawWeights.length / 2);
    const rightHalf = rawWeights.slice(halfIdx);
    const leftHalf = [...rightHalf].reverse();

    const fullPattern = [...leftHalf, ...rightHalf];

    const maxW = Math.max(...fullPattern, 1);
    const normalized = fullPattern.map(w => w / maxW);

    const positions = fullPattern.map((_, i) =>
      fullPattern.length === 1 ? 0 : (i / (fullPattern.length - 1)) * 2 - 1
    );

    return { positions, weights: fullPattern, normalized, totalStates: finalIds.length, finalStep };
  }

  analyzeCompletion() {
    const pattern = this.getIntensityPattern();
    const log = [];

    let totalWeight = 0;
    let finalStep = 0;
    for (let s = this.stepStates.length - 1; s >= 0; s--) {
      if (this.stepStates[s] && this.stepStates[s].length > 0) {
        finalStep = s;
        break;
      }
    }
    const finalIds = this.stepStates[finalStep] || [];

    for (const id of finalIds) totalWeight += this.nodes[id].weight;

    log.push({ type: 'neutral', text: `Step ${finalStep}: ${finalIds.length} distinct states, ${totalWeight} total paths` });
    log.push({ type: 'neutral', text: `─────────────────────────` });

    if (pattern.normalized.length > 2) {
      const n = pattern.normalized;
      let maxima = [], minima = [];

      for (let i = 1; i < n.length - 1; i++) {
        if (n[i] > n[i-1] && n[i] > n[i+1] && n[i] > 0.1) {
          maxima.push({ idx: i, val: n[i], pos: pattern.positions[i] });
        }
        if (n[i] < n[i-1] && n[i] < n[i+1] && n[i] < 0.3) {
          minima.push({ idx: i, val: n[i], pos: pattern.positions[i] });
        }
      }

      const centerIdx = Math.floor(n.length / 2);
      log.push({ type: 'constructive',
        text: `CONSTRUCTIVE: Central maximum at x≈${pattern.positions[centerIdx]?.toFixed(2) || '0.00'}` });
      log.push({ type: 'constructive',
        text: `  → Branches close in branchial space — observer can merge them` });
      log.push({ type: 'constructive',
        text: `  → Weights ADD: small branchial distance allows coherent merging` });

      for (const m of maxima.slice(0, 3)) {
        if (Math.abs(m.pos) > 0.05) {
          log.push({ type: 'constructive',
            text: `CONSTRUCTIVE: Fringe maximum at x≈${m.pos.toFixed(2)} (intensity ${(m.val * 100).toFixed(0)}%)` });
        }
      }

      log.push({ type: 'neutral', text: `─────────────────────────` });

      for (const m of minima.slice(0, 3)) {
        log.push({ type: 'destructive',
          text: `DESTRUCTIVE: Minimum at x≈${m.pos.toFixed(2)} (intensity ${(m.val * 100).toFixed(0)}%)` });
        log.push({ type: 'destructive',
          text: `  → Branches far apart in branchial space (large branchial distance)` });
        log.push({ type: 'destructive',
          text: `  → Observer's coarse-graining cannot identify these branches — they decohere` });
      }

      if (minima.length === 0 && pattern.normalized.length < 10) {
        log.push({ type: 'neutral',
          text: `No clear minima yet — increase evolution steps for finer resolution` });
      }
    }

    log.push({ type: 'neutral', text: `─────────────────────────` });
    log.push({ type: 'neutral',
      text: `Branchial dimension: ${this._estimateBranchialDim()}D` });
    log.push({ type: 'neutral',
      text: `(ball-growth estimate on branchial graph)` });

    return log;
  }

  /**
   * Estimate branchial dimension via BFS ball-growth on the
   * branchial graph. V(r) ~ r^d gives the effective dimension.
   * This is the correct graph-theoretic estimate, not the X-count.
   */
  _estimateBranchialDim() {
    if (this.branchialEdges.length < 3) {
      const root = this.nodes[0];
      if (!root) return 1;
      return Math.max(1, (root.state.match(/X/g) || []).length);
    }
    const adj = new Map();
    for (const e of this.branchialEdges) {
      if (!adj.has(e.from)) adj.set(e.from, []);
      if (!adj.has(e.to)) adj.set(e.to, []);
      adj.get(e.from).push(e.to);
      adj.get(e.to).push(e.from);
    }
    const nodes = [...new Set([...adj.keys()])];
    const n = nodes.length;
    if (n < 4) return 1;
    const sampleSize = Math.min(n, 20);
    const sampleNodes = n <= sampleSize ? nodes :
      nodes.sort(() => Math.random() - 0.5).slice(0, sampleSize);
    const maxR = Math.min(10, Math.floor(Math.sqrt(n)));
    const volumeProfiles = [];
    for (const start of sampleNodes) {
      const visited = new Set([start]);
      let frontier = new Set([start]);
      const volumes = [1];
      for (let r = 1; r <= maxR; r++) {
        const next = new Set();
        for (const node of frontier) {
          for (const nb of (adj.get(node) || [])) {
            if (!visited.has(nb)) { visited.add(nb); next.add(nb); }
          }
        }
        volumes.push(visited.size);
        frontier = next;
        if (frontier.size === 0) break;
      }
      volumeProfiles.push(volumes);
    }
    const maxLen = Math.max(...volumeProfiles.map(v => v.length));
    const avgVol = [];
    for (let r = 0; r < maxLen; r++) {
      let sum = 0, count = 0;
      for (const p of volumeProfiles) {
        if (r < p.length) { sum += p[r]; count++; }
      }
      avgVol.push(count > 0 ? sum / count : 0);
    }
    const dimEsts = [];
    for (let r = 2; r < avgVol.length - 1; r++) {
      if (avgVol[r] > avgVol[r-1] && avgVol[r-1] > 0) {
        const d = (Math.log(avgVol[r]) - Math.log(avgVol[r-1])) /
                  (Math.log(r) - Math.log(r-1));
        if (isFinite(d) && d > 0) dimEsts.push(d);
      }
    }
    if (dimEsts.length === 0) return 1;
    const start = Math.floor(dimEsts.length * 0.2);
    const end = Math.ceil(dimEsts.length * 0.8);
    const mid = dimEsts.slice(start, end);
    const arr = mid.length > 0 ? mid : dimEsts;
    return Math.round(arr.reduce((s, d) => s + d, 0) / arr.length * 10) / 10;
  }

  // ─── COARSE-GRAINING ENGINE (Gorard's observer model) ───
  // The observer coarse-grains the multiway graph by comparing the CAUSAL
  // STRUCTURE descended from each branch — not the syntactic state strings.
  // Two branches are equivalent when their causal futures are isomorphic
  // up to the observer's resolution. This generates completion rules
  // (bidirectional equivalences) formally equivalent to Knuth-Bendix
  // completion and wavefunction collapse.

  /**
   * Compute a causal signature for a node: a canonical hash of its
   * descendant causal subgraph structure (branching pattern, depth, fan-out).
   * Two nodes with identical causal signatures have isomorphic causal futures.
   */
  _causalSignature(nodeId, maxDepth = 4) {
    this._ensureAdjacencyMaps();
    const children = this._parentToChildren;
    const sig = [];
    let frontier = [nodeId];
    for (let d = 0; d < maxDepth && frontier.length > 0; d++) {
      const levelFanouts = [];
      const nextFrontier = [];
      for (const nid of frontier) {
        const ch = children.get(nid) || [];
        levelFanouts.push(ch.length);
        for (const c of ch) nextFrontier.push(c);
      }
      levelFanouts.sort((a, b) => a - b);
      sig.push(levelFanouts.join(','));
      frontier = nextFrontier;
    }
    return sig.join('|');
  }

  /**
   * Compute causal subgraph distance between two nodes.
   * Compares the structure of their descendant causal graphs:
   * fan-out distribution at each depth, convergence pattern.
   * Returns a normalized distance. 0 = isomorphic causal futures.
   */
  _causalSubgraphDistance(idA, idB, maxDepth = 4) {
    this._ensureAdjacencyMaps();
    const children = this._parentToChildren;
    let frontierA = [idA], frontierB = [idB];
    let totalDist = 0;
    for (let d = 0; d < maxDepth; d++) {
      const fanA = [], fanB = [];
      const nextA = [], nextB = [];
      for (const n of frontierA) {
        const ch = children.get(n) || [];
        fanA.push(ch.length);
        for (const c of ch) nextA.push(c);
      }
      for (const n of frontierB) {
        const ch = children.get(n) || [];
        fanB.push(ch.length);
        for (const c of ch) nextB.push(c);
      }
      fanA.sort((a, b) => a - b);
      fanB.sort((a, b) => a - b);
      const maxLen = Math.max(fanA.length, fanB.length);
      while (fanA.length < maxLen) fanA.push(0);
      while (fanB.length < maxLen) fanB.push(0);
      let levelDist = 0;
      for (let i = 0; i < maxLen; i++) levelDist += Math.abs(fanA[i] - fanB[i]);
      const maxFan = Math.max(...fanA, ...fanB, 1);
      totalDist += (maxLen > 0) ? levelDist / (maxLen * maxFan) : 0;
      // Jaccard convergence bonus: reduce distance when causal futures overlap
      // (shared descendants = converging evolution = more similar causal structure)
      const setA = new Set(nextA), setB = new Set(nextB);
      let overlap = 0;
      for (const n of setA) { if (setB.has(n)) overlap++; }
      const unionSize = new Set([...nextA, ...nextB]).size;
      if (unionSize > 0) {
        // Jaccard similarity as convergence measure (theoretically grounded)
        const jaccard = overlap / unionSize;
        totalDist *= (1 - jaccard); // multiplicative reduction: full overlap → zero distance
      }
      frontierA = nextA;
      frontierB = nextB;
      if (frontierA.length === 0 && frontierB.length === 0) break;
    }
    return Math.max(0, totalDist);
  }

  /** Legacy string distance (fallback for very large graphs). */
  _stateDistance(a, b) {
    if (a === b) return 0;
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 0;
    let diff = Math.abs(a.length - b.length);
    const minLen = Math.min(a.length, b.length);
    for (let i = 0; i < minLen; i++) {
      if (a[i] !== b[i]) diff++;
    }
    return diff;
  }

  /**
   * Apply coarse-graining at a given threshold.
   * Uses CAUSAL SUBGRAPH DISTANCE (Gorard-correct): two branches
   * are equivalent when their descendant causal structures are
   * isomorphic up to the observer's resolution threshold.
   */
  coarseGrain(threshold = 0) {
    if (threshold === 0) {
      // No coarse-graining: full quantum superposition
      return {
        equivalenceClasses: new Map(),
        completionRules: [],
        mergedNodeMap: new Map(), // nodeId -> canonicalId (identity)
        stats: { totalNodes: this.nodes.length, mergedNodes: 0, completionRulesCount: 0, branchesCollapsed: 0 },
        causalInvarianceBefore: this.checkCausalInvariance().invariance,
        causalInvarianceAfter: this.checkCausalInvariance().invariance
      };
    }

    const equivalenceClasses = new Map(); // canonicalId -> Set<nodeId>
    const mergedNodeMap = new Map(); // nodeId -> canonicalId
    const completionRules = [];
    let branchesCollapsed = 0;

    // For each step, find states that are "close enough" to merge
    for (let step = 0; step < this.stepStates.length; step++) {
      const stepIds = this.stepStates[step] || [];
      if (stepIds.length <= 1) {
        // Only one state at this step — it's its own equivalence class
        for (const id of stepIds) mergedNodeMap.set(id, id);
        continue;
      }

      // Build pairs using causal subgraph distance
      // Logarithmic mapping: observer resolution scales sub-linearly
      const causalThreshold = Math.log2(1 + threshold) * 0.5; // slider 1-8 → 0.5-1.58
      const pairs = [];
      const useCausal = stepIds.length < 200; // Performance guard
      const sigCache = new Map();
      const getSig = (id) => {
        if (!sigCache.has(id)) sigCache.set(id, this._causalSignature(id));
        return sigCache.get(id);
      };
      for (let i = 0; i < stepIds.length; i++) {
        for (let j = i + 1; j < stepIds.length; j++) {
          let dist;
          if (useCausal) {
            const sigA = getSig(stepIds[i]);
            const sigB = getSig(stepIds[j]);
            dist = (sigA === sigB) ? 0 : this._causalSubgraphDistance(stepIds[i], stepIds[j]);
          } else {
            const ni = this.nodes[stepIds[i]];
            const nj = this.nodes[stepIds[j]];
            dist = this._stateDistance(ni.state, nj.state);
          }
          pairs.push({ i: stepIds[i], j: stepIds[j], dist, isCausal: useCausal });
        }
      }

      // Union-Find for merging
      const parent = new Map();
      for (const id of stepIds) parent.set(id, id);
      function find(x) {
        while (parent.get(x) !== x) {
          parent.set(x, parent.get(parent.get(x)));
          x = parent.get(x);
        }
        return x;
      }
      function union(a, b) {
        const ra = find(a), rb = find(b);
        if (ra !== rb) {
          // Keep the one with higher weight as canonical
          parent.set(rb, ra);
          return true;
        }
        return false;
      }

      // Merge states within threshold
      pairs.sort((a, b) => a.dist - b.dist);
      const effectiveThreshold = useCausal ? causalThreshold : threshold;
      for (const p of pairs) {
        if (p.dist <= effectiveThreshold) {
          if (union(p.i, p.j)) {
            branchesCollapsed++;
            completionRules.push({
              from: this.nodes[p.i].state,
              to: this.nodes[p.j].state,
              nodeIds: [p.i, p.j],
              step: step,
              distance: p.dist,
              isCausal: p.isCausal
            });
          }
        }
      }

      // Record canonical mappings
      for (const id of stepIds) {
        const canonical = find(id);
        mergedNodeMap.set(id, canonical);
        if (!equivalenceClasses.has(canonical)) equivalenceClasses.set(canonical, new Set());
        equivalenceClasses.get(canonical).add(id);
      }
    }

    // Compute how many distinct equivalence classes remain vs original
    const mergedNodes = this.nodes.length - equivalenceClasses.size -
      (this.nodes.length - [...mergedNodeMap.values()].length);

    // Estimate causal invariance after coarse-graining
    // Each completion rule resolves at most one critical pair divergence
    const ciBefore = this.checkCausalInvariance();
    const resolvedPairs = Math.min(branchesCollapsed, ciBefore.divergent);
    const adjustedConfluent = ciBefore.confluent + resolvedPairs;
    const adjustedDivergent = Math.max(0, ciBefore.divergent - resolvedPairs);
    const adjustedTotal = adjustedConfluent + adjustedDivergent;
    const ciAfter = adjustedTotal > 0 ? adjustedConfluent / adjustedTotal : 1.0;

    return {
      equivalenceClasses,
      completionRules,
      mergedNodeMap,
      stats: {
        totalNodes: this.nodes.length,
        mergedNodes: branchesCollapsed,
        completionRulesCount: completionRules.length,
        branchesCollapsed
      },
      causalInvarianceBefore: ciBefore.invariance,
      causalInvarianceAfter: Math.min(ciAfter, 1.0)
    };
  }

  getTotalSteps() {
    return this.stepStates.length - 1;
  }

  // ─── FUBINI-STUDY METRIC ───
  // The proper metric on branchial space: computed from FUTURE causal cone overlap.
  // Two states are branchially close when their future causal cones overlap significantly.
  // Inner product = |C_future(a) ∩ C_future(b)| / sqrt(|C_future(a)| * |C_future(b)|)

  _futureCausalCone(nodeId) {
    // BFS forward through children to find all future-reachable nodes
    this._ensureAdjacencyMaps();
    const children = this._parentToChildren;
    const cone = new Set([nodeId]);
    const q = [nodeId];
    let qi = 0;
    while (qi < q.length) {
      const cur = q[qi++];
      const ch = children.get(cur) || [];
      for (const c of ch) {
        if (!cone.has(c)) {
          cone.add(c);
          q.push(c);
        }
      }
    }
    return cone;
  }

  fubiniStudyDistance(idA, idB) {
    const coneA = this._futureCausalCone(idA);
    const coneB = this._futureCausalCone(idB);
    let overlap = 0;
    for (const n of coneA) { if (coneB.has(n)) overlap++; }
    const norm = Math.sqrt(coneA.size * coneB.size);
    const ip = norm > 0 ? overlap / norm : 0;
    return Math.acos(Math.min(1, Math.max(0, ip)));
  }

  // ─── BRANCHIAL GEODESICS ───
  // Shortest path through branchial space between two nodes.

  branchialGeodesic(startId, endId) {
    if (startId === endId) return { path: [startId], totalDistance: 0, steps: 0 };
    const adj = new Map();
    for (const e of this.branchialEdges) {
      if (!adj.has(e.from)) adj.set(e.from, []);
      if (!adj.has(e.to)) adj.set(e.to, []);
      adj.get(e.from).push(e.to);
      adj.get(e.to).push(e.from);
    }
    const prev = new Map();
    const visited = new Set([startId]);
    const queue = [startId];
    let found = false;
    while (queue.length > 0 && !found) {
      const cur = queue.shift();
      for (const nb of (adj.get(cur) || [])) {
        if (!visited.has(nb)) {
          visited.add(nb); prev.set(nb, cur);
          if (nb === endId) { found = true; break; }
          queue.push(nb);
        }
      }
    }
    if (!found) return { path: [], totalDistance: Infinity, steps: -1 };
    const path = [endId];
    let cur = endId;
    while (prev.has(cur)) { cur = prev.get(cur); path.unshift(cur); }
    let totalDist = 0;
    for (let i = 1; i < path.length; i++) totalDist += this.fubiniStudyDistance(path[i-1], path[i]);
    return { path, totalDistance: totalDist, steps: path.length - 1 };
  }

  // ─── EMBEDDED OBSERVER DETECTION ───
  // Find the largest subgraph that maintains causal invariance internally.

  findEmbeddedObserver(seedNodeId) {
    this._ensureAdjacencyMaps();
    const observerNodes = new Set([seedNodeId]);
    const candidates = new Set();
    for (const p of (this._childToParents.get(seedNodeId) || [])) candidates.add(p);
    for (const c of (this._parentToChildren.get(seedNodeId) || [])) candidates.add(c);
    const maxSize = Math.min(this.nodes.length, 200);
    while (candidates.size > 0 && observerNodes.size < maxSize) {
      let bestCandidate = null, bestCI = -1;
      for (const cand of candidates) {
        const testSet = new Set(observerNodes); testSet.add(cand);
        const ci = this._subgraphConfluence(testSet);
        if (ci > bestCI) { bestCI = ci; bestCandidate = cand; }
      }
      if (bestCandidate !== null && bestCI >= 0.5) {
        observerNodes.add(bestCandidate);
        candidates.delete(bestCandidate);
        for (const p of (this._childToParents.get(bestCandidate) || [])) {
          if (!observerNodes.has(p)) candidates.add(p);
        }
        for (const c of (this._parentToChildren.get(bestCandidate) || [])) {
          if (!observerNodes.has(c)) candidates.add(c);
        }
      } else break;
    }
    const finalCI = this._subgraphConfluence(observerNodes);
    return {
      nodes: observerNodes,
      causalInvariance: finalCI,
      size: observerNodes.size,
      fraction: this.nodes.length > 0 ? observerNodes.size / this.nodes.length : 0
    };
  }

  _subgraphConfluence(nodeSet) {
    let confluent = 0, divergent = 0;
    const subEvents = this.causalEvents.filter(
      ev => nodeSet.has(ev.parentNodeId) && nodeSet.has(ev.childNodeId)
    );
    const byParent = new Map();
    for (const ev of subEvents) {
      if (!byParent.has(ev.parentNodeId)) byParent.set(ev.parentNodeId, []);
      byParent.get(ev.parentNodeId).push(ev);
    }
    for (const [pid, evs] of byParent) {
      if (evs.length <= 1) continue;
      for (let i = 0; i < evs.length; i++) {
        for (let j = i + 1; j < evs.length; j++) {
          const aIn = evs[i].inputRange, bIn = evs[j].inputRange;
          if (aIn[0] <= bIn[1] && bIn[0] <= aIn[1]) {
            const cA = evs[i].childNodeId, cB = evs[j].childNodeId;
            if (cA === cB || this.nodes[cA]?.state === this.nodes[cB]?.state) {
              confluent++;
            } else {
              const chA = (this._parentToChildren.get(cA) || []).filter(n => nodeSet.has(n));
              const chB = (this._parentToChildren.get(cB) || []).filter(n => nodeSet.has(n));
              let found = false;
              for (const a of chA) {
                for (const b of chB) {
                  if (a === b || this.nodes[a]?.state === this.nodes[b]?.state) { found = true; break; }
                }
                if (found) break;
              }
              if (found) confluent++; else divergent++;
            }
          } else confluent++;
        }
      }
    }
    return (confluent + divergent) > 0 ? confluent / (confluent + divergent) : 1.0;
  }

  /**
   * Deep observer analysis — physics-grounded breakdown of a selected branch.
   */
  analyzeObserver(nodeId) {
    const node = this.nodes[nodeId];
    if (!node) return null;

    const ancestors = this.traceAncestry(nodeId);
    const descendants = this.traceDescendants(nodeId);
    const fullHistory = new Set([...ancestors, ...descendants]);
    const totalNodes = this.nodes.length;
    const totalEdges = this.edges.length;
    const ancestorEdges = this.getAncestryEdges(ancestors);
    const descendantEdges = this.getAncestryEdges(descendants);
    const fullHistoryEdges = this.getAncestryEdges(fullHistory);

    // Find which step the observer is on
    const observerStep = node.step;

    // Get final step info
    let finalStep = 0;
    for (let s = this.stepStates.length - 1; s >= 0; s--) {
      if (this.stepStates[s] && this.stepStates[s].length > 0) { finalStep = s; break; }
    }
    const finalIds = this.stepStates[finalStep] || [];
    const finalAncestors = finalIds.filter(id => ancestors.has(id));

    // Total weights
    let totalWeight = 0;
    for (const id of finalIds) totalWeight += this.nodes[id].weight;
    const observerWeight = node.weight;

    // Causal cone density: how many nodes per step on the observer's path
    const stepsWithAncestors = [];
    for (let s = 0; s <= finalStep; s++) {
      const stepIds = this.stepStates[s] || [];
      const inPast = stepIds.filter(id => ancestors.has(id)).length;
      const inFuture = stepIds.filter(id => descendants.has(id)).length;
      const inBoth = stepIds.filter(id => ancestors.has(id) && descendants.has(id)).length;
      const inCone = stepIds.filter(id => fullHistory.has(id)).length;
      stepsWithAncestors.push({ step: s, inCone, inPast, inFuture, total: stepIds.length, isObserverStep: s === observerStep });
    }

    // Branching ratio: average branching factor within causal cone
    const childToParents = new Map();
    const parentToChildren = new Map();
    for (const e of this.edges) {
      if (!childToParents.has(e.to)) childToParents.set(e.to, []);
      childToParents.get(e.to).push(e.from);
      if (!parentToChildren.has(e.from)) parentToChildren.set(e.from, []);
      parentToChildren.get(e.from).push(e.to);
    }

    let branchingSum = 0, branchingCount = 0;
    for (const id of ancestors) {
      const children = (parentToChildren.get(id) || []).filter(c => ancestors.has(c));
      if (children.length > 0) {
        branchingSum += children.length;
        branchingCount++;
      }
    }
    const avgBranching = branchingCount > 0 ? (branchingSum / branchingCount) : 1;

    // Convergence: how many parents does the observer node have?
    const directParents = (childToParents.get(nodeId) || []);
    const directChildren = (parentToChildren.get(nodeId) || []);

    // Decoherence analysis: on the branchial graph, find distances
    // Build adjacency list for branchial graph
    const branchialAdj = new Map();
    for (const be of this.branchialEdges) {
      if (!branchialAdj.has(be.from)) branchialAdj.set(be.from, []);
      if (!branchialAdj.has(be.to)) branchialAdj.set(be.to, []);
      branchialAdj.get(be.from).push(be.to);
      branchialAdj.get(be.to).push(be.from);
    }

    // BFS from observer on branchial graph to find distances
    const branchialDist = new Map();
    if (node.step === finalStep) {
      branchialDist.set(nodeId, 0);
      const bfsQ = [nodeId];
      while (bfsQ.length > 0) {
        const cur = bfsQ.shift();
        const curDist = branchialDist.get(cur);
        for (const nb of (branchialAdj.get(cur) || [])) {
          if (!branchialDist.has(nb)) {
            branchialDist.set(nb, curDist + 1);
            bfsQ.push(nb);
          }
        }
      }
    }

    // Categorize by decoherence distance
    let coherent = 0, nearCoherent = 0, decoherent = 0;
    let maxBranchialDist = 0;
    for (const [id, d] of branchialDist) {
      if (id === nodeId) continue;
      if (d <= 1) coherent++;
      else if (d <= 3) nearCoherent++;
      else decoherent++;
      if (d > maxBranchialDist) maxBranchialDist = d;
    }

    // Observer's intensity contribution
    const observerPattern = this.getIntensityPattern(finalAncestors.length > 0 ? finalAncestors : [nodeId]);
    const globalPattern = this.getIntensityPattern();

    // Find the observer's peak position in the intensity pattern
    let peakIdx = 0, peakVal = 0;
    for (let i = 0; i < observerPattern.normalized.length; i++) {
      if (observerPattern.normalized[i] > peakVal) {
        peakVal = observerPattern.normalized[i];
        peakIdx = i;
      }
    }
    const peakPos = observerPattern.positions[peakIdx] || 0;

    // Compute how much of global intensity this observer accounts for
    let globalTotal = 0, observerTotal = 0;
    for (const w of globalPattern.weights) globalTotal += w;
    for (const w of observerPattern.weights) observerTotal += w;
    const intensityFraction = globalTotal > 0 ? observerTotal / globalTotal : 0;

    // Which slit is this branch associated with?
    const xCount = (node.state.match(/X/g) || []).length;
    const positions = [];
    for (let i = 0; i < node.state.length; i++) {
      if (node.state[i] === 'X') positions.push(i);
    }
    const stateLen = node.state.length;
    const centerPos = stateLen / 2;
    const slitBias = positions.length > 0
      ? positions.reduce((sum, p) => sum + (p - centerPos), 0) / positions.length
      : 0;

    return {
      nodeId,
      state: node.state,
      step: observerStep,
      weight: observerWeight,
      totalWeight,
      weightFraction: totalWeight > 0 ? observerWeight / totalWeight : 0,
      ancestors: ancestors.size,
      descendants: descendants.size,
      fullHistory: fullHistory.size,
      totalNodes,
      ancestorEdges: ancestorEdges.length,
      descendantEdges: descendantEdges.length,
      fullHistoryEdges: fullHistoryEdges.length,
      totalEdges,
      coneFraction: totalNodes > 0 ? fullHistory.size / totalNodes : 0,
      pastConeFraction: totalNodes > 0 ? ancestors.size / totalNodes : 0,
      futureConeFraction: totalNodes > 0 ? descendants.size / totalNodes : 0,
      stepsWithAncestors,
      avgBranching,
      directParents: directParents.length,
      directChildren: directChildren.length,
      finalStep,
      finalStates: finalIds.length,
      finalAncestors: finalAncestors.length,
      coherent,
      nearCoherent,
      decoherent,
      maxBranchialDist,
      intensityFraction,
      peakPos,
      slitBias,
      xCount,
      branchialDim: this._estimateBranchialDim(),
    };
  }
}


// ─── Worker message handler ───
self.onmessage = function(e) {
  const { rules, initialState, steps, maxStates } = e.data;

  try {
    const sys = new MultiwaySystem(rules);
    sys.maxTotalStates = maxStates;
    sys.evolve(initialState, steps);

    // Serialize result: plain objects only (no Maps)
    // Reconstruct stateMap and adjacency in main thread from nodes
    const result = {
      nodes: sys.nodes,
      edges: sys.edges,
      stepStates: sys.stepStates,
      branchialEdges: sys.branchialEdges,
      causalEvents: sys.causalEvents,
      causalEdges: sys.causalEdges,
      truncated: sys.truncated,
      _currentStep: sys._currentStep,
      _initialState: sys._initialState,
      _maxWeight: sys._maxWeight,
    };

    self.postMessage({ type: 'result', result });
  } catch (err) {
    self.postMessage({ type: 'error', message: err.message || String(err) });
  }
};
