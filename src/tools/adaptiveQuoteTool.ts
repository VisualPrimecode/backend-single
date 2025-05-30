import { Tool } from "@langchain/core/tools";
import { z } from "zod";

// Schema for the input *expected by the tool's _call method after LLM generates it*
const AdaptiveQuoteToolInputSchema = z.object({
  businessType: z.string().describe("The type of the business (e.g., retail, consulting)."),
  industry: z.string().describe("The industry of the business (e.g., ecommerce, legal)."),
  items: z.array(z.object({
    product: z.string().describe("Name or description of the product/service."),
    quantity: z.number().optional().describe("Quantity of the item. Default to 1 if not applicable or not provided."),
    price_per_unit: z.number().optional().describe("Price per unit of the item. Default to 0 if not provided."),
  })).describe("List of items for the quote."),
  customerEmail: z.string().email().optional().describe("Customer's email address, if available."),
});

export class AdaptiveQuoteTool extends Tool {
  name = "adaptiveQuote";
  description = `Validates and adjusts quote structure based on business rules, then calculates subtotal, tax, and total. Input must be a JSON string matching this schema: ${JSON.stringify(AdaptiveQuoteToolInputSchema.shape)}. The LLM must provide 'businessType' and 'industry' from the business profile.`;
  
  // Zod schema for Langchain tool framework (optional but good practice)
  // This is for direct .invoke({ structuredInput }) if the framework supports it well.
  // For now, _call takes string and parses manually.
  // schema = AdaptiveQuoteToolInputSchema;


  // Input to _call will be a string (JSON) from the LLM or tool chain
  async _call(input: string | Record<string, any>): Promise<string> {
    let parsedInput: z.infer<typeof AdaptiveQuoteToolInputSchema>;
    try {
      const data = typeof input === 'string' ? JSON.parse(input) : input;
      parsedInput = AdaptiveQuoteToolInputSchema.parse(data);
    } catch (err: any) {
      return `Error parsing input for adaptiveQuote: ${err.message}. Input must be valid JSON matching the tool's schema. Input received: ${input}`;
    }
    
    const { items, businessType, industry, customerEmail } = parsedInput;

    // Example: quantity logic (already in your original tool, which is good)
    const requiresQuantityIndustries = ["retail", "logistics", "wholesale", "ecommerce"];
    const includeQuantity = requiresQuantityIndustries.includes(industry.toLowerCase()) ||
                            requiresQuantityIndustries.includes(businessType.toLowerCase());

    const cleanItems = items.map(item => ({
      product: item.product,
      quantity: includeQuantity ? (item.quantity ?? 1) : undefined, // Default to 1 if quantity is relevant but not provided
      price_per_unit: item.price_per_unit ?? 0, // Default to 0 if price not provided
    }));

    const subtotal = cleanItems.reduce((sum, item) => {
      const quantity = item.quantity ?? (includeQuantity ? 1 : 1); // If quantity is undefined but should be included, assume 1 for calc
      const price = item.price_per_unit ?? 0;
      return sum + (price * quantity);
    }, 0);
    
    const taxRate = 0.1; // Example tax rate, make this configurable or business-specific
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    const quoteResult = {
      items: cleanItems,
      subtotal,
      tax,
      total,
      customerEmail, // Pass through email
      // Optionally add business details if PDF needs them directly from here
      // businessName: business.name, // This tool doesn't have 'business' directly
    };

    return JSON.stringify(quoteResult);
  }
}