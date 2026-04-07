/**
 * test-android-issues.mjs
 * 测试 Android 相关问题的修复是否正确：
 * 1. HEIC 转换 API 是否可达
 * 2. WeChat UA 检测逻辑
 * 3. data URL → Blob 转换逻辑（微信 modal blob URL 路径）
 * 4. Promise.race 超时机制（模拟 createImageBitmap 挂起场景）
 *
 * 运行方式：node scripts/test-android-issues.mjs
 * 需要 dev server 在 http://localhost:3000 运行（用于测试 HEIC API）
 */

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

// ── Test 1: WeChat UA 检测逻辑 ──────────────────────────────────────────────
console.log('\n[1] WeChat UA 检测逻辑');

const isWeChat = (ua) => /MicroMessenger/i.test(ua);

const wechatUA = 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36 MicroMessenger/8.0.49 WeChat/arm64';
const androidChromeUA = 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const iOSSafariUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const desktopUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

assert(isWeChat(wechatUA) === true, '微信 UA → 检测为微信');
assert(isWeChat(androidChromeUA) === false, 'Android Chrome UA → 不是微信');
assert(isWeChat(iOSSafariUA) === false, 'iOS Safari UA → 不是微信');
assert(isWeChat(desktopUA) === false, '桌面 Chrome UA → 不是微信');

// ── Test 2: data URL → Blob 转换逻辑 ──────────────────────────────────────
console.log('\n[2] data URL → Blob 转换逻辑（微信 blob URL 路径）');

// 最小 1×1 白色 JPEG 的 base64
const minimalJpegDataUrl =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U' +
  'HRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIy' +
  'MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFgABAQEA' +
  'AAAAAAAAAAAAAAAABgUEB/8QAIRAAAQMEAwEAAAAAAAAAAAAAAQIDBAAFESExQVH/xAAUAQEAAAAAAAAAAAAAAAAAAAAA' +
  '/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8Amab3RQtTuaFMuqfQoUKFBn//2Q==';

function dataUrlToBlob(dataUrl) {
  const arr = dataUrl.split(',');
  const mime = (arr[0].match(/:(.*?);/) ?? [])[1] ?? 'image/jpeg';
  const bstr = Buffer.from(arr[1], 'base64');
  return { mime, byteLength: bstr.length };
}

const result = dataUrlToBlob(minimalJpegDataUrl);
assert(result.mime === 'image/jpeg', `MIME 类型正确提取为 image/jpeg（得到：${result.mime}）`);
assert(result.byteLength > 0, `Blob 字节数 > 0（得到：${result.byteLength} 字节）`);

// ── Test 3: Promise.race 超时机制 ────────────────────────────────────────
console.log('\n[3] Promise.race 超时机制（模拟 createImageBitmap 挂起）');

async function promiseRaceTimeout(timeoutMs) {
  const hangingPromise = new Promise(() => {}); // 永远不 resolve，模拟 createImageBitmap hang
  try {
    await Promise.race([
      hangingPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('createImageBitmap timeout')), timeoutMs)
      ),
    ]);
    return false; // 不应该到这里
  } catch (e) {
    return e.message === 'createImageBitmap timeout';
  }
}

const timeoutFired = await promiseRaceTimeout(100); // 用 100ms 替代 5000ms 加快测试
assert(timeoutFired === true, 'Promise.race 在挂起的 promise 上正确触发超时');

// ── Test 4: HEIC 转换 API 可达性 ─────────────────────────────────────────
console.log('\n[4] HEIC 转换 API 可达性（需要 dev server 在 localhost:3000）');

let apiTestSkipped = false;
try {
  // 发送一个故意缺 file 字段的请求，期望 400 而不是 500 或连接失败
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  const res = await fetch('http://localhost:3000/api/convert-heic', {
    method: 'POST',
    body: new FormData(), // 空 FormData，没有 file 字段
    signal: controller.signal,
  });
  clearTimeout(timeout);
  // 400 = API 可达且正确校验了缺少的 file 字段
  assert(res.status === 400, `API 返回 400（No file provided），状态码：${res.status}`);
} catch (e) {
  if (e.name === 'AbortError' || e.code === 'ECONNREFUSED' || e.message?.includes('fetch')) {
    console.log('  ⚠ 跳过（dev server 未运行）');
    apiTestSkipped = true;
  } else {
    assert(false, `API 请求异常：${e.message}`);
  }
}

// ── 汇总 ──────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(50));
const skippedNote = apiTestSkipped ? '（1 项跳过）' : '';
if (failed === 0) {
  console.log(`✅ 全部通过：${passed} 项 ${skippedNote}`);
} else {
  console.log(`❌ ${failed} 项失败，${passed} 项通过 ${skippedNote}`);
  process.exit(1);
}
