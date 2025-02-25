import { defineEventHandler, readBody } from 'h3';
import { GoogleGenerativeAI } from "@google/generative-ai";

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    // 验证请求体中的消息是否有效
    if (!body || typeof body.message!== 'string' || body.message.trim() === '') {
        return { error: 'Invalid message provided' };
    }

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
        return { error: 'Google API key is missing' };
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = body.message;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        return { response: responseText };
    } catch (error) {
        console.error('调用 Gemini API 出错:', error);
        return { error: `Gemini API error: ${error.message}` };
    }
});