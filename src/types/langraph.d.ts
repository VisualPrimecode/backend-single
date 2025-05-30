// src/types/langraph.d.ts
declare module "langraph" {
  // you can flesh these out later, for now:
  export class GraphBuilder {
    input(name: string): this;
    node<T = any>(id: string, fn: (inputs: any) => Promise<T>): this;
    tool(id: string, tool: any, inputs: string[], opts?: any): this;
    output(name: string): this;
    build(): any;
  }
  export class GraphExecutor {
    constructor(graph: any);
    execute(inputs: Record<string, any>): Promise<any>;
  }
}
