import { NextFunction, Request, Response } from 'express';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import redisClient from '../config/redis';
import { generateAccessToken, generateRefreshToken } from '../utils/token';
import { sendSuccess, sendError } from '../utils/response';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const AdminLogin = async (
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
    
    //check user role
    if (user.role !== 'admin') {
      return sendError(res, 403, 'Access denied. Admins only.');
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Set refresh token in HTTP-only cookie (for web)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    await redisClient.del(`user:${user._id}`);

    // Send response
    return sendSuccess(res, 200, 'Admin logged in successfully', {
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
  } catch (error) {
    // Optional: Log error here (e.g. winston logger)
    console.log(error, 'error');
    console.error('Login error:', error);
    return sendError(res, 500, 'Error logging in', error);
  }
};
