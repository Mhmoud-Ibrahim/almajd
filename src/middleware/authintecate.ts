import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../MongoDB/Schemas/user.model';

export const protect = async (req: any, res: Response, next: NextFunction) => {
  let token;
  if (req.cookies?.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "غير مسموح لك بالدخول، التوكن مفقود" });
  }

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    req.user = await User.findById(decoded.userId).select('-password');
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "توكن غير صالح" });
  }
};
