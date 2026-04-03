# Visual Copywriter Session Context

本文档记录了项目在开发过程中的核心规范、实时研发共识、待办任务及技术债务。

## 1. 核心开发规范 (Core Development Norms)

### 审美与设计语言 (Aesthetics)
- **极简主义原则**：禁止使用高饱和度的红色报警。错误及常规提示应以低饱和度或中性色（如淡灰色）呈现，保持“文青”的高级感。
- **字体规范**：西文 `DM Sans`/`Playfair Display`，中文核心识别字 `LXGW WenKai (落霞文楷)`。
- **AI 标签协议**：`✦ [Model] 瞎编`（原创）或 `✦ [Model] 搬运`（引文），带微型 `✦` 符号。

### 交互逻辑规范 (UX)
- **任务受控流**：单张图片支持“停止生成”与“重新生成”。点击“停止”时**严禁**自动移除图片卡片。
- **移除即销毁**：右上角“X”是移除图片的唯一入口。
- **上传熔断器**：全局限制单次任务最多 **6 张图片**。超出部分自动截断并伴随 `showToast`。
- **占位优先 (UX Fast-path)**：图片上传后应立即生成占位卡片 (Placeholder)，随后再异步进入 EXIF 提取与解码循环。

### 算力与处理策略 (Computing Strategy)
- **算力左移 (Shift-left)**：优先将图片压缩、EXIF 提取、HEIC 解码移至前端执行，以换取极低的服务器成本与响应延迟。
- **串行处理协议**：由于移动端内存敏感，图片处理流程（解码、压缩）必须按顺序**排队执行**，严禁大规模并行 Promise.all。
- **WeChat WebView 防御**：针对微信端 WASM 的 OOM 风险，实施 **5MB 全局前置熔断**。

---

## 2. 研发共识 (Technical Path)

### Web Worker 调度协议 (V3)
在多轮迭代中达成的 Worker 通信最佳实践：
1. **任务 ID 追踪**：通过 `taskId` 确报消息闭环，杜绝异步消息“串线”。
2. **故障自愈 (Self-healing)**：实现 `initHeicWorker` 工厂函数。Worker 崩溃（`onerror`）或 30 秒超时熔断后，强制 `terminate()` 旧实例并立即重建。
3. **优雅降级 (Failover)**：若系统级初始化失败，自动回退到主线程降级完成转码，确保业务流不中断。

### 构建与环境
- **高性能驱动**：默认开启 Next.js Turbopack (`next dev --turbo`)。
- **打包隔离**：在 `next.config.mjs` 中利用 `serverComponentsExternalPackages: ['sharp']` 处理原生模块依赖。

---

## 3. 当前待办任务 (Current Sub-tasks)

- [ ] **HEIC 重定位优化**：目前已回归至服务端解码，需重新实施稳定的 Web Worker + `heic2any` 方案，且需彻底解决 Turbopack 环境下的 `fs/zlib` 加载警告。
- [ ] **编译警告清理**：排查并消除控制台中顽固的 `Couldn't load fs/zlib` 警告（疑似由某些 client 库违规引入 node 原生模块导致）。
- [ ] **UI 渲染降效优化**：将 `addFiles` 彻底迁移至“瞬时占位 + 背景解码”的两段式逻辑。
- [ ] **WeChat 实机性能测试**：在降级方案生效后，验证 5MB 拦截对防止微信白屏的真实有效性。

---

## 4. 技术债务 (Identified Technical Debt)

### 1. 编译系统不匹配 (Turbopack Issues)
- **Worker 加载冲突**：Next.js 14.2.x 在 Turbopack 模式下处理嵌套 Worker 时，容易触发针对 Nodejs 原生模块的静态分析错误（如 `fs`, `zlib`），这限制了前端在线程隔离上的深度。

### 2. 状态库过度复杂
- `useImageProcessor.ts` 中的 `images` 数组承载了过多的业务元数据与状态标志。长期应考虑将其抽离为独立的 `Provider` 或改用 `useReducer` 管理。

### 3. 处理链路冗余
- 目前 `package.json` 中由于多次回归，同时存在 `heic-convert`, `heic-decode` 及 `libheif-js`。一旦客户端 `heic2any` 方案固化，应立即清理这些重型的服务端依赖。

### 4. 内存管理 (Memory Leak Risk)
- 缺乏全局的 `URL.revokeObjectURL` 统一管控。在频繁上传/清空场景下，浏览器内存压力会持续上升。
