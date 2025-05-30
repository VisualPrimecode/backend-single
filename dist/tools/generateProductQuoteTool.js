"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateProductQuoteTool = void 0;
// tools/generateProductQuoteTool.ts
const tools_1 = require("@langchain/core/tools");
const zod_1 = require("zod");
const ProductQuoteSchema = zod_1.z.object({
    items: zod_1.z.array(zod_1.z.object({ /* ... */})),
    subtotal: zod_1.z.number(),
    tax: zod_1.z.number().optional(),
    total: zod_1.z.number(),
    customerEmail: zod_1.z.string().email().optional(),
});
class GenerateProductQuoteTool extends tools_1.Tool {
    // schema = ProductQuoteSchema;
    constructor() {
        super();
        this.name = "generateProductQuote";
        this.description = "Finalizes a product quote. Accepts a quote object (usually from adaptiveQuote) and returns it, potentially with minor adjustments or validations. Input is JSON.";
    }
    async _call(text) {
        if (!text) {
            throw new Error("generateProductQuote: no input provided");
        }
        let inputData;
        try {
            inputData = typeof text === 'string' ? JSON.parse(text) : text;
        }
        catch (err) {
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
exports.GenerateProductQuoteTool = GenerateProductQuoteTool;
