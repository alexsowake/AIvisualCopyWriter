# Session Context — AIvisualCopyWriter

> 最后更新：2026-04-12（Multi-Gen 功能完结 + Impeccable 设计规范引入 + Next.js 16 环境迁移）

---

## 一、项目概述

本产品名为“时间胶囊” (Time Capsule)，是一款基于 AI 的视觉文案创作工具。
- **核心功能**：图片上传 → 视觉分析 → 生成 6 种不同风格的文案（3 个原创创作，3 个经典引文）。
- **技术栈**：Next.js 16 (Webpack Mode), React 18, Tailwind CSS, Framer Motion, OKLCH Color System.
- **运行环境**：Node.js v22.17.0+，支持局域网移动端联调。

---

## 二、核心开发规范与设计准则

### 2.1 Impeccable 设计准则 (核心)
- **拒绝“AI 审美指纹”**：避免生成式 AI 常用的“廉价”装饰（如渐变描边、极光背景）。
- **OKLCH 色彩系统**：严禁使用 Hex/HSL。所有色彩必须基于感知均匀的 `oklch()` 空间，以保证不同设备间的视觉一致性。
- **节奏重于对称 (Rhythm over Symmetry)**：结果卡片应具有轻微的不对称旋转或偏移，模拟“相册拼贴”的有机感，而非死板的仪表盘网格。
- **禁用反模式 (Ban List)**：
    - **Ban 1**: 严禁在卡片左侧或右侧使用粗边装饰条 (Side-stripe borders)。
- **字体规范**：当前保留 `DM Sans` / `Playfair Display`（待后续重塑），中文使用 `LXGW WenKai`。

### 2.2 移动端优先 (Mobile First)
- **触控热区**：所有点击元素的最小点击面积必须达到 **44px x 44px** (Apple HIG 标准)。
- **交互反馈**：移除所有依赖 `hover` 的核心交互，确保在 iPhone/Android 触摸屏上逻辑闭环。
- **流畅性**：关键交互元素（如上传标签、模式切换）必须开启 `touch-action: manipulation` 消除 300ms 延迟。

### 2.3 技术架构规范
- **Webpack 强制模式**：由于 Next.js 16 默认启用 Turbopack 导致自定义 Webpack Fallback 失效，当前通过 `next dev --webpack` 运行以支持 `fs/zlib` 在客户端的静默降级。
- **环境安全**：局域网开发必须在 `next.config.mjs` 的 `allowedDevOrigins` 中显式允许移动端访问的 IP。
- **HEIC 策略流**：保持 **v5 架构**（客户端 Canvas → 客户端 heic2any 动态引入 → 服务端 Node 兜底）。

---

## 三、已完成里程碑

| 日期 | 状态 | 内容 |
|------|------|------|
| 2026-04-12 | ✅ 已完成 | **设计精修**：全站色彩迁移至 OKLCH，引入非对称网格节奏，移除 Side-stripe 反模式。 |
| 2026-04-11 | ✅ 已完结 | **Multi-Gen 模式**：实现“一图生多文” 1+6 瀑布流输出，支持并发生成与单个导出。 |
| 2026-04-11 | ✅ 故障排除 | **环境重塑**：解决 Next.js 16 构建失败与磁盘损坏导致的 `ERR_INVALID_PACKAGE_CONFIG`。 |
| 2026-04-11 | ✅ 已优化 | **移动端适配**：修复 iPhone 上传无效问题，标准化 44px 触控目标。 |

---

## 四、当前待办任务 (Next Steps)

1. `[ ]` **全流程真机回归**：在真实 iOS (Safari) 和 Android 进行“多重生成 -> 导出图片”的闭环测试。
2. `[ ]` **字体品牌化重塑**：遵循 Impeccable 准则，将过时字体更换为更具性格的配对（如 Bricolage / Chivo）。
3. `[ ]` **Turbopack 迁移评估**：研究如何将目前的 Webpack Fallback 逻辑平滑迁移至 Turbopack，以恢复极致编译速度。
4. `[ ]` **多图上传逻辑复用**：评估是否将 Multi-Gen 的 1+6 逻辑扩展至多图场景。

---

## 五、已知技术债务

| 优先级 | 问题 | 说明 |
|--------|------|------|
| **高** | **Turbopack 绕过** | 目前强行使用 `--webpack` 降级运行，失去了 Turbopack 带来的开发提速。 |
| **中** | **IP 硬编码** | `allowedDevOrigins` 中硬编码了局域网 IP (`192.168.31.2`)，切换环境需手动修改。 |
| **中** | **反射性字体 (Reflex Fonts)** | `Playfair Display` 和 `DM Sans` 属于过度普及的“反射性选择”，建议更换以增加品牌辨识度。 |
| **低** | **Hydration 风险** | 非对称旋转采用了 `index % 2` 逻辑，在 SSR 场景下需监控服务端与客户端是否存在渲染不一致。 |
| **低** | **冗余逻辑** | `MultiGenCard` 与 `ResultCard` 存在视觉逻辑重叠，后续建议合并为统一的展示组件。 |

---

## 六、关键文件速查

- `src/app/globals.css`: **设计系统核心** (OKLCH 变量、全局动画)。
- `src/app/api/generate-copy/route.ts`: 并发生成 API。
- `src/components/results/MultiGenGallery.tsx`: **Multi-Gen 核心交互层** (非对称布局、导出逻辑)。
- `src/components/results/ResultCard.tsx`: 单卡片展示逻辑。
- `next.config.mjs`: 构建与安全路由配置。
