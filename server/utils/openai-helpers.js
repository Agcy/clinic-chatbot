/**
 * @fileoverview OpenAI 辅助工具函数
 */

/**
 * 清理 Markdown 格式化的 JSON
 * @param {string} content - 可能包含 Markdown 的 JSON 字符串
 * @returns {string} 清理后的 JSON 字符串
 */
export const cleanMarkdownJson = (content) => {
  if (!content) return '';
  
  let cleanedContent = content.trim();
  
  // 移除 Markdown 代码块标记 (完整匹配)
  const markdownPattern = /^```(?:json)?\s*\n([\s\S]*?)```$/;
  const match = cleanedContent.match(markdownPattern);
  
  if (match && match[1]) {
    cleanedContent = match[1].trim();
  } else {
    // 如果不是完整的代码块，尝试移除开头的 ```json 或 ``` 和结尾的 ```
    cleanedContent = cleanedContent
      .replace(/^```(?:json)?\s*\n/, '')  // 移除开头的 ```json 或 ```
      .replace(/\n```$/, '');             // 移除结尾的 ```
  }
  
  return cleanedContent;
}; 