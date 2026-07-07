import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface TokenPayload {
  userId: string;
  role: string;
}

export const signAccessToken = (userId: string, role: string): string => {
  return jwt.sign({ userId, role }, env.JWT_ACCESS_SECRET, {
    expiresIn: '15m',
  });
};

export const signRefreshToken = (userId: string, role: string): string => {
  return jwt.sign({ userId, role }, env.JWT_REFRESH_SECRET, {
    expiresIn: '30d',
  });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
};
