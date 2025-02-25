import { defineEventHandler, readBody } from 'h3';
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.ALIYUN_BAILIAN_API_KEY, // 确保设置了环境变量
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
});

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    // console.log('Received request with body:', body);

    // 验证请求体中的消息是否有效
    if (!body || typeof body.message !== 'string' || body.message.trim() === '') {
        console.error('Invalid message provided');
        return { error: 'Invalid message provided' };
    }

    const prompt = body.message;

    try {
        // console.log('Sending request to Bailian API with prompt:', prompt);
        const completion = await openai.chat.completions.create({
            model: "qwen-plus", // 使用 qwen-plus 模型
            messages: [
                { role: "system", content: "你是一个病人，你最近出现了头晕、头痛的症状，并且曾经历过一次交通意外。医生刚刚通过 MRI 发现你的脑部有一个血管瘤。你对自己的健康状况感到担忧，并且想要弄清楚医生的诊断结果。你可能会问医生更多关于病情、最坏情况和治疗方案的问题（如：“这个瘤会不会爆裂？”、“最坏的可能是什么？”）。请用粤语与医生交谈，并尽可能表现出真实病人的反应，例如焦虑、疑惑或希望得到更多信息。不要脱离角色，现在请开始你的第一句话。" },
                { role: "user", content: prompt }
            ],
        });

        // console.log('Received response from Bailian API:', completion);
        const responseText = completion.choices[0].message.content;
        // console.log('Returning response:', responseText)
        return { response: responseText };
    } catch (error) {
        console.error('Error calling DeepSeek API:', error);
        return { error: `Bailian API error: ${error.message}` };
    }
});