/**
 * @fileoverview MongoDB 连接插件
 */

import mongoose from 'mongoose';

export default defineNitroPlugin(async () => {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // 超时时间设置为 5 秒
      socketTimeoutMS: 45000, // Socket 超时时间
    });
    console.log('MongoDB 连接成功！');
  } catch (error) {
    console.error('MongoDB 连接失败:', error);
    process.exit(1);
  }
}); 