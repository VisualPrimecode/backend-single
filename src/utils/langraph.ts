// src/utils/langraph.ts
type FnNode = { id: string; fn: (inputs: any) => Promise<any>; inputs: string[] };
type ToolNode = {
  id: string;
  tool: { call: (args: any) => Promise<any> };
  inputs: string[];
  extraInputs?: string[];
};

export class GraphBuilder {
  private inputsSet = new Set<string>();
  private fnNodes: FnNode[] = [];
  private toolNodes: ToolNode[] = [];
  private outputKey?: string;

  input(name: string) {
    this.inputsSet.add(name);
    return this;
  }

  node<T = any>(id: string, fn: (inputs: any) => Promise<T>, inputs: string[]) {
    this.fnNodes.push({ id, fn, inputs });
    return this;
  }

  tool(
    id: string,
    tool: { call: (args: any) => Promise<any> },
    inputs: string[],
    opts?: { extraInputs?: string[] }
  ) {
    this.toolNodes.push({ id, tool, inputs, extraInputs: opts?.extraInputs });
    return this;
  }

  output(name: string) {
    this.outputKey = name;
    return this;
  }

  build() {
    if (!this.outputKey) throw new Error("No output defined");
    return {
      inputs: Array.from(this.inputsSet),
      fnNodes: this.fnNodes,
      toolNodes: this.toolNodes,
      outputKey: this.outputKey,
    };
  }
}

export class GraphExecutor {
  constructor(private graph: ReturnType<GraphBuilder["build"]>) {}

  async execute(inputs: Record<string, any>) {
    const ctx = { ...inputs } as any;

    // run function‐nodes
    for (const n of this.graph.fnNodes) {
      const args: any = {};
      for (const key of n.inputs) args[key] = ctx[key];
      ctx[n.id] = await n.fn(args);
    }

    // run tool‐nodes
    for (const n of this.graph.toolNodes) {
      const args: any = {};
      for (const key of n.inputs) args[key] = ctx[key];
      if (n.extraInputs) for (const x of n.extraInputs) args[x] = ctx[x];
      ctx[n.id] = await n.tool.call(args);
    }

    return ctx[this.graph.outputKey];
  }
}
