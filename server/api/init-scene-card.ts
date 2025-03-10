import { MongoClient } from 'mongodb';

/**
 * 初始化场景卡片数据
 */
export default defineEventHandler(async (event) => {
  try {
    // 连接MongoDB
    const client = new MongoClient(process.env.MONGODB_URI || '');
    await client.connect();
    
    // 获取数据库和集合
    const db = client.db('clinic-chatbot');
    const collection = db.collection('scene_card');
    
    // 检查是否已存在数据
    const existingData = await collection.findOne({});
    if (existingData) {
      await client.close();
      return {
        message: '场景卡片数据已存在',
        data: existingData
      };
    }
    
    // 创建测试数据
    const testData = {
      scene_url_3d: '/model/operating-room.fbx',
      charactor_url_3d: '/model/doctor.glb',
      created_at: new Date(),
      updated_at: new Date()
    };
    
    // 插入数据
    const result = await collection.insertOne(testData);
    
    // 关闭数据库连接
    await client.close();
    
    return {
      message: '场景卡片数据初始化成功',
      data: testData,
      insertedId: result.insertedId
    };
  } catch (error) {
    console.error('初始化场景卡片数据失败:', error);
    throw createError({
      statusCode: 500,
      message: '初始化场景卡片数据失败'
    });
  }
}); 