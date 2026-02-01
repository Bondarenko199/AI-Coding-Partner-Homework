import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'joi';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      status: err.statusCode
    });
    return;
  }

  if (err.name === 'ValidationError' && 'details' in err) {
    const validationError = err as ValidationError;
    res.status(400).json({
      error: 'Validation error',
      details: validationError.details.map(d => ({
        message: d.message,
        path: d.path.join('.')
      }))
    });
    return;
  }

  console.error('Unexpected error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
};

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found'
  });
};

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
