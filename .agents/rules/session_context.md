# Session Context — AIvisualCopyWriter

> 最后更新：2026-04-07（第 4 次 Android HEIC 修复后）

---

## 一、项目概述

Next.js 14 应用，功能：用户上传图片 → 调用大模型 API 生成营销文案。  
部署平台：Vercel（Serverless，Edge Runtime 不兼容 Buffer/fs，须指定 `runtime = 'nodejs'`）。  
Git 仓库：`alexsowake/AIvisualCopyWriter`，主分支 `main`。

---

## 二、核心开发规范

### 2.1 修复原则
- **严禁超出修复范围**：每次修复只改动与问题直接相关的代码，不附带重构、注释整理或功能扩展。
- **新依赖需明确理由**：添加包之前必须确认它不是现有包的传递依赖（避免重复引入）。
- **不引入 Worker/blob URL**：Vercel 部署环境 CSP 禁止 `blob:` 来源的 Worker，任何依赖 `new Worker(URL.createObjectURL(...))` 的库（如 `heic2any`）均不可用。

### 2.2 API Route 规范
每个自定义 API route 顶部必须显式声明：
```ts
export const runtime = 'nodejs';   // 兼容 Buffer/fs（heic-convert 等 Node 原生模块）
export const maxDuration = 60;     // 防止大文件/慢 LLM 触发 Vercel 默认超时导致 504
```

### 2.3 审美与设计语言
- **极简主义原则**：禁止使用高饱和度红色报警；错误及常规提示以低饱和度或中性色呈现，保持"文青"高级感。
- **字体规范**：西文 `DM Sans` / `Playfair Display`，中文核心识别字 `LXGW WenKai（落霞文楷）`。
- **AI 标签协议**：`✦ [Model] 瞎编`（原创）或 `✦ [Model] 搬运`（引文），带微型 `✦` 符号。

### 2.4 交互逻辑规范
- **任务受控流**：单张图片支持"停止生成"与"重新生成"；点击"停止"时**严禁**自动移除图片卡片。
- **移除即销毁**：右上角"X"是移除图片的唯一入口。
- **上传熔断器**：全局限制单次任务最多 **6 张图片**，超出部分自动截断并伴随 `showToast`。
- **占位优先（UX Fast-path）**：图片上传后立即生成占位卡片，随后再异步进入 EXIF 提取与解码循环。

### 2.5 算力与处理策略
- **算力左移**：优先将图片压缩、EXIF 提取、HEIC 解码移至前端执行，换取低服务器成本与响应延迟。
- **串行处理协议**：移动端内存敏感，图片处理流程（解码、压缩）必须按顺序排队执行，严禁大规模并行 `Promise.all`。
- **WeChat WebView 防御**：针对微信端 WASM 的 OOM 风险，实施 **5MB 全局前置熔断**。

### 2.6 提交规范
- 功能里程碑：`里程碑：[功能描述]`
- 线上修复：`修复<描述>` 或 `N次修复<描述>`（迭代次数前缀）

---

## 三、HEIC 转换架构（当前双策略，v4 稳定版）

| 策略 | 实现 | 适用场景 | 失败行为 |
|------|------|----------|----------|
| 策略 1 | `createImageBitmap` + 5s 超时 + 0×0 bitmap 检测 | iOS Safari、Chrome 120+、桌面端 | 超时或空 bitmap → catch → fallback |
| 策略 2 | POST `/api/convert-heic`（`heic-convert`，服务端） | Android、旧版浏览器 | 失败 → 抛出"请转为 JPG 后上传" |

**历史沿革（已废弃策略）**：
- 策略 1.5-a：`heic2any`（Worker + blob URL，Vercel CSP 不兼容，已移除）
- 策略 1.5-b：`heic-decode` WASM 主线程（Android 实测仍不稳定，已在 v4 删除）

---

## 四、已完成里程碑（按时间倒序）

| Commit | 内容 |
|--------|------|
| `22693b6` | **4th 修复 Android HEIC**：删除策略 1.5（heic-decode 客户端），两路由加 `maxDuration=60`，卸载 `@types/heic-decode` |
| `cfcb14c` | 3次修复：将策略 1.5 从 `heic2any` 替换为 `heic-decode`（无 Worker，WASM 主线程） |
| `edc598e` | 2次修复：引入策略 1.5 `heic2any`，修复 ResultCard 错误信息展示 |
| `b959e17` | 首次修复 Android HEIC（策略 1 超时检测 + ResultGallery 修复 + 测试脚本） |
| `5107d69` | 修复 `location` const 语法规范 |
| `59eb8a8` | 优化前端文案 |
| `e164c81` | 增加 Umami 统计 |
| `941741f` | 修复导出图片不够高清 |
| `d6c91ff` | 优化编译速度 / 移除 sharp / heic & exifr 风险预警 |
| `d5cd43f` | 限制上传照片数量 |
| `425c61d` | 修复 SystemPrompt |
| `7122a0a` | 调整大模型选项（Kimi / Qwen / Gemini） |

---

## 五、当前待办任务

1. **Android HEIC 线上回归验证**：第 4 次修复尚未有真机回归记录，需在 Android Chrome 上传 HEIC 文件确认策略 2（服务端路径）完整可用。
2. **测试脚本更新**：`scripts/test-android-issues.mjs` 是为旧策略 1.5 设计的测试，策略 1.5 已删除，脚本覆盖范围不再准确，需评估是否更新或删除。
3. **UI 渲染降效优化**：将 `addFiles` 彻底迁移至"瞬时占位 + 背景解码"两段式逻辑。
4. **WeChat 实机性能测试**：验证 5MB 拦截对防止微信白屏的真实有效性。

---

## 六、已知技术债务

| 优先级 | 问题 | 说明 |
|--------|------|------|
| 高 | **npm audit 4 个高危漏洞** | 运行 `npm audit` 确认；需评估 `npm audit fix` 是否有破坏性变更再处理 |
| 中 | **状态管理过度集中** | `useImageProcessor.ts` 中 `images` 数组承载了过多业务元数据与状态标志，长期应抽离为独立 Provider 或 `useReducer` |
| 中 | **编译系统不匹配（Turbopack）** | Next.js 14.2.x Turbopack 模式下嵌套 Worker 触发 `fs/zlib` 静态分析警告，限制了前端线程隔离深度 |
| 低 | **`heic-decode` 仍为传递依赖** | `@types/heic-decode` 已移除，但 `heic-decode` 本身仍是 `heic-convert` 的传递依赖，升级 `heic-convert` 时需注意版本联动 |
| 低 | **exifr 风险预警** | `d6c91ff` 提交中曾标注 exifr 存在潜在风险，具体风险点未在后续提交中明确闭环 |
| 低 | **内存管理风险** | 缺乏全局 `URL.revokeObjectURL` 统一管控，频繁上传/清空场景下浏览器内存压力持续上升 |
| 低 | **模型 API Key 无运行时校验** | `generate-copy` 支持 kimi/qwen/gemini 三个提供商，Key 缺失时静默失败，无明确错误提示 |

---

## 七、关键文件速查

| 文件 | 职责 |
|------|------|
| `src/hooks/useImageProcessor.ts` | 图片预处理核心：HEIC 转换（双策略）、EXIF 提取、WebP 压缩 |
| `src/app/api/convert-heic/route.ts` | HEIC 服务端转换，`runtime=nodejs`，`maxDuration=60` |
| `src/app/api/generate-copy/route.ts` | 文案生成，支持 kimi/qwen/gemini，`maxDuration=60` |
| `src/config/systemPrompt.ts` | 大模型系统提示词（ai-original / quote-style 两种模式） |
| `src/components/results/ResultCard.tsx` | 单张结果卡片（含错误状态展示） |
| `src/components/results/ResultGallery.tsx` | 结果列表与导出功能 |
| `scripts/test-android-issues.mjs` | Android 问题测试脚本（当前内容已过时，见§五） |
