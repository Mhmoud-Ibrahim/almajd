
import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError";

interface JwtPayload {
    userId: string;
    email: string;
    name: string;
    role: string; 
    iat: number;
    exp: number;  
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        name: string;
        role: string;
        iat: number;
        exp: number;
      };
    }
  }
}



export const authenticate = (req:Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.noorToken;
    if (!token) {
        return next(new AppError("Login first to access this route", 401));
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_KEY as string) as JwtPayload;
        req.user  = decoded; 
        next();
    } catch (error) {
        return next(new AppError("Invalid or expired token, please login again", 401));
    }
};

export const allowedTo = (...roles: string[]) => {
    return (req: any, res: Response, next: NextFunction) => {
        if (!roles.includes(req.user.role)) {
            return next(new AppError("غير مسموح لك بالقيام بهذا الإجراء، للآدمن فقط", 403));
        }
        next();
    };
};

