import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  try {
    const fullURI = `${process.env.MONGODB_URL}/${DB_NAME}`;
    console.log("📌 Connection string:", fullURI); // Debug print
    const connectionInstance = await mongoose.connect(fullURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB connected at host: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
