import { defineEventHandler, readBody, createError } from 'h3';
import WebSocket from 'ws';
import gzip from 'zlib';

// 协议常量 - 与官方demo保持一致
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

// 流式STT会话管理
const activeSessions = new Map();

// 简化的流式STT客户端
class StreamSTTSession {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.doubaoWs = null;
        this.isInitialized = false;
        this.sequenceNumber = 1;
        this.isConnected = false;
        this.lastResult = '';
        
        this.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.connectId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    async initialize() {
        try {
            // console.log(`🔗 [${this.sessionId}] 初始化豆包STT连接...`);
            
            const headers = {
                "X-Api-Resource-Id": "volc.bigasr.sauc.duration",
                "X-Api-Access-Key": process.env.DOUBAO_ACCESS_KEY,
                "X-Api-App-Key": process.env.DOUBAO_APP_KEY,
                "X-Api-Request-Id": this.requestId,
                "X-Api-Connect-Id": this.connectId
            };
            
            this.doubaoWs = new WebSocket('wss://openspeech.bytedance.com/api/v3/sauc/bigmodel', {
                headers: headers
            });
            
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('连接豆包STT服务超时'));
                }, 10000);
                
                this.doubaoWs.on('open', async () => {
                    clearTimeout(timeout);
                    // console.log(`✅ [${this.sessionId}] 豆包STT连接已建立`);
                    this.isConnected = true;
                    
                    // 发送初始请求
                    try {
                        await this.sendInitRequest();
                        this.isInitialized = true;
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });
                
                this.doubaoWs.on('error', (error) => {
                    clearTimeout(timeout);
                    console.error(`❌ [${this.sessionId}] 豆包STT连接错误:`, error);
                    reject(error);
                });
                
                this.doubaoWs.on('message', (data) => {
                    this.handleMessage(data);
                });
                
                this.doubaoWs.on('close', (code, reason) => {
                    // console.log(`🔌 [${this.sessionId}] 豆包STT连接关闭: ${code} - ${reason}`);
                    this.isConnected = false;
                });
            });
            
        } catch (error) {
            console.error(`❌ [${this.sessionId}] 初始化失败:`, error);
            throw error;
        }
    }
    
    async sendInitRequest() {
        const initRequest = {
            user: { uid: "web_user" },
            audio: {
                format: "pcm",
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
        
        const header = generateHeader(FULL_CLIENT_REQUEST, POS_SEQUENCE);
        const sequence = generateSequenceBytes(this.sequenceNumber++);
        const payloadSize = Buffer.alloc(4);
        payloadSize.writeInt32BE(compressedPayload.length, 0);
        
        const initMessage = Buffer.concat([header, sequence, payloadSize, compressedPayload]);
        
        this.doubaoWs.send(initMessage);
        // console.log(`📤 [${this.sessionId}] 发送初始请求`);
    }
    
    handleMessage(data) {
        try {
            const response = parseResponse(data);
            if (response && response.data) {
                // console.log(`📥 [${this.sessionId}] 收到响应:`, response.data);
                
                // 处理识别结果
                if (response.data.result && response.data.result.text) {
                    this.lastResult = response.data.result.text;
                    // console.log(`🎯 [${this.sessionId}] 识别结果:`, this.lastResult);
                }
            }
        } catch (error) {
            console.error(`❌ [${this.sessionId}] 处理消息失败:`, error);
        }
    }
    
    async sendAudioData(audioData, isLast = false) {
        if (!this.isConnected || !this.doubaoWs) {
            throw new Error('WebSocket连接未建立');
        }
        
        const sequence = isLast ? -Math.abs(this.sequenceNumber) : this.sequenceNumber;
        this.sequenceNumber++;
        
        if (audioData.length > 0) {
            // 压缩音频数据
            const compressedChunk = gzip.gzipSync(audioData);
            
            // 构建音频消息
            const audioHeader = generateHeader(
                AUDIO_ONLY_REQUEST, 
                isLast ? NEG_WITH_SEQUENCE : POS_SEQUENCE
            );
            const seqBytes = generateSequenceBytes(sequence);
            const chunkSizeBytes = Buffer.alloc(4);
            chunkSizeBytes.writeInt32BE(compressedChunk.length, 0);
            
            const audioMessage = Buffer.concat([
                audioHeader, 
                seqBytes, 
                chunkSizeBytes, 
                compressedChunk
            ]);
            
            this.doubaoWs.send(audioMessage);
                            // console.log(`📤 [${this.sessionId}] 发送音频包 ${Math.abs(sequence)} ${isLast ? '(最后一包)' : ''}`);
        } else if (isLast) {
            // 发送结束标记
            const audioHeader = generateHeader(AUDIO_ONLY_REQUEST, NEG_WITH_SEQUENCE);
            const seqBytes = generateSequenceBytes(sequence);
            const chunkSizeBytes = Buffer.alloc(4);
            chunkSizeBytes.writeInt32BE(0, 0);
            
            const audioMessage = Buffer.concat([audioHeader, seqBytes, chunkSizeBytes]);
            this.doubaoWs.send(audioMessage);
            // console.log(`📤 [${this.sessionId}] 发送结束标记`);
        }
    }
    
    getLastResult() {
        return this.lastResult;
    }
    
    close() {
        if (this.doubaoWs) {
            this.doubaoWs.close();
        }
        activeSessions.delete(this.sessionId);
    }
}

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);
        
        if (body.action === 'init') {
            // 创建新的STT会话
            const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const session = new StreamSTTSession(sessionId);
            
            try {
                await session.initialize();
                activeSessions.set(sessionId, session);
                
                // console.log(`✅ 创建STT会话: ${sessionId}`);
                return {
                    success: true,
                    sessionId: sessionId,
                    message: '流式STT会话初始化成功'
                };
            } catch (error) {
                throw new Error(`初始化STT会话失败: ${error.message}`);
            }
        }
        
        if (body.action === 'sendAudio') {
            const { sessionId, audioData, isLast } = body;
            
            if (!sessionId || !activeSessions.has(sessionId)) {
                throw createError({
                    statusCode: 400,
                    statusMessage: '无效的会话ID'
                });
            }
            
            const session = activeSessions.get(sessionId);
            const audioBuffer = Buffer.from(audioData);
            
            await session.sendAudioData(audioBuffer, isLast);
            
            // 等待一小段时间获取识别结果
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const result = session.getLastResult();
            
            return {
                success: true,
                result: result,
                isLast: isLast
            };
        }
        
        if (body.action === 'close') {
            const { sessionId } = body;
            
            if (sessionId && activeSessions.has(sessionId)) {
                const session = activeSessions.get(sessionId);
                session.close();
                console.log(`🔌 关闭STT会话: ${sessionId}`);
            }
            
            return {
                success: true,
                message: '会话已关闭'
            };
        }
        
        throw createError({
            statusCode: 400,
            statusMessage: '无效的请求动作'
        });
        
    } catch (error) {
        console.error('❌ 流式STT API错误:', error);
        throw createError({
            statusCode: 500,
            statusMessage: `流式语音识别失败: ${error.message}`
        });
    }
}); 