"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddlewareForAdmin = exports.authMiddleware = void 0;
const response_1 = require("../utils/response");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1] ||
        req.cookies?.accessToken ||
        req.body.accessToken ||
        req.query.accessToken;
    if (!token)
        return res.status(401).json({ message: 'Unauthorized' });
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Optional check to see what's in decoded
        if (typeof decoded === 'object' && 'userId' in decoded) {
            req.user = {
                userId: decoded.userId,
                role: decoded.role,
            };
        }
        else {
            console.error('Invalid decoded token:', decoded);
            return (0, response_1.sendError)(res, 403, 'Invalid token');
        }
        next();
    }
    catch (error) {
        return res.status(403).json({ message: 'Invalid token' });
    }
};
exports.authMiddleware = authMiddleware;
const authMiddlewareForAdmin = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1] ||
        req.cookies?.accessToken ||
        req.body.accessToken ||
        req.query.accessToken;
    if (!token)
        return res.status(401).json({ message: 'Unauthorized' });
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'admin') {
            return (0, response_1.sendError)(res, 403, 'Access denied. Admins only.');
        }
        // Optional check to see what's in decoded
        if (typeof decoded === 'object' && 'userId' in decoded) {
            req.user = {
                userId: decoded.userId,
                role: decoded.role,
            };
        }
        else {
            console.error('Invalid decoded token:', decoded);
            return (0, response_1.sendError)(res, 403, 'Invalid token');
        }
        next();
    }
    catch (error) {
        return res.status(403).json({ message: 'Invalid token' });
    }
};
exports.authMiddlewareForAdmin = authMiddlewareForAdmin;
exports.default = exports.authMiddleware;
