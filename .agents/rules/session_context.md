# Session Context — AIvisualCopyWriter

> 最后更新：2026-04-08（第 5 次 HEIC 修复：恢复 heic2any + 暴露真实错误）

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
- **heic2any 必须动态引入**：`heic2any` 在模块顶层加载时会立即执行 `new Worker(URL.createObjectURL(...))`，在 Vercel CSP 下报错。必须用 `await import('heic2any')` 动态引入，将 Worker 创建推迟到实际调用时，才能被 try-catch 安全拦截。

### 2.2 API Route 规范
每个自定义 API route 顶部必须显式声明：
```ts
export const runtime = 'nodejs';   // 兼容 Buffer/fs（heic-convert 等 Node 原生模块）
export const maxDuration = 60;     // 防止大文件/慢 LLM 触发 Vercel 默认超时导致 504
```

### 2.3 错误透传原则
- 禁止在 catch 末端用固定文案掩盖真实错误（如 `'HEIC 转换失败，请转为 JPG 后上传'`）。
- 服务端返回非 2xx 时，必须读取 `res.json()` 中的 `error` 字段透传，使界面能精准显示 504、OOM 等具体原因。
- 最终 catch 块统一用：`throw new Error(err instanceof Error ? err.message : 'HEIC 转换失败')`

### 2.4 审美与设计语言
- **极简主义原则**：禁止使用高饱和度红色报警；错误及常规提示以低饱和度或中性色呈现，保持"文青"高级感。
- **字体规范**：西文 `DM Sans` / `Playfair Display`，中文核心识别字 `LXGW WenKai（落霞文楷）`。
- **AI 标签协议**：`✦ [Model] 瞎编`（原创）或 `✦ [Model] 搬运`（引文），带微型 `✦` 符号。

### 2.5 交互逻辑规范
- **任务受控流**：单张图片支持"停止生成"与"重新生成"；点击"停止"时**严禁**自动移除图片卡片。
- **移除即销毁**：右上角"X"是移除图片的唯一入口。
- **上传熔断器**：全局限制单次任务最多 **6 张图片**，超出部分自动截断并伴随 `showToast`。
- **占位优先（UX Fast-path）**：图片上传后立即生成占位卡片，随后再异步进入 EXIF 提取与解码循环。

### 2.6 算力与处理策略
- **算力左移**：优先将图片压缩、EXIF 提取、HEIC 解码移至前端执行，换取低服务器成本与响应延迟。
- **串行处理协议**：移动端内存敏感，图片处理流程（解码、压缩）必须按顺序排队执行，严禁大规模并行 `Promise.all`。
- **WeChat WebView 防御**：针对微信端 WASM 的 OOM 风险，实施 **5MB 全局前置熔断**。

### 2.7 提交规范
- 功能里程碑：`里程碑：[功能描述]`
- 线上修复：`修复<描述>` 或 `N次修复<描述>`（迭代次数前缀）

---

## 三、HEIC 转换架构（当前三策略，v5）

| 策略 | 实现 | 适用场景 | 失败行为 |
|------|------|----------|----------|
| 策略 1 | `createImageBitmap` + 5s 超时 + 0×0 bitmap 检测 | iOS Safari、Chrome 120+、桌面端 | 超时或空 bitmap → catch → fallback |
| 策略 1.5 | `await import('heic2any')`（动态引入，客户端 asm.js） | Android、PC 无原生支持时的前端兜底 | 失败 → catch → fallback 服务端 |
| 策略 2 | POST `/api/convert-heic`（`heic-convert`，服务端） | 前两策略均失败时的最终兜底 | 失败 → 透传真实错误信息（含 HTTP status / JSON error） |

**历史沿革说明**：
- v2（`edc598e`）：首次引入 heic2any（静态 import，有顶层 Worker 问题）
- v3（`cfcb14c`）：将 1.5 换成 heic-decode WASM 主线程（Android 实测仍不稳定）
- v4（`22693b6`）：删除策略 1.5，退化为双策略（服务端兜底崩溃后全军覆没）
- **v5（当前）**：恢复 heic2any 但改为动态 import，规避顶层 Worker 问题；同时修复错误透传

---

## 四、已完成里程碑（按时间倒序）

| 日期 | 内容 |
|------|------|
| 2026-04-08 | **v5 修复**：恢复策略 1.5（`heic2any` 动态 import），修复错误透传（`res.json().error` + `err.message` 透传） |
| 2026-04-07 | **v4（4th 修复）**：删除策略 1.5（heic-decode 客户端），两路由加 `maxDuration=60`，卸载 `@types/heic-decode` |
| 2026-04-07 | **v3（3次修复）**：将策略 1.5 从 `heic2any` 替换为 `heic-decode`（无 Worker，WASM 主线程） |
| 2026-04-07 | **v2（2次修复）**：引入策略 1.5 `heic2any`，修复 ResultCard 错误信息展示 |
| 2026-04-07 | **v1（首次修复）**：策略 1 超时检测 + ResultGallery 修复 + 测试脚本 |
| — | 优化前端文案、增加 Umami 统计、修复导出高清、优化编译速度、限制上传数量、修复 SystemPrompt、调整大模型选项 |

---

## 五、当前待办任务

1. **Android HEIC 线上回归验证**：v5 修复未提交/部署，需在 Android Chrome 上传 HEIC 文件，验证策略 1.5（heic2any 动态引入）能否在 Vercel 生产 CSP 下成功运行。
2. **测试脚本更新**：`scripts/test-android-issues.mjs` 为旧策略设计，当前三策略架构下覆盖范围不准确，需评估更新或删除。
3. **UI 渲染降效优化**：将 `addFiles` 彻底迁移至"瞬时占位 + 背景解码"两段式逻辑。
4. **WeChat 实机性能测试**：验证 5MB 拦截对防止微信白屏的真实有效性。

---

## 六、已知技术债务

| 优先级 | 问题 | 说明 |
|--------|------|------|
| 高 | **npm audit 4 个高危漏洞** | 需评估 `npm audit fix` 是否有破坏性变更再处理 |
| 中 | **heic2any Vercel CSP 风险未最终验证** | 动态 import 理论上可规避顶层 Worker 报错，但 Vercel 生产环境 CSP 是否允许 `blob:` Worker 在运行时创建，仍需真机确认。若不行，策略 1.5 会静默 fallback 到服务端 |
| 中 | **状态管理过度集中** | `useImageProcessor.ts` 中 `images` 数组承载了过多业务元数据与状态标志，长期应抽离为独立 Provider 或 `useReducer` |
| 中 | **编译系统不匹配（Turbopack）** | Next.js 14.2.x Turbopack 模式下嵌套 Worker 触发 `fs/zlib` 静态分析警告 |
| 低 | **`heic-decode` 仍为传递依赖** | 仍是 `heic-convert` 的传递依赖，升级时需注意版本联动 |
| 低 | **exifr 风险预警** | `d6c91ff` 提交标注过风险，未在后续提交中明确闭环 |
| 低 | **内存管理风险** | 缺乏全局 `URL.revokeObjectURL` 统一管控，频繁上传/清空场景下内存压力持续上升 |
| 低 | **模型 API Key 无运行时校验** | kimi/qwen/gemini Key 缺失时静默失败，无明确错误提示 |

---

## 七、关键文件速查

| 文件 | 职责 |
|------|------|
| `src/hooks/useImageProcessor.ts` | 图片预处理核心：HEIC 三策略转换、EXIF 提取、WebP 压缩 |
| `src/app/api/convert-heic/route.ts` | HEIC 服务端转换，`runtime=nodejs`，`maxDuration=60` |
| `src/app/api/generate-copy/route.ts` | 文案生成，支持 kimi/qwen/gemini，`maxDuration=60` |
| `src/config/systemPrompt.ts` | 大模型系统提示词（ai-original / quote-style 两种模式） |
| `src/components/results/ResultCard.tsx` | 单张结果卡片（含错误状态展示） |
| `src/components/results/ResultGallery.tsx` | 结果列表与导出功能 |
| `scripts/test-android-issues.mjs` | Android 问题测试脚本（内容已过时，见§五） |
