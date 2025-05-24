import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://root:cjh13862968098@129.204.5.155:27017/ccts?authSource=admin';

async function testConnection() {
  console.log('MongoDB 连接测试开始...');
  console.log('Node.js 版本:', process.version);
  console.log('Mongoose 版本:', mongoose.version);
  
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount < maxRetries) {
    try {
      console.log(`\n尝试连接MongoDB (第 ${retryCount + 1} 次尝试)...`);
      console.log('使用的连接字符串:', MONGODB_URI);
      
      const options = {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        heartbeatFrequencyMS: 2000,
        family: 4
      };
      
      console.log('连接选项:', JSON.stringify(options, null, 2));
      
      await mongoose.connect(MONGODB_URI, options);
      
      console.log('连接成功！');
      
      const db = mongoose.connection.db;
      
      const collections = await db.listCollections().toArray();
      console.log('数据库中的集合：', collections.map(c => c.name));
      
      const scenesCollection = db.collection('scenes');
      const scenesCount = await scenesCollection.countDocuments();
      console.log('scenes集合中的文档数量:', scenesCount);
      
      await mongoose.connection.close();
      console.log('连接已关闭');
      process.exit(0);
      
    } catch (error) {
      console.error(`\n第 ${retryCount + 1} 次尝试失败：`, error);
      retryCount++;
      
      if (retryCount === maxRetries) {
        console.error('\n达到最大重试次数，测试失败');
        process.exit(1);
      }
      
      console.log(`等待 5 秒后重试...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

testConnection(); 