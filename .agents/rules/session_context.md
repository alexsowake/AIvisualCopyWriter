# Visual Copywriter - 项目上下文与开发规范 (Session Context)

这份文档汇总了过去数十轮迭代中达成的核心共识。后续的 AI 开发应当将此文件作为项目上下文的首要前置规则，以保持项目风格一致性和代码质量。

## 一、核心开发规范与设计共识 (Development Standards)

### 1. 审美与 UI/UX 规范 (Literary Magazine Aesthetic)
*   **设计基调**：全面拥抱**“文艺杂志（Editorial Style）”**美学，摒弃粗糙的极简风。UI 观感需要“高级、温暖、透气、干净”（灵感对标 `chatmemo.ai`）。
*   **色彩与排版**：避免使用高饱和度的刺眼主色调（如纯蓝纯红）。采用暖沙色背景、柔和阴影组合（`drop-shadow-sm`）；强制使用优雅的衬线与非衬线中英文字体组合（如 `LXGW WenKai` 运用在输出结果上，`DM Sans` 或 `Inter` 负责界面交互字体）。
*   **交互动效**：界面组件的出现/消失必须具备平滑的过渡动画。卡片 hover 状态要具备视觉纵深反馈（例如 `translateY(-3px)` 和舒适的阻尼感）。

### 2. 前端架构与组件约束
*   **移动优先与响应式**：应用必须在所有窗口尺寸下均保持高度可用。在移动端（Phone），交互布局需垂直堆叠（Vertical Stacking），触控目标（Touch Targets）必须足够宽大且易于点击。
*   **巨型页面解耦**：禁止在如 `page.tsx` 这类入口文件里堆砌杂乱逻辑。庞大的业务模块必须切分为原子组件（如拆分出 `common/`, `results/`, `upload/` 模块），复杂状态流需剥离到自定义 Hooks 中（例如 `useImageProcessor.ts`）。

### 3. 后端服务与 API 规范
*   **环境变量隔离与安全**：绝不将 Token 等明文秘钥硬编码进 `.ts` 源文件。所有代理接口、验证口令强制提取至 `.env.local` 中（如 `VITE_KIMI_PROXY_SECRET`, `KIMI_API_URL`, `QWEN_API_KEY`）。本地开发秘钥必须被 `.gitignore` 保护，通过 `.env.example` 留下模板。
*   **模型拓展策略**：保持多模态（Gemini、Kimi、Qwen）API 格式的兼容性扩展。若要新增模型，只需在类型 `ModelProvider` 中增减配置，利用标准 JSON 格式进行路由转发，并提供优雅的鉴权（403 等）拦截报错。

---

## 二、当前未完成的子任务列表 (TODO List)

*   [ ] **流式输出 (Streaming Output)**：当前的 `route.ts` API 还处于等待全文本块返回的堵塞模式。需将其重构为 `ReadableStream` 渐进式流传输，以前端打字机效果呈现，大幅降低用户的“白屏等待感”。
*   [ ] **高级动效接入 (UX/Animations)**：引入 `framer-motion` 库，为 `ResultCard`（生成结果卡片）赋予更加自然的瀑布流式入场、平滑加载动画，以及工作区状态切换的无缝过渡。
*   [ ] **部署与上线 (Deployment)**：项目需执行通过 GitHub 结合 Vercel 进行自动化部署的环境变量配置，或者上线到专属轻量应用服务器（配置 DNS 与自定义域名）。

---

## 三、已知的技术债务与潜在隐患 (Technical Debt & Known Issues)

1.  **图片导出模糊与截屏局限**
    *   **历史债务**：之前曾遇到 `html2canvas` 导出导致画质被毁，已恢复至原生 `<img />` 无损渲染并优化了由 DOM 导出图片的流程。
    *   **潜在风险**：长图跨越屏幕被截断时，`html2canvas` 仍有极小概率在移动端浏览器视口外采不到高分贝像素；极端比例图片的缩放也需要持续压测与观察。
2.  **移动端的 Web Share API 降级兼容问题**
    *   在 Android 和 iOS 环境中（例如微信内嵌浏览器、套壳 Webview），系统原生分享 API 唤起成功率不稳定。目前的降级策略是“唤醒失败则弹窗提示长按保存”，该部分逻辑仍需在多种真实机型上进行回归联调。
3.  **大底图长文本生成可能导致的超时（Timeout）风险**
    *   云端大模型（如 K2.5 等多模态大图解析）存在排队耗时较长的随机波动。如果耗时超过 Serverless（如 Vercel）环境默认的限制（比如 60 秒），可能会遭到 `504 Gateway Timeout` 强制截断。暂未实现严密的断线自动重连或长轮询处理机制。
