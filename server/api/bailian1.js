import { defineEventHandler, readBody } from 'h3';
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.ALIYUN_BAILIAN_API_KEY,
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
});

// 剧本上下文（调整为更自然的医疗对话模式）
const MEDICAL_SCRIPT = `
[病人信息]
患者：唐先生，30岁
症状：交通意外后持续头晕头痛，无抽搐史
诊断：左侧深部脑血管壁变薄形成血管瘤
风险：年破裂概率2-3%，破裂可致命
治疗方案：高风险开颅手术

[最近对话记录]
脑外科医生：MRI显示你的血管壁已经非常薄了，建议尽快决定是否手术
病人：手术成功率大概多少？
脑外科医生：这个位置的手术成功率大约70%，但若成功可根治
病人：如果不做手术最坏情况会怎样？
脑外科医生：血管瘤可能在任何时间破裂，会导致脑出血甚至危及生命
`.trim();

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);

        // 增强输入验证
        if (!body?.message?.trim() || body.message.length > 200) {
            console.warn('Invalid input:', body);
            return { error: '请提出与病情相关的医疗咨询（最多200字）' };
        }

        // 结构化系统提示
        const systemPrompt = [
            "你扮演30岁男性患者（使用粤语），具有以下特征：", // 粤语用户可在此处添加语言提示
            "- 仅有高中医学常识",
            "- 对手术风险存在焦虑",
            "- 会提出具体但有限的专业问题",
            "- 回复简洁（1-2句话）",
            "根据以下医疗记录应答，不要编造专业知识：\n" + MEDICAL_SCRIPT
        ].join('\n');

        const completion = await openai.chat.completions.create({
            model: "qwen-plus",
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: `[患者提问] ${body.message.trim()}（请以患者身份用口语回复）`
                }
            ],
            temperature: 0.5,  // 降低随机性
            max_tokens: 100,   // 适当加长回复
            stop: ["\n手术", "\n医生"], // 防止角色错位
            repetition_penalty: 1.2
        });

        // 清理响应内容
        let response = completion.choices[0].message.content
            .replace(/医生\s*:/gi, '')  // 去除可能生成的角色标记
            .replace(/[\n]+/g, ' ')
            .substring(0, 150);

        return { response };

    } catch (error) {
        console.error('Error calling DeepSeek API:', error);
        return { error: `Bailian API error: ${error.message}` };
    }
});