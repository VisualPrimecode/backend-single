"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkUsageLimits = void 0;
const Business_1 = __importDefault(require("../models/Business"));
const response_1 = require("../utils/response");
const AiIntregrations_1 = __importDefault(require("../models/AiIntregrations"));
const checkUsageLimits = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey || typeof apiKey !== 'string') {
            return (0, response_1.sendError)(res, 401, 'API key missing or invalid');
        }
        const business = await Business_1.default.findOne({ 'aiIntegrations.integrationDetails.apiKey': apiKey });
        if (!business) {
            return (0, response_1.sendError)(res, 404, 'Business not found for provided API key');
        }
        const usageStats = await AiIntregrations_1.default.findOne({ 'integrationDetails.apiKey': apiKey }).select('integrationDetails').lean();
        const integration = usageStats.integrationDetails;
        const now = new Date();
        if (integration) {
            if (integration.expiresAt && now > new Date(integration.expiresAt)) {
                return (0, response_1.sendError)(res, 403, 'Free trial expired');
            }
            const { limits, usageStats } = integration;
            if (usageStats.monthlyConversations >= limits.maxConversationsPerMonth) {
                return (0, response_1.sendError)(res, 429, 'Monthly conversation limit exceeded');
            }
            if (usageStats.apiCallsMade >= limits.maxApiCalls) {
                return (0, response_1.sendError)(res, 429, 'API call limit exceeded');
            }
            // If from website widget
            if (req.path.includes('/widget') && usageStats.websitesConnected >= limits.maxWebsites) {
                return (0, response_1.sendError)(res, 429, 'Website integration limit exceeded');
            }
            // If from WhatsApp
            if (req.path.includes('/whatsapp') && usageStats.whatsappNumbersConnected >= limits.maxWhatsappNumbers) {
                return (0, response_1.sendError)(res, 429, 'WhatsApp integration limit exceeded');
            }
        }
        // Attach business for further use if needed
        req.business = business;
        next();
    }
    catch (error) {
        console.error('❌ Middleware Error - checkUsageLimits:', error);
        return (0, response_1.sendError)(res, 500, 'Internal server error', error.message);
    }
};
exports.checkUsageLimits = checkUsageLimits;
