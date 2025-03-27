import { MongoClient } from 'mongodb';

/**
 * 更新场景卡片数据
 */
export default defineEventHandler(async (event) => {
  let client;
  try {
    // 获取请求体
    const body = await readBody(event);
    const { sceneUrl, characterUrl } = body;

    if (characterUrl === undefined) {
      throw new Error('缺少必要参数: characterUrl');
    }

    // 连接MongoDB
    client = new MongoClient(process.env.MONGODB_URI || '');
    await client.connect();
    
    // 获取数据库和集合
    const db = client.db('test');
    const collection = db.collection('scenes');
    
    // 更新字段
    const updateData: Record<string, any> = {
      updated_at: new Date()
    };
    
    // 仅在提供了值时更新
    if (sceneUrl !== undefined) {
      updateData.scene_url_3d = sceneUrl;
    }
    
    if (characterUrl !== undefined) {
      updateData.charactor_url_3d = characterUrl;
    }
    
    // 先查询是否存在文档
    const existingDoc = await collection.findOne({});
    
    let updatedDoc;
    if (existingDoc) {
      // 更新文档
      const updateResult = await collection.updateOne(
        { _id: existingDoc._id },
        { $set: updateData }
      );
      console.log('更新结果:', updateResult);
      
      // 再次查询获取更新后的文档
      updatedDoc = await collection.findOne({ _id: existingDoc._id });
    } else {
      // 创建新文档
      updateData.scene_url_3d = sceneUrl || '';
      updateData.charactor_url_3d = characterUrl;
      updateData.created_at = new Date();
      
      const insertResult = await collection.insertOne(updateData);
      console.log('插入结果:', insertResult);
      
      // 获取新插入的文档
      updatedDoc = await collection.findOne({ _id: insertResult.insertedId });
    }
    
    // 检查结果
    if (!updatedDoc) {
      throw new Error('更新或创建文档失败');
    }
    
    return {
      message: '场景卡片数据更新成功',
      data: {
        sceneUrl: updatedDoc.scene_url_3d || '',
        characterUrl: updatedDoc.charactor_url_3d || ''
      }
    };
  } catch (error: any) {
    console.error('更新场景卡片数据失败:', error);
    throw createError({
      statusCode: 500,
      message: `更新场景卡片数据失败: ${error.message}`
    });
  } finally {
    // 确保关闭数据库连接
    if (client) {
      await client.close();
      console.log('MongoDB连接已关闭');
    }
  }
}); 