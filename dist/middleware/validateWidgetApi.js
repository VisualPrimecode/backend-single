"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateWidgetApi = void 0;
const Business_1 = __importDefault(require("../models/Business"));
const AiIntregrations_1 = __importDefault(require("../models/AiIntregrations"));
const validateWidgetApi = async (req, res, next) => {
    try {
        const apiKey = req.query.apiKey;
        const domainClient = req.query.domainUrl;
        const agentName = req.query.agentName;
        if (!apiKey || !domainClient || !agentName) {
            return res.status(400).json({ message: 'Missing API key or domain' });
        }
        const businessData = await AiIntregrations_1.default.findOne({ 'integrationDetails.apiKey': apiKey }).select('businessId');
        const business = await Business_1.default.findById(businessData?.businessId);
        if (!business) {
            return res.status(401).json({ message: 'Invalid API key' });
        }
        req.business = business;
        req.domainUrl = domainClient;
        req.agentName = agentName;
        next();
    }
    catch (error) {
        console.error('Widget API validation error:', error.message);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.validateWidgetApi = validateWidgetApi;
