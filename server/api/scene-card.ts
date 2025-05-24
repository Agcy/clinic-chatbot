import { MongoClient } from 'mongodb';

/**
 * 获取场景卡片数据
 * @returns 包含场景和角色URL的对象
 */
export default defineEventHandler(async (event) => {
  let client;
  try {
    console.log('正在获取场景卡片数据...');
    
    // 获取查询参数
    const query = getQuery(event);
    const sceneId = query.sceneId as string;
    
    // 连接MongoDB
    client = new MongoClient(process.env.MONGODB_URI_NEW || '');
    await client.connect();
    
    // 获取数据库和集合
    const db = client.db('test'); // 修改为正确的数据库名
    const collection = db.collection('scenes'); // 修改为正确的集合名
    
    // 查询条件
    const filter = sceneId ? { scene_id: sceneId } : {};
    console.log('查询条件:', filter);
    
    // 获取场景卡片数据
    const sceneCard = await collection.findOne(filter);
    console.log('数据库查询结果:', sceneCard);
    
    if (!sceneCard) {
      // 如果没有找到对应的场景卡片数据
      console.log('未找到场景卡片数据，使用默认数据');
      
      // 从scene_json.json文件中获取数据
      try {
        // 尝试从JSON文件中读取数据
        if (sceneId) {
          // 如果有指定sceneId，则尝试查找对应的场景
          const fs = require('fs');
          const path = require('path');
          const filePath = path.join(process.cwd(), 'public', 'prompts', 'scene_json.json');
          
          if (fs.existsSync(filePath)) {
            const sceneJsonContent = fs.readFileSync(filePath, 'utf8');
            const sceneJson = JSON.parse(sceneJsonContent);
            
            // 查找指定的场景
            const sceneData = sceneJson.find((item: any) => item.scene_id === sceneId);
            
            if (sceneData) {
              console.log('从JSON文件中找到场景数据:', sceneData);
              
              // 将数据插入到数据库中
              await collection.insertOne({
                ...sceneData,
                created_at: new Date(),
                updated_at: new Date()
              });
              
              return {
                sceneUrl: sceneData.scene_url_3d || '',
                characterUrl: sceneData.charactor_url_3d || '/model/doctor.glb'
              };
            }
          }
        }
      } catch (jsonError) {
        console.error('读取JSON文件失败:', jsonError);
      }
      
      // 如果仍未找到数据，则使用默认值
      const defaultData = {
        scene_url_3d: '', // 空场景URL
        charactor_url_3d: '/model/doctor.glb',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const result = await collection.insertOne(defaultData);
      console.log('初始化默认数据:', result);
      
      return {
        sceneUrl: '',
        characterUrl: '/model/doctor.glb'
      };
    }
    
    console.log('返回场景数据:', {
      sceneUrl: sceneCard.scene_url_3d || '',
      characterUrl: sceneCard.charactor_url_3d || '/model/doctor.glb'
    });
    
    // 返回场景和角色URL
    return {
      sceneUrl: sceneCard.scene_url_3d || '', // 确保为空字符串而不是null或undefined
      characterUrl: sceneCard.charactor_url_3d || '/model/doctor.glb' // 提供默认值
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