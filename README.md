# Clinicial Conversation Training System

Install the following models in the `/public/model/` dictionary
https://drive.google.com/drive/folders/1YiGlIL1F4L3PZnKZKSZywObuRObxiiQf?usp=sharing


## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

# 诊所聊天机器人

## 功能特点

### 扣子(Coze)工作流集成
- 使用扣子自带的 `conversation_id` 管理对话记忆
- 自动维护用户对话上下文，无需手动传递历史消息
- 支持多用户会话隔离
- **非流式输出**：使用标准JSON响应格式，更稳定的API调用

### 对话记忆管理
- **自动记忆**: 扣子API会自动管理每个conversation_id的对话历史
- **用户隔离**: 不同用户使用不同的conversation_id，确保隐私
- **持久化存储**: 对话完成后可选择保存到数据库

### API使用方式

#### 发起对话
```javascript
POST /api/coze-conversation
{
  "message": "用户消息内容",
  "userId": "用户唯一标识",
  "systemPrompt": "系统提示词（可选）",
  "shouldSave": false // 是否保存到数据库
}
```

#### 响应格式
```javascript
{
  "response": "AI回复内容",
  "aiMessage": {
    "role": "assistant",
    "content": "AI回复内容",
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "conversationId": "扣子返回的会话ID",
  "conversationComplete": true // 是否完成对话
}
```

#### 清除对话历史
```javascript
POST /api/coze-conversation
{
  "action": "clearHistory",
  "userId": "用户唯一标识"
}
```

### 配置环境变量
```bash
COZE_API_TOKEN_NEW=你的扣子API令牌
COZE_WORKFLOW_CONVERSATION_ID=工作流ID
```

## 技术架构

- **前端**: Nuxt.js + Vue.js
- **后端**: Nuxt.js API routes
- **AI服务**: 扣子(Coze)工作流API
- **数据库**: MongoDB (可选持久化)

## 部署指南

1. 配置环境变量
2. 安装依赖: `npm install`
3. 启动开发服务器: `npm run dev`
4. 访问 `http://localhost:3000`
