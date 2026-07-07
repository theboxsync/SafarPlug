import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Unhandled Server Error:', error.message, error.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error occurred. Please try again later.',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
};
