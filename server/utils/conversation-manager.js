/**
 * @fileoverview 对话ID管理器 - 在多个API间共享conversation_id
 */

// 内存中存储用户对话ID的映射
const userConversationMap = new Map();

/**
 * 设置用户的conversation_id
 * @param {string} userId - 用户ID
 * @param {string} conversationId - 对话ID
 */
export function setConversationId(userId, conversationId) {
    userConversationMap.set(userId, conversationId);
    console.log(`🔄 ConversationManager: 设置用户 ${userId} 的conversation_id: ${conversationId}`);
}

/**
 * 获取用户的conversation_id
 * @param {string} userId - 用户ID
 * @returns {string|null} 对话ID
 */
export function getConversationId(userId) {
    const conversationId = userConversationMap.get(userId);
    console.log(`🔍 ConversationManager: 获取用户 ${userId} 的conversation_id: ${conversationId || 'null'}`);
    return conversationId;
}

/**
 * 清除用户的conversation_id
 * @param {string} userId - 用户ID
 */
export function clearConversationId(userId) {
    const deleted = userConversationMap.delete(userId);
    console.log(`🗑️ ConversationManager: 清除用户 ${userId} 的conversation_id: ${deleted ? '成功' : '失败'}`);
    return deleted;
}

/**
 * 获取所有存储的conversation_id
 * @returns {Map} 用户对话ID映射
 */
export function getAllConversationIds() {
    console.log(`📊 ConversationManager: 当前存储的对话数量: ${userConversationMap.size}`);
    return new Map(userConversationMap);
} 