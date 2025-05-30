// src/tools/transferToHumanTool.ts
import { DynamicStructuredTool } from "langchain/tools";
import TransferredChat from "../models/TransferredChat";
import { z } from "zod";

export const transferToHumanTool = new DynamicStructuredTool({
  name: "transfer_to_human",
  description: "Transfer a user chat session to a human agent and persist it",
  schema: z.object({
    customerId: z.string().describe("Customer's ID"),
    businessId: z.string().describe("Business ID"),
    agentId: z.string().describe("AI agent ID"),
    message: z.string().describe("The last user message before transfer")
  }),
  func: async ({ customerId, businessId, agentId, message }) => {
    await TransferredChat.create({
      customerId,
      businessId,
      agentId,
      lastMessage: message,
      status: "pending",
    });
    return "Transferred chat session created and logged.";
  },
});
