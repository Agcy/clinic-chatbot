import OpenAI from "openai";

const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY, // Ensure you set this environment variable
});

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    // console.log('Received request with message:', body)

    // Validate the request body
    if (!body || typeof body.message !== 'string' || body.message.trim() === '') {
        return { error: 'Invalid message provided' };
    }

    const prompt = body.message;

    try {
        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "deepseek-chat",
        });

        // console.log('Received response from DeepSeek API:', completion);
        const responseText = completion.choices[0].message.content;
        return { response: responseText };
    } catch (error) {
        console.error('Error calling DeepSeek API:', error);
        return { error: `DeepSeek API error: ${error.message}` };
    }
});