import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import connectDB from './MongoDB/Schemas/connectDB';
import authRouter from './modules/auth/auth.routes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(express.json()); 
app.use(cookieParser());

app.use(cors({
  origin: 'http://localhost:3000', 
  credentials: true 
}));
app.use('/auth',authRouter)
app.get('/', (req, res) => {
  res.send('it is working good mahmoud');
});


app.listen(PORT, () => {
  console.log(`🚀 server is running on : http://localhost:${PORT}`);
});
