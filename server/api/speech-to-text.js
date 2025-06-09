import { defineEventHandler, readBody } from 'h3';
import WebSocket from 'ws';
import gzip from 'zlib';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

// 协议常量
const PROTOCOL_VERSION = 0b0001;
const FULL_CLIENT_REQUEST = 0b0001;
const AUDIO_ONLY_REQUEST = 0b0010;
const FULL_SERVER_RESPONSE = 0b1001;
const SERVER_ERROR_RESPONSE = 0b1111;
const POS_SEQUENCE = 0b0001;
const NEG_WITH_SEQUENCE = 0b0011;
const JSON_SERIALIZATION = 0b0001;
const GZIP_COMPRESSION = 0b0001;

// 辅助函数
function generateHeader(messageType = FULL_CLIENT_REQUEST, flags = 0, serialMethod = JSON_SERIALIZATION, compression = GZIP_COMPRESSION) {
    const header = Buffer.alloc(4);
    header[0] = (PROTOCOL_VERSION << 4) | 0x01; // version + header_size
    header[1] = (messageType << 4) | flags;     // message_type + flags
    header[2] = (serialMethod << 4) | compression; // serialization + compression
    header[3] = 0x00; // reserved
    return header;
}

function generateSequenceBytes(sequence) {
    const buffer = Buffer.alloc(4);
    buffer.writeInt32BE(sequence, 0);
    return buffer;
}

function parseResponse(data) {
    try {
        if (data.length < 8) return null;
        
        const messageType = (data[1] & 0xF0) >> 4;
        const flags = data[1] & 0x0F;
        const compression = data[2] & 0x0F;
        const serialization = (data[2] & 0xF0) >> 4;
        
        let payload = data.slice(4);
        
        // 如果有序列号
        if (flags & 0x01) {
            payload = payload.slice(4);
        }
        
        // 读取payload大小和内容
        if (messageType === FULL_SERVER_RESPONSE) {
            const payloadSize = payload.readInt32BE(0);
            let payloadData = payload.slice(4, 4 + payloadSize);
            
            // 解压缩
            if (compression === GZIP_COMPRESSION) {
                payloadData = gzip.gunzipSync(payloadData);
            }
            
            // 反序列化
            if (serialization === JSON_SERIALIZATION) {
                return {
                    isLast: (flags & 0x02) !== 0,
                    data: JSON.parse(payloadData.toString('utf8'))
                };
            }
        }
        
        return null;
    } catch (error) {
        console.error('解析响应失败:', error);
        return null;
    }
}

// 音频格式转换 - 将WebM/OGG等格式转换为WAV
async function convertToWav(audioBuffer, inputFormat) {
    try {
        // 这里简化处理，实际项目中可能需要使用ffmpeg等工具
        // 目前假设浏览器发送的是可用格式，或者在前端进行转换
        return audioBuffer;
    } catch (error) {
        console.error('音频格式转换失败:', error);
        throw error;
    }
}

// 豆包STT客户端
class DoubaoSTTClient {
    constructor() {
        this.wsUrl = 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel';
        this.appKey = process.env.DOUBAO_APP_KEY;
        this.accessKey = process.env.DOUBAO_ACCESS_KEY;
        
        if (!this.appKey || !this.accessKey) {
            throw new Error('豆包API密钥未配置，请检查环境变量DOUBAO_APP_KEY和DOUBAO_ACCESS_KEY');
        }
    }
    
    async recognizeSpeech(audioData) {
        return new Promise(async (resolve, reject) => {
            try {
                const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const connectId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                // 设置请求头
                const headers = {
                    "X-Api-Resource-Id": "volc.bigasr.sauc.duration",
                    "X-Api-Access-Key": this.accessKey,
                    "X-Api-App-Key": this.appKey,
                    "X-Api-Request-Id": requestId,
                    "X-Api-Connect-Id": connectId
                };
                
                // console.log('🔗 开始连接豆包STT服务...');
                
                // 连接WebSocket
                const ws = new WebSocket(this.wsUrl, {
                    headers: headers
                });
                
                let finalResult = '';
                let isConnected = false;
                
                ws.on('open', async () => {
                    try {
                        // console.log('✅ 豆包STT WebSocket连接成功');
                        isConnected = true;
                        
                        // 构建初始请求
                        const initRequest = {
                            user: { uid: "web_user" },
                            audio: {
                                format: "wav",
                                sample_rate: 16000,
                                bits: 16,
                                channel: 1,
                                codec: "raw"
                            },
                            request: {
                                model_name: "bigmodel",
                                enable_punc: true
                            }
                        };
                        
                        const payloadJson = JSON.stringify(initRequest);
                        const payloadBytes = Buffer.from(payloadJson, 'utf8');
                        const compressedPayload = gzip.gzipSync(payloadBytes);
                        
                        // 构建完整的初始请求包
                        const header = generateHeader(FULL_CLIENT_REQUEST, POS_SEQUENCE);
                        const sequence = generateSequenceBytes(1);
                        const payloadSize = Buffer.alloc(4);
                        payloadSize.writeInt32BE(compressedPayload.length, 0);
                        
                        const initMessage = Buffer.concat([header, sequence, payloadSize, compressedPayload]);
                        
                        // 发送初始请求
                        ws.send(initMessage);
                        // console.log('📤 发送初始请求到豆包STT');
                        
                    } catch (error) {
                        console.error('发送初始请求失败:', error);
                        reject(error);
                    }
                });
                
                let audioSent = false;
                let allAudioSent = false;
                
                ws.on('message', async (data) => {
                    try {
                        const response = parseResponse(data);
                        if (response && response.data) {
                            // console.log('📥 收到豆包STT响应:', response.data);
                            
                            // 收到初始响应后，发送音频数据（只发送一次）
                            if (!audioSent && audioData) {
                                audioSent = true;
                                try {
                                    // 确保音频数据是Buffer格式
                                    const audioBuffer = Buffer.isBuffer(audioData) ? audioData : Buffer.from(audioData, 'base64');
                                    
                                    // 分片发送音频数据
                                    const chunkSize = 6400; // 约200ms的16kHz 16位单声道音频
                                    let sequence = 2;
                                    
                                    for (let offset = 0; offset < audioBuffer.length; offset += chunkSize) {
                                        const chunk = audioBuffer.slice(offset, offset + chunkSize);
                                        const isLast = offset + chunkSize >= audioBuffer.length;
                                        
                                        if (isLast) sequence = -sequence; // 负数表示最后一包
                                        
                                        const compressedChunk = gzip.gzipSync(chunk);
                                        const audioHeader = generateHeader(
                                            AUDIO_ONLY_REQUEST, 
                                            isLast ? NEG_WITH_SEQUENCE : POS_SEQUENCE
                                        );
                                        const seqBytes = generateSequenceBytes(sequence);
                                        const chunkSize_bytes = Buffer.alloc(4);
                                        chunkSize_bytes.writeInt32BE(compressedChunk.length, 0);
                                        
                                        const audioMessage = Buffer.concat([
                                            audioHeader, 
                                            seqBytes, 
                                            chunkSize_bytes, 
                                            compressedChunk
                                        ]);
                                        
                                        ws.send(audioMessage);
                                        // console.log(`📤 发送音频包 ${Math.abs(sequence)} ${isLast ? '(最后一包)' : ''}`);
                                        
                                        if (!isLast) {
                                            sequence++;
                                            // 控制发送速度
                                            await new Promise(resolve => setTimeout(resolve, 50));
                                        } else {
                                            allAudioSent = true;
                                            // console.log('✅ 所有音频数据发送完成，等待最终识别结果...');
                                            break;
                                        }
                                    }
                                } catch (audioError) {
                                    console.error('发送音频数据失败:', audioError);
                                    reject(audioError);
                                }
                            }
                            
                            // 处理识别结果
                            if (response.data.result && response.data.result.text) {
                                finalResult = response.data.result.text;
                                // console.log('🎯 识别结果:', finalResult);
                            }
                            
                            // 如果是最后一包响应，或者所有音频发送完成且有结果，返回结果
                            if (response.isLast || (allAudioSent && finalResult)) {
                                // console.log('🎉 豆包STT识别完成:', finalResult);
                                ws.close();
                                resolve(finalResult || '未识别到语音内容');
                            }
                            
                            // 如果所有音频已发送但没有最终标志，等待一段时间后返回当前结果
                            if (allAudioSent && !response.isLast) {
                                setTimeout(() => {
                                    if (ws.readyState === WebSocket.OPEN) {
                                        // console.log('⏰ 等待超时，返回当前识别结果:', finalResult);
                                        ws.close();
                                        resolve(finalResult || '未识别到语音内容');
                                    }
                                }, 3000); // 等待3秒
                            }
                        }
                    } catch (parseError) {
                        console.error('解析豆包STT响应失败:', parseError);
                    }
                });
                
                ws.on('error', (error) => {
                    console.error('❌ 豆包STT WebSocket错误:', error);
                    reject(new Error(`豆包STT连接失败: ${error.message}`));
                });
                
                ws.on('close', (code, reason) => {
                    // console.log(`🔌 豆包STT连接关闭: ${code} - ${reason}`);
                    if (!finalResult && code !== 1000) {
                        reject(new Error(`豆包STT连接异常关闭: ${code}`));
                    }
                });
                
                // 设置超时
                const timeoutId = setTimeout(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        // console.log('⏰ 豆包STT识别超时，关闭连接');
                        ws.close();
                        reject(new Error('豆包STT识别超时'));
                    }
                }, 40000); // 40秒超时
                
                // 成功时清除超时
                const originalResolve = resolve;
                resolve = (result) => {
                    clearTimeout(timeoutId);
                    originalResolve(result);
                };
                
            } catch (error) {
                console.error('豆包STT识别失败:', error);
                reject(error);
            }
        });
    }
}

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);
        
        if (!body || !body.audioData) {
            throw new Error('请求数据无效：缺少audioData');
        }
        
        const { audioData, mimeType } = body;
        // console.log(`🎤 开始豆包STT语音识别，音频格式: ${mimeType}`);
        
        // 将base64音频数据转换为Buffer
        const audioBuffer = Buffer.from(audioData, 'base64');
        // console.log(`📊 音频数据大小: ${audioBuffer.length} bytes`);
        
        // 创建豆包STT客户端并识别
        const sttClient = new DoubaoSTTClient();
        const recognizedText = await sttClient.recognizeSpeech(audioBuffer);
        
        console.log('🎯 豆包STT识别结果:', recognizedText);
        
        // 返回识别结果，保持与原API兼容的格式
        return recognizedText || "未识别到语音内容";
        
    } catch (error) {
        console.error('❌ 豆包STT API错误:', error);
        return { 
            error: `豆包语音识别失败: ${error.message}`,
            details: error.stack 
        };
    }
});