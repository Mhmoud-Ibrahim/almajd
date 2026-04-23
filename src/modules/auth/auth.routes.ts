import express from 'express';
import { upload } from '../../middleware/multer'; // تأكد من المسار والامتداد
import { authenticate } from '../../middleware/authintecate';
import { signin, signup, verifyOTP } from './auth.controler.js';

const  authRouter= express.Router();
authRouter.post('/signup', upload.single('profilePic'), signup);
authRouter.post('/signin', signin);
authRouter.post('/verify-otp', verifyOTP);
authRouter.get('/me', authenticate, (req: any, res) => {
  res.status(200).json({ 
    success: true, 
    user: req.user 
  });
});

export default authRouter;
