"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const transferredChatSchema = new mongoose_1.default.Schema({
    customerId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Customer', required: true },
    businessId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Business', required: true },
    agentId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Agent', required: false },
    lastMessage: { type: String },
    status: { type: String, enum: ['pending', 'active', 'resolved'], default: 'pending' },
}, { timestamps: true });
exports.default = mongoose_1.default.model('TransferredChat', transferredChatSchema);
