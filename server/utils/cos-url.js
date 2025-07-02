/**
 * 腾讯云COS URL工具函数
 */
import { cosConfig } from '../config/cos.config';

/**
 * 生成COS资源的完整URL
 * @param {string} path - 资源路径，例如：'/model/doctor.glb'
 * @returns {string} 完整的COS URL
 */
export const getCosUrl = (path) => {
  // 确保path以'/'开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${cosConfig.BaseUrl}${normalizedPath}`;
};

/**
 * 生成3D模型的COS URL
 * @param {string} modelName - 模型文件名，例如：'doctor.glb'
 * @returns {string} 完整的模型COS URL
 */
export const getModelUrl = (modelName) => {
  return getCosUrl(`${cosConfig.ModelPath}/${modelName}`);
};

/**
 * 生成图片的COS URL
 * @param {string} imageName - 图片文件名，例如：'brain_surgery_001.png'
 * @returns {string} 完整的图片COS URL
 */
export const getImageUrl = (imageName) => {
  return getCosUrl(`${cosConfig.ImagePath}/${imageName}`);
}; 