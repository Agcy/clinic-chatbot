import { connectDB } from '../utils/db';

export default defineNitroPlugin(async () => {
  try {
    await connectDB();
  } catch (error) {
    console.error('无法在启动时连接到数据库:', error);
  }
}); 