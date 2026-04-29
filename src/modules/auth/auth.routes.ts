
import { getMe, logout, signin, signup } from "./auth.controller.js";
import { authenticate } from "../../middleware/authintecate.js";
import { Router } from 'express';
import passport from 'passport';
import * as authController from './auth.controller.js';
const authRouter = Router();

authRouter.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
authRouter.get('/google/callback', 
    passport.authenticate('google', { session: false, failureRedirect: 'https://vercel.app' }),
    authController.googleAuthSuccess
);
authRouter.post('/signup', signup);
authRouter.post('/signin', signin);
authRouter.post('/logout', logout);
authRouter.get('/me', authenticate, getMe);
// --- Forgot & Reset Password Routes ---
authRouter.post('/forgotPassword', authController.forgotPassword); // لإرسال الإيميل
authRouter.patch('/resetPassword', authController.resetPassword); // لتغيير الباسورد الفعلي


export default authRouter;
