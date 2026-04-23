import { Request, Response } from 'express';
import User from '../../MongoDB/Schemas/user.model';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
// 1. إعداد مرسل البريد (Nodemailer Transporter)
dotenv.config();
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS, 
  },
});

// تفعيل قراءة ملف الـ .env


// 2. دالة مساعدة لإرسال الإيميل
const sendOtpEmail = async (email: string, otp: string) => {
  const mailOptions = {
    from: `"Al Majd Server" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'كود التحقق الخاص بك - المجد',
    html: `
      <div style="font-family: sans-serif; text-align: center; border: 1px solid #eee; padding: 20px;">
        <h2 style="color: #333;">مرحباً بك في نظام المجد</h2>
        <p>استخدم الكود التالي لإتمام عملية تسجيل الدخول:</p>
        <h1 style="color: #4CAF50; font-size: 40px; letter-spacing: 5px;">${otp}</h1>
        <p style="color: #777;">صلاحية هذا الكود 10 دقائق فقط.</p>
      </div>
    `,
  };
  return transporter.sendMail(mailOptions);
};

/**
 * @desc    إنشاء حساب جديد مع رفع صورة وإرسال OTP للإيميل
 */

export const signup = async (req: any, res: any) => {
  try {
    const { fullName, phoneNumber, email, password } = req.body;

    if (!fullName || !phoneNumber || !email) {
      return res.status(400).json({ success: false, message: "الاسم ورقم الهاتف والإيميل مطلوبون" });
    }

    const userExists = await User.findOne({ $or: [{ phoneNumber }, { email }] });
    if (userExists) {
      return res.status(400).json({ success: false, message: "الرقم أو البريد الإلكتروني مسجل بالفعل" });
    }

    // رفع الصورة لـ Cloudinary
    let profilePicData = { public_id: "", url: "" };
    if (req.file) {
      const uploadRes = await cloudinary.uploader.upload(req.file.path, {
        folder: "users_avatars",
      });
      profilePicData = {
        public_id: uploadRes.public_id,
        url: uploadRes.secure_url,
      };
    }

    const newUser = new User({
      fullName,
      phoneNumber,
      email,
      password,
      profilePic: profilePicData,
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    newUser.set('otp', otp);
    newUser.set('otpExpires', new Date(Date.now() + 10 * 60000));
    
    await newUser.save();

    // إرسال الكود للإيميل
    await sendOtpEmail(email, otp);

    console.log(`✅ Signup OTP sent to ${email}: ${otp}`);
    return res.status(201).json({ success: true, message: "تم إنشاء الحساب، تفقد بريدك الإلكتروني لتفعيل الكود" });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    تسجيل الدخول وإرسال OTP للإيميل
 */
export const signin = async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: "يرجى إدخال رقم الهاتف" });
    }

    const user = await User.findOne({ phoneNumber });
    if (!user || !user.email) {
      return res.status(404).json({ success: false, message: "هذا الرقم غير مسجل أو لا يملك بريداً إلكترونياً" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.set('otp', otp);
    user.set('otpExpires', new Date(Date.now() + 10 * 60000));
    await user.save();

    // إرسال الكود لإيميل المستخدم المسجل
    await sendOtpEmail(user.email, otp);

    console.log(`✅ Login OTP sent to ${user.email}: ${otp}`);

    res.status(200).json({ success: true, message: "تم إرسال كود التحقق إلى بريدك الإلكتروني" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    التحقق من الكود وإعطاء التوكن والكوكي
 */
export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({ success: false, message: "يرجى إرسال رقم الهاتف والكود" });
    }

    const user = await User.findOne({
      phoneNumber,
      otp,
      otpExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "الكود غير صحيح أو انتهت صلاحيته" });
    }

    user.isVerified = true;
    user.set('otp', undefined);
    user.set('otpExpires', undefined);
    await user.save();

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '30d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      message: "تم التحقق بنجاح ✅",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        email: user.email,
        profilePic: user.profilePic?.url,
        isVerified: user.isVerified
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
