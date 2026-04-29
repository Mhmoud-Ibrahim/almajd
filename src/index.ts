import express, { Application, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import connectDB from './MongoDB/Schemas/connectDB';
import { AppError } from './utils/appError';
import globalErrorHandler from './middleware/globalError';
import authRouter from './modules/auth/auth.routes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;



app.use(express.json()); 
app.use(cookieParser());

app.use(cors({
  origin:[
    "http://localhost:5173",
    "http://localhost:3000",
    "https://almajd-front.vercel.app", 
    "https://api.cloudinary.com"
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  credentials: true, 
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

connectDB();
app.use(cookieParser());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

app.use('/uploads', express.static('uploads'));
app.use('/auth',authRouter)


app.get('/', (req: Request, res: Response) => res.send('OK - API is running'));

app.all(/(.*)/, (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Route ${req.originalUrl} Not Found`, 404));
});

app.use(globalErrorHandler);
app.listen(PORT, () => {
  console.log(`🚀 server is running on : http://localhost:${PORT}`);
});
