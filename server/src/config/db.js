import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "";

export async function connectDB() {
  if (!MONGODB_URI) {
    console.warn("⚠️  MONGODB_URI not set. Using in-memory database simulation.");
    console.warn("To use MongoDB, set MONGODB_URI in .env");
    console.warn("Example: mongodb+srv://user:password@cluster.mongodb.net/marketpulse");
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✓ Connected to MongoDB");
  } catch (error) {
    console.error("✗ MongoDB connection error:", error.message);
    process.exit(1);
  }
}

export function isDBConnected() {
  return mongoose.connection.readyState === 1;
}
