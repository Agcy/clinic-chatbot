import { defineEventHandler, readBody } from 'h3';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';

process.env.GOOGLE_APPLICATION_CREDENTIALS = '/Users/jiahanchen/Desktop/final project/code/clinic-chatbot/assets/gmail-login-421617-f23ce8ba70b9.json';

const client = new TextToSpeechClient();

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    // console.log('Received request with body:', body);

    // 验证请求体中的消息是否有效
    if (!body || typeof body.text !== 'string' || body.text.trim() === '') {
        console.error('Invalid text provided');
        return { error: 'Invalid text provided' };
    }

    const text = body.text;

    try {
        // console.log('Sending request to Google Text-to-Speech API with text:', text);
        const request = {
            input: { text: text },
            voice: { languageCode: 'yue-HK', ssmlGender: 'NEUTRAL' },
            audioConfig: { audioEncoding: 'MP3' },
        };

        const [response] = await client.synthesizeSpeech(request);

        // console.log('Received response from Google Text-to-Speech API:', response);

        // Save the generated binary audio content to a local file
        await writeFile('output.mp3', response.audioContent, 'binary');
        // console.log('Audio content written to file: output.mp3');

        return { audioContent: response.audioContent.toString('base64') };
    } catch (error) {
        console.error('Error calling Google Text-to-Speech API:', error);
        return { error: `Google Text-to-Speech API error: ${error.message}` };
    }
});