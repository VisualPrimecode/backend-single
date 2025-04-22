import { NextFunction, Request, Response } from 'express';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import redisClient from '../config/redis';
import { generateAccessToken, generateRefreshToken } from '../utils/token';
import { sendSuccess, sendError } from '../utils/response';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

// Define a schema for user registration validation using zod
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2),
  role: z.enum(['admin', 'business']),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});


export const registerUser = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<any> => {
  try {
    // Validate and parse request body
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, 'Validation failed', parsed.error.flatten().fieldErrors);
    }

    const { email, password, name, role } = parsed.data;
    // Check if email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError(res, 409, 'Email is already registered');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12); // increase salt rounds for better security

    // Create user
    const newUser = new User({
      email,
      password: hashedPassword,
      name,
      role: role || 'business', // default to 'business' if not provided,
    });

    await newUser.save();

    // Fetch clean version without password
    const userWithoutPassword = await User.findById(newUser._id).select('-password');

    return sendSuccess(res, 201, 'User registered successfully', userWithoutPassword);
  } catch (error: any) {
    console.error('Registration error:', error);
    console.log(error?.message);
    return sendError(res, 500, 'Internal server error', error?.message || 'Unknown error');
  }
};

export const loginUser = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<any> => {
  try {
    // Validate input
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, 'Invalid email or password format');
    }
    const { email, password } = parsed.data;

    // Find user
    const user: any = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return sendError(res, 401, 'Invalid credentials');
    }


    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Set refresh token in HTTP-only cookie (for web)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    await redisClient.del(`user:${user._id}`);

    // Send response
    return sendSuccess(res, 200, 'User logged in successfully', {
      accessToken,
      // React Native clients can use this:
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted
      },
    });
  } catch (error) {
    // Optional: Log error here (e.g. winston logger)
    console.log(error)
    console.error('Login error:', error);
    return sendError(res, 500, 'Error logging in', error);
  }
};

export const logoutUser = async (_req: Request, res: Response, _next: NextFunction): Promise<any> => {
  try {
    res.clearCookie('refreshToken',
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      }
    );
    return sendSuccess(res, 200, 'User logged out successfully');
  } catch (error) {
    return sendError(res, 500, 'Error logging out', error);
  }
};

export const fetchAllUsers = async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const cacheKey = `users-page-${page}`;

    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return sendSuccess(res, 200, 'Fetched users from cache', JSON.parse(cachedData));
    }

    const users = await User.find().skip((page - 1) * limit).limit(limit);
    await redisClient.set(cacheKey, JSON.stringify(users), { EX: 300 });

    return sendSuccess(res, 200, 'Fetched users successfully', users);
  } catch (error) {
    return sendError(res, 500, 'Error fetching users', error);
  }
};

export const fetchUserById = async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return sendError(res, 404, 'User not found');
    }
    return sendSuccess(res, 200, 'User fetched successfully', user);
  } catch (error) {
    return sendError(res, 500, 'Error fetching user', error);
  }
};

export const editUser = async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const user = await User.findByIdAndUpdate(id, updates, { new: true });
    if (!user) {
      return sendError(res, 404, 'User not found');
    }
    return sendSuccess(res, 200, 'User updated successfully', user);
  } catch (error) {
    return sendError(res, 500, 'Error updating user', error);
  }
};

export const deleteUser = async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return sendError(res, 404, 'User not found');
    }
    return sendSuccess(res, 200, 'User deleted successfully');
  } catch (error) {
    return sendError(res, 500, 'Error deleting user', error);
  }
};


export const refreshAccessToken = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<any> => {
  try {
    const refreshToken =
      req.cookies.refreshToken || req.body.refreshToken || req.query.refreshToken;

    if (!refreshToken) {
      return sendError(res, 401, 'Refresh token not provided');
    }

    let decoded: any;
    try {
      decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET as string
      );
    } catch (err: any) {
      return sendError(res, 403, 'Invalid refresh token', err.message);
    }

    const userId = decoded.userId;

    // ✅ Try to get cached user
    let cachedUser = await redisClient.get(`user:${userId}`);
    let user;

    if (cachedUser) {
      user = JSON.parse(cachedUser);
    } else {
      user = await User.findById(userId).select('-password');
      if (!user) return sendError(res, 404, 'User not found');

      // ✅ Cache user for 15 minutes
      await redisClient.setEx(`user:${userId}`, 900, JSON.stringify(user));
    }

    const newAccessToken = generateAccessToken(user._id, user.role);

    return sendSuccess(res, 200, 'New access token generated successfully', {
      accessToken: newAccessToken,
      user,
    });
  } catch (error: any) {
    console.error('Error refreshing access token:', error);
    return sendError(
      res,
      500,
      'Error refreshing access token',
      error.message || 'Unknown error'
    );
  }
};
