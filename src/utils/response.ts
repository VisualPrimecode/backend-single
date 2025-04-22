import { Response } from 'express';

export const sendSuccess = (
  res: Response,
  statusCode: number,
  message: string,
  data?: any
) => {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data: data || null,
  });
};

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  error?: any
) => {
  return res.status(statusCode).json({
    status: 'error',
    message,
    error: error || null,
  });
};
