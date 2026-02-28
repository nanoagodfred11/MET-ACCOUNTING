import mongoose from 'mongoose';

const isProd = process.env.NODE_ENV === 'production';
const MONGODB_URI = process.env.MONGODB_URI || (isProd ? (() => { throw new Error('MONGODB_URI env var is required in production'); })() : 'mongodb://localhost:27017/met_accounting');

export async function connectDB(): Promise<void> {
  // Use Mongoose's own readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  if (mongoose.connection.readyState >= 1) return;

  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Ensure connection on import
connectDB();
