/**
 * @fileoverview MongoDB 数据库连接配置
 */

import mongoose from 'mongoose';

/**
 * 连接 MongoDB 数据库
 * @returns {Promise} 返回连接 Promise
 */
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI_NEW);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}; 