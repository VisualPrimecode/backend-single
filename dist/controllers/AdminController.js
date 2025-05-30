"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminLogin = void 0;
const User_1 = __importDefault(require("../models/User"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const redis_1 = __importDefault(require("../config/redis"));
const token_1 = require("../utils/token");
const response_1 = require("../utils/response");
const zod_1 = require("zod");
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
const AdminLogin = async (req, res, _next) => {
    try {
        // Validate input
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            return (0, response_1.sendError)(res, 400, 'Invalid email or password format');
        }
        const { email, password } = parsed.data;
        // Find user
        const user = await User_1.default.findOne({ email });
        if (!user || !(await bcryptjs_1.default.compare(password, user.password))) {
            return (0, response_1.sendError)(res, 401, 'Invalid credentials');
        }
        //check user role
        if (user.role !== 'admin') {
            return (0, response_1.sendError)(res, 403, 'Access denied. Admins only.');
        }
        // Generate tokens
        const accessToken = (0, token_1.generateAccessToken)(user._id, user.role);
        const refreshToken = (0, token_1.generateRefreshToken)(user._id);
        // Set refresh token in HTTP-only cookie (for web)
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        await redis_1.default.del(`user:${user._id}`);
        // Send response
        return (0, response_1.sendSuccess)(res, 200, 'Admin logged in successfully', {
            accessToken,
            // React Native clients can use this:
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        // Optional: Log error here (e.g. winston logger)
        console.log(error, 'error');
        console.error('Login error:', error);
        return (0, response_1.sendError)(res, 500, 'Error logging in', error);
    }
};
exports.AdminLogin = AdminLogin;
