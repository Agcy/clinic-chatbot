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
    // console.log('已经连接到数据库');
    return;
  }

  // 在尝试连接前打印 MONGODB_URI
  const mongoURI = process.env.MONGODB_URI_NEW;
      // console.log(`尝试连接到 MongoDB: ${mongoURI}`);

  if (!mongoURI) {
    console.error('错误: MONGODB_URI 环境变量未设置。');
    throw new Error('MONGODB_URI 环境变量未设置。');
  }

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoURI, {
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