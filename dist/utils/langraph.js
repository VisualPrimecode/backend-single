"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphExecutor = exports.GraphBuilder = void 0;
class GraphBuilder {
    constructor() {
        this.inputsSet = new Set();
        this.fnNodes = [];
        this.toolNodes = [];
    }
    input(name) {
        this.inputsSet.add(name);
        return this;
    }
    node(id, fn, inputs) {
        this.fnNodes.push({ id, fn, inputs });
        return this;
    }
    tool(id, tool, inputs, opts) {
        this.toolNodes.push({ id, tool, inputs, extraInputs: opts?.extraInputs });
        return this;
    }
    output(name) {
        this.outputKey = name;
        return this;
    }
    build() {
        if (!this.outputKey)
            throw new Error("No output defined");
        return {
            inputs: Array.from(this.inputsSet),
            fnNodes: this.fnNodes,
            toolNodes: this.toolNodes,
            outputKey: this.outputKey,
        };
    }
}
exports.GraphBuilder = GraphBuilder;
class GraphExecutor {
    constructor(graph) {
        this.graph = graph;
    }
    async execute(inputs) {
        const ctx = { ...inputs };
        // run function‐nodes
        for (const n of this.graph.fnNodes) {
            const args = {};
            for (const key of n.inputs)
                args[key] = ctx[key];
            ctx[n.id] = await n.fn(args);
        }
        // run tool‐nodes
        for (const n of this.graph.toolNodes) {
            const args = {};
            for (const key of n.inputs)
                args[key] = ctx[key];
            if (n.extraInputs)
                for (const x of n.extraInputs)
                    args[x] = ctx[x];
            ctx[n.id] = await n.tool.call(args);
        }
        return ctx[this.graph.outputKey];
    }
}
exports.GraphExecutor = GraphExecutor;
