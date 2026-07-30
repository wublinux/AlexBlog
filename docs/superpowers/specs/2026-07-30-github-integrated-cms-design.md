# GitHub 集成 CMS 设计规格

## 概述

为 Alex's Blog 构建一个基于 GitHub 集成的自定义 CMS 界面，允许用户通过网页界面直接发布和管理博客文章，无需通过 AI 部署。

## 目标

1. 提供用户友好的网页界面管理博客文章
2. 通过 GitHub API 直接编辑仓库文件
3. 自动触发 Cloudflare Pages 部署
4. 支持完整 CMS 功能：文章管理、媒体管理、多语言、SEO 优化、实时预览

## 技术架构

### 前端
- **框架**: Astro + React 组件
- **样式**: Tailwind CSS
- **状态管理**: React Context 或 Zustand
- **Markdown 编辑器**: MDX 编辑器或 Monaco Editor

### 后端
- **运行时**: Cloudflare Workers
- **API**: GitHub REST API
- **认证**: GitHub OAuth App
- **存储**: GitHub 仓库（无需额外数据库）

### 部署
- **CMS 前端**: Cloudflare Pages
- **CMS 后端**: Cloudflare Workers
- **博客**: 现有 Cloudflare Pages 部署

## 功能需求

### 1. 用户认证
- GitHub OAuth 登录
- 权限控制（仅仓库协作者可访问）
- 安全的 token 管理

### 2. 文章管理
- 创建新文章（Markdown/MDX）
- 编辑现有文章
- 删除文章（软删除或硬删除）
- 发布/草稿状态切换
- 文章列表和搜索

### 3. 媒体管理
- 上传图片到 GitHub 仓库
- 自动生成 Markdown 图片链接
- 媒体库浏览和管理
- 图片压缩和优化

### 4. 多语言支持
- 中英文文章分别管理
- 自动配对中英文文章
- 语言切换界面

### 5. SEO 优化
- 元标签编辑（title, description）
- URL slug 自定义
- 社交媒体预览图
- 实时 SEO 评分

### 6. 实时预览
- Markdown 实时渲染预览
- 响应式预览（桌面/移动）
- 代码高亮预览

## 数据流

```
用户 → CMS 界面 → Cloudflare Workers → GitHub API → GitHub 仓库
                                                        ↓
Cloudflare Pages ← 自动部署 ← Webhook ← GitHub 仓库变化
```

## 安全考虑

1. **GitHub OAuth**: 使用最小权限范围（repo）
2. **Token 存储**: 使用 Cloudflare Workers secrets
3. **输入验证**: 防止 XSS 和注入攻击
4. **速率限制**: 防止 API 滥用
5. **审计日志**: 记录所有 CMS 操作

## 用户体验

### 登录流程
1. 用户访问 CMS 界面
2. 点击"使用 GitHub 登录"
3. 重定向到 GitHub OAuth 授权
4. 授权后重定向回 CMS
5. 显示文章管理界面

### 文章编辑流程
1. 点击"新建文章"或选择现有文章
2. 填写元数据（标题、描述、标签等）
3. 编写 Markdown 内容
4. 实时预览效果
5. 保存为草稿或直接发布
6. 自动提交到 GitHub 仓库
7. Cloudflare Pages 自动部署

## 技术实现细节

### GitHub API 集成
- 使用 GitHub Contents API 读取/写入文件
- 使用 GitHub Trees API 批量更新文件
- 使用 GitHub Commits API 创建提交
- 使用 GitHub References API 管理分支

### Cloudflare Workers 后端
- 处理 GitHub OAuth 流程
- 代理 GitHub API 请求
- 管理用户会话
- 提供 RESTful API 给前端

### Astro 前端
- 响应式 CMS 界面
- React 组件用于交互式部分
- Tailwind CSS 样式
- 客户端路由

## 部署步骤

1. **创建 GitHub OAuth App**
   - 获取 Client ID 和 Client Secret
   - 配置回调 URL

2. **部署 Cloudflare Workers 后端**
   - 配置 GitHub secrets
   - 部署 Worker 脚本

3. **部署 CMS 前端**
   - 构建 Astro 项目
   - 部署到 Cloudflare Pages

4. **配置 GitHub Webhook**
   - 可选：用于实时更新 CMS 界面

## 成功标准

1. 用户能够通过 CMS 界面发布新文章
2. 文章自动出现在博客网站上
3. 支持所有计划的功能
4. 用户体验流畅，无技术障碍
5. 安全性符合生产环境标准

## 范围限制

### 包含
- 完整的 CMS 界面
- GitHub API 集成
- 自动部署流程
- 基本的用户认证

### 不包含
- 多用户协作（未来功能）
- 高级媒体处理（如视频）
- 自定义域名管理
- 高级 SEO 工具

## 风险和缓解措施

1. **GitHub API 速率限制**
   - 缓解：实现请求缓存和批处理

2. **OAuth 安全风险**
   - 缓解：使用最小权限范围，安全存储 token

3. **部署延迟**
   - 缓解：提供部署状态反馈

4. **数据一致性**
   - 缓解：使用 GitHub 的原子提交

## 未来扩展

1. 多用户协作
2. 高级媒体处理
3. 自定义主题
4. 插件系统
5. 移动端优化