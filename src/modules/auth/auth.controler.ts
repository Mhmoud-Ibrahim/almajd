import { Request, Response, NextFunction } from 'express';
import User from '../../MongoDB/Schemas/user.model';
import jwt from 'jsonwebtoken';
import { AppError } from '../../utils/appError';
import { sendEmail } from '../../utils/sendEmail';
import { catchError } from '../../middleware/catchError';


export const signup = catchError(async (req: Request, res: Response, next: NextFunction) => {
    const { fullName, phoneNumber, email, password } = req.body;

    const userExists = await User.findOne({ $or: [{ phoneNumber }, { email }] });
    if (userExists) return next(new AppError("الرقم أو البريد الإلكتروني مسجل بالفعل", 400));

    let profilePicData = { public_id: "", url: "" };
    if (req.file) {
        profilePicData = {
            public_id: (req.file as any).filename, 
            url: (req.file as any).path,
        };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const newUser = new User({
        fullName,
        phoneNumber,
        email,
        password,
        profilePic: profilePicData,
        otp,
        otpExpires: new Date(Date.now() + 10 * 60000)
    });

    await newUser.save();

    await sendEmail({
        email: newUser.email,
        subject: 'كود التحقق الخاص بك - almajd',
        message: `كود التحقق الخاص بك هو: ${otp}. صالح لمدة 10 دقائق.`
    });

    res.status(201).json({ 
        success: true, 
        message: "تم إنشاء الحساب، تفقد بريدك الإلكتروني لتفعيل الكود" 
    });
});


export const signin = catchError(async (req: Request, res: Response, next: NextFunction) => {
    const { phoneNumber } = req.body;

    if (!phoneNumber) return next(new AppError("يرجى إدخال رقم الهاتف", 400));

    const user = await User.findOne({ phoneNumber });
    if (!user) return next(new AppError("هذا الرقم غير مسجل لدينا", 404));

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60000);
    await user.save();

    await sendEmail({
        email: user.email,
        subject: 'كود تسجيل الدخول - Noor Store',
        message: `كود الدخول الخاص بك هو: ${otp}`
    });

    res.status(200).json({ success: true, message: "تم إرسال كود التحقق إلى بريدك الإلكتروني" });
});



export const verifyOTP = catchError(async (req: Request, res: Response, next: NextFunction) => {
    const { phoneNumber, otp } = req.body;

    const user = await User.findOne({
        phoneNumber,
        otp,
        otpExpires: { $gt: new Date() }
    });

    if (!user) return next(new AppError("الكود غير صحيح أو انتهت صلاحيته", 400));

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();


    const token = jwt.sign(
        { userId: user._id, role: (user as any).role || 'user' },
        process.env.JWT_KEY || 'secret_key',
        { expiresIn: '30d' }
    );


    res.cookie('noorToken', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none', 
        maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
        success: true,
        message: "تم التحقق بنجاح ✅",
        token,
        user
    });
});
