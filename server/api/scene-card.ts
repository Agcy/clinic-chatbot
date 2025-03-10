import { MongoClient } from 'mongodb';

/**
 * 获取场景卡片数据
 * @returns 包含场景和角色URL的对象
 */
export default defineEventHandler(async (event) => {
  let client;
  try {
    // 连接MongoDB
    client = new MongoClient(process.env.MONGODB_URI || '');
    await client.connect();
    console.log('MongoDB连接成功');
    
    // 获取数据库和集合
    const db = client.db('clinic-chatbot');
    const collection = db.collection('scene_card');
    
    // 获取场景卡片数据
    const sceneCard = await collection.findOne({});
    console.log('查询结果:', sceneCard);
    
    if (!sceneCard) {
      // 如果没有数据，尝试初始化
      const defaultData = {
        scene_url_3d: '/model/operating-room.fbx',
        charactor_url_3d: '/model/doctor.glb',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const result = await collection.insertOne(defaultData);
      console.log('初始化默认数据:', result);
      
      return {
        sceneUrl: defaultData.scene_url_3d,
        characterUrl: defaultData.charactor_url_3d
      };
    }
    
    // 返回场景和角色URL
    return {
      sceneUrl: sceneCard.scene_url_3d,
      characterUrl: sceneCard.charactor_url_3d
    };
  } catch (error: any) {
    console.error('获取场景卡片数据失败:', error);
    throw createError({
      statusCode: 500,
      message: `获取场景卡片数据失败: ${error.message}`
    });
  } finally {
    // 确保关闭数据库连接
    if (client) {
      await client.close();
      console.log('MongoDB连接已关闭');
    }
  }
}); 