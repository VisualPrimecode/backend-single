"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transferToHumanTool = void 0;
// src/tools/transferToHumanTool.ts
const tools_1 = require("langchain/tools");
const TransferredChat_1 = __importDefault(require("../models/TransferredChat"));
const zod_1 = require("zod");
exports.transferToHumanTool = new tools_1.DynamicStructuredTool({
    name: "transfer_to_human",
    description: "Transfer a user chat session to a human agent and persist it",
    schema: zod_1.z.object({
        customerId: zod_1.z.string().describe("Customer's ID"),
        businessId: zod_1.z.string().describe("Business ID"),
        agentId: zod_1.z.string().describe("AI agent ID"),
        message: zod_1.z.string().describe("The last user message before transfer")
    }),
    func: async ({ customerId, businessId, agentId, message }) => {
        await TransferredChat_1.default.create({
            customerId,
            businessId,
            agentId,
            lastMessage: message,
            status: "pending",
        });
        return "Transferred chat session created and logged.";
    },
});
