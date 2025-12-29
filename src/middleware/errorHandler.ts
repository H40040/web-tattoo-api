import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors: any = undefined;

  // Zod validation errors
  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation error';
    errors = err.errors.map(error => ({
      field: error.path.join('.'),
      message: error.message
    }));
  }

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    
    if (prismaError.code === 'P2002') {
      statusCode = 409;
      message = 'Resource already exists';
      errors = prismaError.meta?.target?.map((field: string) => ({
        field,
        message: `${field} already exists`
      }));
    } else if (prismaError.code === 'P2025') {
      statusCode = 404;
      message = 'Resource not found';
    } else if (prismaError.code === 'P2003') {
      statusCode = 400;
      message = 'Foreign key constraint failed';
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Multer errors
  if (err.name === 'MulterError') {
    statusCode = 400;
    message = 'File upload error';
    const mErr = err as any;
    if (mErr.code === 'LIMIT_FILE_SIZE') {
      message = 'File too large';
    } else if (mErr.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files';
    } else if (mErr.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected file field';
    }
  }

  console.error('Error:', {
    statusCode,
    message,
    errors,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
