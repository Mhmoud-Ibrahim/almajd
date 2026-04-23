import express from 'express';

import { protect } from '../../middleware/authintecate';
import { upload } from '../../middleware/multer'; // تأكد من إنشاء هذا الملف
import { signin, signup, verifyOTP } from './auth.controler';

const router = express.Router();

// 1. راوت التسجيل: يحتاج 'upload' لاستقبال الصورة
router.post('/signup', upload.single('profilePic'), signup);

// 2. راوت تسجيل الدخول: لا يحتاج لرفع ملفات (نصوص فقط)
router.post('/signin', signin);

// 3. راوت التحقق من الكود
router.post('/verify-otp', verifyOTP);

// 4. راوت بياناتي (محمي)
router.get('/me', protect, (req: any, res) => {
  res.status(200).json({ success: true, user: req.user });
});

export default router;
