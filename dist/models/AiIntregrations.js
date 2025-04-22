"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
// Sub-schema for integrationDetails
const IntegrationDetailsSchema = new mongoose_1.Schema({
    apiKey: { type: String, required: true, unique: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'inactive' },
    integrationTypes: {
        type: [String],
        enum: ['website', 'whatsapp', 'api'],
        default: [],
    },
    configDetails: { type: mongoose_1.Schema.Types.Mixed },
    limits: {
        maxWebsites: { type: Number, default: 1 },
        maxWhatsappNumbers: { type: Number, default: 1 },
        maxApiCalls: { type: Number, default: 1000 },
        maxConversationsPerMonth: { type: Number, default: 500 },
    },
    usageStats: {
        websitesConnected: { type: Number, default: 0 },
        whatsappNumbersConnected: { type: Number, default: 0 },
        apiCallsMade: { type: Number, default: 0 },
        monthlyConversations: { type: Number, default: 0 },
    },
    existingDomains: { type: [String], default: [] },
    expiresAt: { type: Date },
}, { _id: false } // Prevents Mongoose from creating a separate _id for this nested object
);
const AiIntegrationsSchema = new mongoose_1.Schema({
    businessId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Business',
        required: true,
        unique: true,
    },
    website: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: false },
    api: { type: Boolean, default: false },
    integrationDetails: {
        type: IntegrationDetailsSchema,
        required: true,
    },
}, { timestamps: true });
exports.default = mongoose_1.default.model('AiIntegrations', AiIntegrationsSchema);
