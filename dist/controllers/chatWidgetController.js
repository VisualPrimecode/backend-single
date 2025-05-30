"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadChatWidget = void 0;
const response_1 = require("../utils/response");
const AiIntregrations_1 = __importDefault(require("../models/AiIntregrations"));
const AiAgent_1 = __importDefault(require("../models/AiAgent"));
const redis_1 = __importDefault(require("../config/redis"));
const loadChatWidget = async (req, res) => {
    try {
        const business = req.business;
        const domainUrl = req.domainUrl;
        const agentName = req.agentName;
        if (process.env.NODE_ENV !== 'production') {
            console.log('[Widget] Domain validation:', domainUrl);
        }
        const aiIntregation = await AiIntregrations_1.default.findOne({ businessId: business._id });
        if (!aiIntregation) {
            return (0, response_1.sendError)(res, 404, 'AI Integration not found');
        }
        const { limits, usageStats, existingDomains, integrationTypes, apiKey } = aiIntregation?.integrationDetails;
        const normalizedDomain = domainUrl.toLowerCase();
        const isAllowedDomain = existingDomains?.some((d) => d.toLowerCase() === normalizedDomain);
        console.log(domainUrl, existingDomains, isAllowedDomain);
        if (!isAllowedDomain) {
            return (0, response_1.sendError)(res, 403, 'Domain not allowed to connect with this agent');
        }
        const agent = await AiAgent_1.default.findOne({ name: agentName, business: business._id });
        if (!agent) {
            return (0, response_1.sendError)(res, 404, 'Agent not found');
        }
        const isConnected = agent?.active;
        if (isConnected) {
            return (0, response_1.sendSuccess)(res, 200, 'Chat widget validated', {
                agentName: agent.name,
                businessId: business._id,
                apiKey: apiKey,
                domain: domainUrl,
                plan: business.subscriptionPlan,
                limits,
                connected: true,
            });
        }
        if (usageStats.websitesConnected >= limits.maxWebsites) {
            return res.status(403).json({ message: 'Website integration limit reached for your plan' });
        }
        usageStats.websitesConnected += 1;
        if (!integrationTypes.includes('website')) {
            integrationTypes.push('website');
        }
        aiIntregation.website = true;
        await aiIntregation.save();
        agent.active = true;
        agent?.intregatedDomains.push(domainUrl);
        await agent.save();
        const cacheKey = `agentById-${agent._id}`;
        await redis_1.default.del(cacheKey);
        return (0, response_1.sendSuccess)(res, 200, 'Chat widget validated', {
            agentName: agent.name,
            businessId: business._id,
            apiKey: apiKey,
            domain: domainUrl,
            plan: business.subscriptionPlan,
            limits,
            connected: true,
        });
    }
    catch (error) {
        console.log(error);
        console.error('Error loading chat widget:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
exports.loadChatWidget = loadChatWidget;
