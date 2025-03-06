/**
 * @fileoverview MongoDB 数据库连接工具
 */

import mongoose from 'mongoose';

let isConnected = false;

/**
 * 连接到 MongoDB 数据库
 */
export const connectDB = async () => {
  if (isConnected) {
    console.log('已经连接到数据库');
    return;
  }

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log('MongoDB 连接成功！');
  } catch (error) {
    console.error('MongoDB 连接失败:', error);
    isConnected = false;
    throw error;
  }
};

/**
 * 获取数据库连接状态
 */
export const getConnectionStatus = () => {
  return isConnected;
}; 