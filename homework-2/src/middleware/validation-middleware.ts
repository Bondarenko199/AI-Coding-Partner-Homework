import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

declare module 'express' {
  interface Request {
    validatedBody?: unknown;
    validatedQuery?: unknown;
  }
}

export const validateBody = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      next(error);
      return;
    }

    req.validatedBody = value;
    next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      next(error);
      return;
    }

    req.validatedQuery = value;
    next();
  };
};
