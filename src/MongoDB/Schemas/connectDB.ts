import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'node:dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config();

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI|| "";
    const conn = await mongoose.connect(mongoURI);
    console.log(`✅ Connected to database successfully: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`❌ failed: ${error.message}`);
  }
};

export default connectDB;
