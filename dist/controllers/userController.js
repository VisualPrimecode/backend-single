"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshAccessToken = exports.deleteUser = exports.editUser = exports.fetchUserById = exports.fetchAllUsers = exports.logoutUser = exports.loginUser = exports.registerUser = void 0;
const User_1 = __importDefault(require("../models/User"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const redis_1 = __importDefault(require("../config/redis"));
const token_1 = require("../utils/token");
const response_1 = require("../utils/response");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const mongoose_1 = __importDefault(require("mongoose"));
// Define a schema for user registration validation using zod
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    name: zod_1.z.string().min(2),
    role: zod_1.z.enum(['admin', 'business']),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
const registerUser = async (req, res, _next) => {
    try {
        // Validate and parse request body
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            return (0, response_1.sendError)(res, 400, 'Validation failed', parsed.error.flatten().fieldErrors);
        }
        const { email, password, name, role } = parsed.data;
        // Check if email is already registered
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            return (0, response_1.sendError)(res, 409, 'Email is already registered');
        }
        // Hash the password
        const hashedPassword = await bcryptjs_1.default.hash(password, 12); // increase salt rounds for better security
        // Create user
        const newUser = new User_1.default({
            email,
            password: hashedPassword,
            name,
            role: role || 'business', // default to 'business' if not provided,
        });
        await newUser.save();
        // Invalidate user cache
        const keys = await redis_1.default.keys('users-page-*');
        if (keys.length > 0) {
            await redis_1.default.del(keys);
        }
        // Fetch clean version without password
        const userWithoutPassword = await User_1.default.findById(newUser._id).select('-password');
        return (0, response_1.sendSuccess)(res, 201, 'User registered successfully', userWithoutPassword);
    }
    catch (error) {
        console.error('Registration error:', error);
        console.log(error?.message);
        return (0, response_1.sendError)(res, 500, 'Internal server error', error?.message || 'Unknown error');
    }
};
exports.registerUser = registerUser;
const loginUser = async (req, res, _next) => {
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
        // Generate tokens
        const accessToken = (0, token_1.generateAccessToken)(user._id, user.role);
        const refreshToken = (0, token_1.generateRefreshToken)(user._id);
        const isProd = process.env.NODE_ENV === 'production';
        const cookieOptions = {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            secure: isProd,
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        };
        res.cookie('refreshToken', refreshToken, cookieOptions);
        await redis_1.default.del(`user:${user._id}`);
        // Send response
        return (0, response_1.sendSuccess)(res, 200, 'User logged in successfully', {
            accessToken,
            // React Native clients can use this:
            refreshToken,
            user: {
                id: user.id,
                businessId: user.businessId,
                name: user.name,
                email: user.email,
                role: user.role,
                onboardingCompleted: user.onboardingCompleted
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
exports.loginUser = loginUser;
const logoutUser = async (_req, res, _next) => {
    try {
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });
        return (0, response_1.sendSuccess)(res, 200, 'User logged out successfully');
    }
    catch (error) {
        return (0, response_1.sendError)(res, 500, 'Error logging out', error);
    }
};
exports.logoutUser = logoutUser;
const fetchAllUsers = async (req, res, _next) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const search = req.query.search?.trim() || '';
        const cacheKey = `users-page-${page}-search-${search}`;
        const cachedData = await redis_1.default.get(cacheKey);
        if (cachedData) {
            return (0, response_1.sendSuccess)(res, 200, 'Fetched users from cache', JSON.parse(cachedData));
        }
        let query = {};
        if (search) {
            const isObjectId = mongoose_1.default.Types.ObjectId.isValid(search);
            query = isObjectId
                ? {
                    $or: [
                        { _id: new mongoose_1.default.Types.ObjectId(search) },
                        { $text: { $search: search } },
                    ],
                }
                : { $text: { $search: search } };
        }
        const users = await User_1.default.find(query)
            .skip((page - 1) * limit)
            .limit(limit)
            .select('-password')
            .lean();
        const totalCount = await User_1.default.countDocuments(query);
        const result = {
            users,
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
        };
        await redis_1.default.set(cacheKey, JSON.stringify(result), { EX: 300 });
        return (0, response_1.sendSuccess)(res, 200, 'Fetched users successfully', result);
    }
    catch (error) {
        return (0, response_1.sendError)(res, 500, 'Error fetching users', error);
    }
};
exports.fetchAllUsers = fetchAllUsers;
const fetchUserById = async (req, res, _next) => {
    try {
        const { id } = req.params;
        const user = await User_1.default.findById(id);
        if (!user) {
            return (0, response_1.sendError)(res, 404, 'User not found');
        }
        return (0, response_1.sendSuccess)(res, 200, 'User fetched successfully', user);
    }
    catch (error) {
        return (0, response_1.sendError)(res, 500, 'Error fetching user', error);
    }
};
exports.fetchUserById = fetchUserById;
const editUser = async (req, res, _next) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const user = await User_1.default.findByIdAndUpdate(id, updates, { new: true });
        if (!user) {
            return (0, response_1.sendError)(res, 404, 'User not found');
        }
        // Invalidate user cache
        const keys = await redis_1.default.keys('users-page-*');
        if (keys.length > 0) {
            await redis_1.default.del(keys);
        }
        return (0, response_1.sendSuccess)(res, 200, 'User updated successfully', user);
    }
    catch (error) {
        console.log(error);
        return (0, response_1.sendError)(res, 500, 'Error updating user', error);
    }
};
exports.editUser = editUser;
const deleteUser = async (req, res, _next) => {
    try {
        const { id } = req.params;
        const user = await User_1.default.findByIdAndDelete(id);
        if (!user) {
            return (0, response_1.sendError)(res, 404, 'User not found');
        }
        return (0, response_1.sendSuccess)(res, 200, 'User deleted successfully');
    }
    catch (error) {
        return (0, response_1.sendError)(res, 500, 'Error deleting user', error);
    }
};
exports.deleteUser = deleteUser;
const refreshAccessToken = async (req, res, _next) => {
    try {
        const refreshToken = req.cookies.refreshToken || req.body.refreshToken || req.query.refreshToken;
        console.log('Refresh Token From:', refreshToken);
        if (!refreshToken) {
            return (0, response_1.sendError)(res, 401, 'Refresh token not provided');
        }
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        }
        catch (err) {
            return (0, response_1.sendError)(res, 403, 'Invalid refresh token', err.message);
        }
        const userId = decoded.userId;
        // ✅ Try to get cached user
        let cachedUser = await redis_1.default.get(`user:${userId}`);
        let user;
        if (cachedUser) {
            user = JSON.parse(cachedUser);
        }
        else {
            user = await User_1.default.findById(userId).select('-password');
            if (!user)
                return (0, response_1.sendError)(res, 404, 'User not found');
            // ✅ Cache user for 15 minutes
            await redis_1.default.setEx(`user:${userId}`, 900, JSON.stringify(user));
        }
        const newAccessToken = (0, token_1.generateAccessToken)(user._id, user.role);
        return (0, response_1.sendSuccess)(res, 200, 'New access token generated successfully', {
            accessToken: newAccessToken,
            user,
        });
    }
    catch (error) {
        console.error('Error refreshing access token:', error);
        return (0, response_1.sendError)(res, 500, 'Error refreshing access token', error.message || 'Unknown error');
    }
};
exports.refreshAccessToken = refreshAccessToken;
