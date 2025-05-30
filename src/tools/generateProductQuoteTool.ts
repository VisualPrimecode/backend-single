// tools/generateProductQuoteTool.ts
import { Tool } from "@langchain/core/tools";
import { z } from "zod";

const ProductQuoteSchema = z.object({
  items: z.array(z.object({ /* ... */ })),
  subtotal: z.number(),
  tax: z.number().optional(),
  total: z.number(),
  customerEmail: z.string().email().optional(),
});


export class GenerateProductQuoteTool extends Tool {
  name = "generateProductQuote";
  description = "Finalizes a product quote. Accepts a quote object (usually from adaptiveQuote) and returns it, potentially with minor adjustments or validations. Input is JSON.";
  // schema = ProductQuoteSchema;

  constructor() {
    super();
  }

  protected async _call(text: string | Record<string, any>): Promise<string> {
    if (!text) {
      throw new Error("generateProductQuote: no input provided");
    }
    let inputData: any;
    try {
      inputData = typeof text === 'string' ? JSON.parse(text) : text;
    } catch (err: any) {
      throw new Error(`generateProductQuote: invalid JSON: ${err.message}`);
    }

    // Validate with Zod schema
    const parsedQuote = ProductQuoteSchema.parse(inputData);

    // Potentially add more logic here if this tool does more than pass-through
    const { items, subtotal, tax = 0, total, customerEmail } = parsedQuote;
    if (total !== subtotal + tax && tax !== undefined) { // Basic validation
        // Potentially recalculate or flag
        console.warn("generateProductQuote: Total does not match subtotal + tax. Using provided total.");
    }

    const quote = { items, subtotal, tax, total: total ?? subtotal + tax, customerEmail };
    return JSON.stringify(quote);
  }
}