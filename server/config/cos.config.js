/**
 * 腾讯云COS配置
 */
export const cosConfig = {
  SecretId: process.env.TENCENT_SCERET_ID,
  SecretKey: process.env.TENCENT_SCERET_KEY,
  BaseUrl: 'https://ccts-1312877935.cos.ap-hongkong.myqcloud.com',
  ModelPath: '/model',  // 模型存储的路径
  ImagePath: '/img'     // 图片存储的路径
}; 