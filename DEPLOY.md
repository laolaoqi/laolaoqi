# 猎手阿尔法 - 部署指南

## 方案A：快速部署到 Vercel（免费）

### 第一步：准备工作

1. 注册 GitHub 账号：https://github.com/signup
2. 注册 Vercel 账号：https://vercel.com/signup（使用 GitHub 登录即可）

### 第二步：上传代码到 GitHub

```bash
# 在项目根目录执行
git init
git add .
git commit -m "Initial commit"

# 创建 GitHub 仓库并推送
git remote add origin https://github.com/YOUR_USERNAME/hunter-alpha.git
git push -u origin main
```

### 第三步：部署到 Vercel

#### 方法1：通过 Vercel 网站（推荐）

1. 登录 https://vercel.com
2. 点击 "Add New Project"
3. 选择 "Import Git Repository"
4. 选择你的 `hunter-alpha` 仓库
5. 点击 "Import"
6. 配置保持默认，点击 "Deploy"
7. 等待约2分钟，部署完成后会显示访问链接

#### 方法2：通过 Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel --prod
```

### 第四步：配置自定义域名（可选）

1. 在 Vercel 项目设置中点击 "Domains"
2. 输入你的域名，如 `hunter-alpha.vercel.app`（免费）或自定义域名
3. 按照提示配置 DNS

---

## 数据说明

### 当前版本数据状态

| 数据类型 | 来源 | 延迟 | 说明 |
|---------|------|------|------|
| 三大指数 | 模拟真实数据 | 5秒刷新 | 基于真实市场规律的模拟数据 |
| 股票行情 | 模拟真实数据 | 5秒刷新 | TOP10股票实时价格模拟 |
| 市场情绪 | 模拟数据 | 5秒刷新 | 涨跌家数等统计模拟 |
| 用户系统 | localStorage | 实时 | 浏览器本地存储 |

### 升级到真实数据

如需接入真实行情数据，需要：

1. **免费方案**：使用新浪财经/东方财富 API（有CORS限制，需要后端代理）
2. **专业方案**：申请 Tushare Pro / Wind 等付费数据服务

---

## 项目结构

```
├── src/
│   ├── components/      # UI 组件
│   ├── context/         # 全局状态（用户认证）
│   ├── hooks/           # 自定义 Hooks
│   ├── pages/           # 页面组件
│   ├── services/        # 数据服务
│   └── App.tsx          # 主应用
├── public/              # 静态资源
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── vercel.json          # Vercel 部署配置
```

---

## 环境变量（可选）

如需连接后端 API，创建 `.env` 文件：

```
VITE_API_BASE_URL=https://your-api.com
VITE_WS_URL=wss://your-websocket.com
```

---

## 常见问题

### Q: 部署后页面空白？
A: 检查 `vite.config.ts` 中的 `base` 配置是否正确。

### Q: 如何更新已部署的网站？
A: 推送代码到 GitHub，Vercel 会自动重新部署。

### Q: 如何启用 HTTPS？
A: Vercel 自动提供 HTTPS，无需额外配置。

### Q: 访问速度慢？
A: Vercel 使用全球 CDN，海外访问速度快。如需国内加速，可考虑使用腾讯云/阿里云托管。

---

## 联系方式

如有问题，请通过 GitHub Issues 反馈。
