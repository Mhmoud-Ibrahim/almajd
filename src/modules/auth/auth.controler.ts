
import jwt from 'jsonwebtoken'
import { User, type IUser } from '../../../src/models/user.model'
import bcrypt from 'bcrypt'
import { catchError } from '../../middleware/catchError.js';
import { AppError } from '../../utils/appError.js';
import type { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy, type Profile, type VerifyCallback } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import crypto from 'crypto'; 
import { sendEmail } from '../../utils/sendEmail.js';
dotenv.config();
// --- 1. تعريف إستراتيجية جوجل (Google Strategy) ---
passport.use(new GoogleStrategy({
    clientID: process.env.clientID!,
    clientSecret: process.env.clientSecret!,
    callbackURL: "https://almajd-tau.vercel.app/auth/google",
  },
  async (_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) => {
    try {
        const userEmail = profile.emails && profile.emails[0] ? profile.emails[0].value : null;

        if (!userEmail) {
            return done(null, false);
        }

        let user = await User.findOne({ email: userEmail });

        if (!user) {
            user = await User.create({
                name: profile.displayName,
                email: userEmail,
                password: Math.random().toString(36).slice(-10), // كلمة سر عشوائية
                userImage: profile.photos && profile.photos[0] ? profile.photos[0].value : '',
                googleId: profile.id,
                role: 'user'
            });
        } else if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
        }
        return done(null, user);
    } catch (err) {
        return done(err as Error, undefined);
    }
  }
));

// --- 2. الدوال المساعدة ---
const sendTokenResponse = (user: any, res: Response) => {
    const token = jwt.sign(
        { userId: user._id, email: user.email, name: user.name, role: user.role },
        process.env.JWT_KEY as string,
        { expiresIn: '24h' }
    );
    
    res.cookie('noorToken', token, {
        httpOnly: true,
        secure: true, 
        sameSite: 'none',
        maxAge: 24 * 60 * 60 * 1000,
    });
    
    return token;
};


export const signup = catchError(async (req: Request, res: Response) => {
    const userExists = await User.findOne({ email: req.body.email });
    if (userExists) return res.status(400).json({ message: "user already exists" });
    
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const newUser = new User({ ...req.body, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: "success" });
});

export const signin = catchError(async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user) return next(new AppError('user not found', 401))
    
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (isPasswordCorrect) {
        sendTokenResponse(user, res);
        return res.status(200).json({ message: "success" });
    }
    return next(new AppError('incorrect email or password ', 401))
});

export const logout = catchError((req: Request, res: any) => {
    res.clearCookie('noorToken', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/' 
    });
    return res.json({ message: 'Logged out successfully' })
});

export const getMe = catchError(async (req: any, res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    res.status(200).json({ status: "success", data: req.user });
});

export const googleAuthSuccess = catchError(async (req: Request, res: Response) => {
    if (req.user) {
        sendTokenResponse(req.user, res);
        res.redirect('https://almajd-front.vercel.app'); 
    } else {
        res.redirect('https://vercel.app');
    }
});



export const forgotPassword = catchError(async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;
    if (!email) return next(new AppError('برجاء إدخال البريد الإلكتروني', 400));

    // إنشاء OTP عشوائي من 6 أرقام
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // تشفير الـ OTP لحفظه في الداتابيز
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const expires = new Date(Date.now() + 10 * 60 * 1000); // صالح لمدة 10 دقائق

    const user = await User.findOneAndUpdate(
        { email },
        { passwordResetToken: hashedOtp, passwordResetExpires: expires },
        { new: true }
    );

    if (!user) return next(new AppError('لا يوجد مستخدم بهذا الإيميل', 404));

    try {
        await sendEmail({
            email: user.email,
            subject: 'رمز التحقق الخاص بك (OTP)',
            message: `رمز إعادة تعيين كلمة المرور الخاص بك هو: ${otp}. صالح لمدة 10 دقائق.`,
        });

        res.status(200).json({ status: "success", message: "OTP sent to email!" });
    } catch (err) {
        // في حالة فشل الإرسال، نمسح التوكنات عشان متبقاش متعلقة في الداتابيز
        await User.findOneAndUpdate({ email }, { $unset: { passwordResetToken: 1, passwordResetExpires: 1 } });
        return next(new AppError('فشل في إرسال الإيميل، تأكد من إعدادات الـ SMTP', 500));
    }
});



export const resetPassword = catchError(async (req: Request, res: Response, next: NextFunction) => {
    const { otp, password } = req.body; 

    if (!otp || !password) {
        return next(new AppError('برجاء إدخال الرمز وكلمة المرور الجديدة', 400));
    }

    // تشفير الرمز القادم من المستخدم لمقارنته بالمشفر في الداتابيز
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    // تشفير الباسورد الجديد قبل الحفظ
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.findOneAndUpdate(
        { 
            passwordResetToken: hashedOtp,
            passwordResetExpires: { $gt: new Date() } // التأكد إنه لسه صالح
        },
        {
            password: hashedPassword,
            $unset: { passwordResetToken: 1, passwordResetExpires: 1 } 
        },
        { new: true }
    );

    if (!user) {
        return next(new AppError('الرمز غير صحيح أو انتهت صلاحيته', 400));
    }

    // إرسال توكن جديد بعد نجاح التغيير عشان المستخدم يسجل دخول تلقائي
    sendTokenResponse(user, res);
    res.status(200).json({ status: "success", message: "success" });
});
