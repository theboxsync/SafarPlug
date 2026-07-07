import { Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

// Validation Schemas
const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Invalid phone number'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  userType: z.enum(['ev_user', 'station_owner']),
  vehicleType: z.enum(['car', 'bike', 'both']).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(10).optional(),
  profilePicUrl: z.string().url().optional(),
  vehicleType: z.enum(['car', 'bike', 'both']).optional(),
});

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.format(),
      });
      return;
    }

    const { name, email, phone, password, userType, vehicleType } = parseResult.data;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'Email address already registered' });
      return;
    }

    const user = new User({
      name,
      email,
      phone,
      passwordHash: password, // pre-save hook will hash it
      userType,
      vehicleType,
    });

    await user.save();

    const accessToken = signAccessToken(user.id, user.userType);
    const refreshToken = signRefreshToken(user.id, user.userType);

    res.status(201).json({
      success: true,
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.format(),
      });
      return;
    }

    const { email, password } = parseResult.data;

    // Explicitly select passwordHash
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      res.status(400).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const accessToken = signAccessToken(user.id, user.userType);
    const refreshToken = signRefreshToken(user.id, user.userType);

    // Fetch user without passwordHash for response
    const cleanUser = await User.findById(user.id);

    res.status(200).json({
      success: true,
      data: {
        user: cleanUser,
        accessToken,
        refreshToken,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ success: false, message: 'Refresh token is required' });
      return;
    }

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.userId);

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid token, user not found' });
      return;
    }

    const newAccessToken = signAccessToken(user.id, user.userType);
    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error: any) {
    res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
};

export const me = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    res.status(200).json({ success: true, data: req.user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const parseResult = updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.format(),
      });
      return;
    }

    const { name, phone, profilePicUrl, vehicleType } = parseResult.data;
    const user = req.user;

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (profilePicUrl) user.profilePicUrl = profilePicUrl;
    if (vehicleType) user.vehicleType = vehicleType;

    await user.save();

    res.status(200).json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};
