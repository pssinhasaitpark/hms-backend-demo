import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config(); 

const dbURI = process.env.MONGODB_URI;

export const connectDB = async () => {
  try {
    await mongoose.connect(dbURI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✅ MongoDB connected...');
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  }
};