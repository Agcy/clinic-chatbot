import { MongoClient } from 'mongodb';

/**
 * 获取当前使用的场景和角色URL
 */
export default defineEventHandler(async (event) => {
  let client;
  try {
    // 连接MongoDB
    client = new MongoClient(process.env.MONGODB_URI || '');
    await client.connect();
    console.log('MongoDB连接成功');
    
    // 获取数据库和集合
    const db = client.db('test');
    const collection = db.collection('scenes');
    
    // 获取场景卡片数据
    const sceneCard = await collection.findOne({});
    console.log('数据库中的场景卡片数据:', sceneCard);
    
    // 返回结果
    return {
      fromDatabase: {
        sceneUrl: sceneCard?.scene_url_3d || null,
        characterUrl: sceneCard?.charactor_url_3d || null,
        _id: sceneCard?._id?.toString() || null
      },
      message: '查询成功'
    };
  } catch (error: any) {
    console.error('查询场景URL失败:', error);
    return {
      error: `查询失败: ${error.message}`,
      fromDatabase: null
    };
  } finally {
    // 确保关闭数据库连接
    if (client) {
      await client.close();
      console.log('MongoDB连接已关闭');
    }
  }
}); 