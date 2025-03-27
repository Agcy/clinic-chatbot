import { SpeechClient } from '@google-cloud/speech';
import { defineEventHandler, readBody } from 'h3';
import path from 'path';

// 设置 Google 应用凭证环境变量
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(process.cwd(), 'assets/gmail-login-421617-f23ce8ba70b9.json');

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    if (!body) {
        return { error: '请求体为空' };
    }

    const { audioData, mimeType } = body;

    // 根据mimeType设置encoding
    const encoding = mimeType === 'audio/webm' ? 'WEBM_OPUS' :
        mimeType === 'audio/ogg' ? 'OGG_OPUS' :
            mimeType === 'audio/mp4' ? 'MP4' : 'LINEAR16';

    const config = {
        encoding: encoding,
        sampleRateHertz: 48000,
        languageCode: "yue-Hant-HK"
    };

    // 创建 Google Cloud Speech-to-Text 客户端
    const client = new SpeechClient();

    const audio = {
        content: audioData // 使用前端传来的 Base64 音频数据
    };

    const request = {
        audio: audio,
        config: config
    };

    try {
        // 调用 Google Cloud Speech-to-Text API 进行语音识别
        const [response] = await client.recognize(request);
        const transcription = response.results
            ?.map(result => result.alternatives[0].transcript)
            .join('\n');

        return transcription || "No speech detected.";
    } catch (error) {
        console.error('语音识别出错:', error);
        return { error: `Speech-to-Text API error: ${error.message}` };
    }
});