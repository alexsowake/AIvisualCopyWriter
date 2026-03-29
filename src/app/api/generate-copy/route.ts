import { NextResponse } from 'next/server';
import { SYSTEM_PROMPT, QUOTE_SYSTEM_PROMPT } from '@/config/systemPrompt';
import exifr from 'exifr';

export async function GET() {
    return NextResponse.json({ modelName: 'Gemini 3 Flash' });
}

// 从 EXIF 数据中提取日期
function formatExifDate(exifData: Record<string, unknown>): string | null {
    const dateField = exifData?.DateTimeOriginal || exifData?.CreateDate || exifData?.ModifyDate;
    if (!dateField) return null;

    try {
        const d = dateField instanceof Date ? dateField : new Date(dateField as string | number);
        if (isNaN(d.getTime())) return null;
        return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    } catch {
        return null;
    }
}

// 反向地理编码：将 GPS 坐标转为地名
async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&accept-language=zh`,
            { headers: { 'User-Agent': 'VisualCopywriter/1.0' } }
        );
        if (!res.ok) return null;
        const data = await res.json();
        // 尝试组合有意义的地名
        const addr = data.address;
        if (!addr) return data.display_name || null;

        const parts: string[] = [];
        if (addr.country && addr.country !== '中国' && addr.country !== 'China') parts.push(addr.country);
        if (addr.state || addr.province) parts.push(addr.state || addr.province);
        if (addr.city || addr.town || addr.county) parts.push(addr.city || addr.town || addr.county);
        if (addr.suburb || addr.district) parts.push(addr.suburb || addr.district);
        
        return parts.length > 0 ? parts.join(' ') : (data.display_name || null);
    } catch (e) {
        console.error('Reverse geocode error:', e);
        return null;
    }
}

// 从原始图片中提取 EXIF 元数据
async function extractMetadata(file: File): Promise<{ date: string | null; location: string | null }> {
    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const exifData = await exifr.parse(buffer, {
            pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'GPSLatitude', 'GPSLongitude', 'latitude', 'longitude']
        });
        
        if (!exifData) return { date: null, location: null };

        const date = formatExifDate(exifData);

        let location: string | null = null;
        const lat = exifData.latitude ?? exifData.GPSLatitude;
        const lon = exifData.longitude ?? exifData.GPSLongitude;
        if (typeof lat === 'number' && typeof lon === 'number') {
            location = await reverseGeocode(lat, lon);
        }

        return { date, location };
    } catch (e) {
        console.error('EXIF extraction error:', e);
        return { date: null, location: null };
    }
}

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const image = formData.get('image') as File | null;
        const originalImage = formData.get('originalImage') as File | null;
        const prompt = formData.get('prompt') as string | null;
        const modelProvider = formData.get('modelProvider') as string || 'gemini';
        const copyMode = formData.get('copyMode') as string || 'ai-original';

        if (!image) {
            return NextResponse.json({ error: '缺少图片' }, { status: 400 });
        }

        // 从原始图片提取元数据（日期和地点）
        const metadata = originalImage ? await extractMetadata(originalImage) : { date: null, location: null };
        console.log('Extracted metadata:', metadata);

        // 构建元数据提示
        const metadataHint = `\n\n[图片元数据]\n- 拍摄日期：${metadata.date || '无法获取'}\n- 拍摄地点：${metadata.location || '无法获取'}`;

        // 将图片转换为 base64
        const arrayBuffer = await image.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Data = buffer.toString('base64');
        const mimeType = image.type || 'image/jpeg';

        const systemPrompt = copyMode === 'quote-style' ? QUOTE_SYSTEM_PROMPT : SYSTEM_PROMPT;

        const basePrompt = prompt ? `用户补充要求: ${prompt}\n` : '请根据系统设定生成文案\n';
        const userTextPrompt = copyMode === 'ai-original' ? basePrompt + metadataHint : basePrompt;

        if (modelProvider === 'kimi') {
            const response = await fetch(`${process.env.KIMI_PROXY_URL}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Proxy-Key': process.env.KIMI_PROXY_SECRET || ''
                },
                body: JSON.stringify({
                    model: 'kimi-k2.5',
                    temperature: 1,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'image_url',
                                    image_url: { url: `data:${mimeType};base64,${base64Data}` }
                                },
                                {
                                    type: 'text',
                                    text: userTextPrompt
                                }
                            ]
                        }
                    ]
                })
            });

            if (!response.ok) {
                if (response.status === 403) {
                    return NextResponse.json({ error: 'Kimi 专属通道口令错误或无权访问，请检查环境变量配置' }, { status: 403 });
                }
                const errorText = await response.text();
                console.error('Kimi API Error Status:', response.status);
                console.error('Kimi API Error Text:', errorText.substring(0, 300));
                return NextResponse.json({ error: `Kimi API 请求失败: ${response.status} ${errorText.substring(0, 100)}` }, { status: response.status });
            }

            const data = await response.json();
            const resultText = data.choices?.[0]?.message?.content;

            if (!resultText) {
                return NextResponse.json({ error: 'Kimi 未返回任何文本内容' }, { status: 500 });
            }

            return NextResponse.json({ result: resultText });
        }

        if (modelProvider === 'qwen') {
            const qwenApiKey = process.env.QWEN_API_KEY || '';
            if (!qwenApiKey) {
                return NextResponse.json({ error: 'Qwen API Key 未配置，请在 .env.local 中设置 QWEN_API_KEY' }, { status: 500 });
            }
            const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${qwenApiKey}`
                },
                body: JSON.stringify({
                    model: 'qwen-vl-max',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'image_url',
                                    image_url: { url: `data:${mimeType};base64,${base64Data}` }
                                },
                                {
                                    type: 'text',
                                    text: userTextPrompt
                                }
                            ]
                        }
                    ]
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('Qwen API Error:', data);
                return NextResponse.json({ error: data.error?.message || '生成文案失败' }, { status: response.status });
            }

            const resultText = data.choices?.[0]?.message?.content;

            if (!resultText) {
                return NextResponse.json({ error: 'AI 未返回任何文本内容' }, { status: 500 });
            }

            return NextResponse.json({ result: resultText });
        }

        // 默认调用 Gemini 模型接口（通过代理）
        const geminiProxyUrl = process.env.GEMINI_PROXY_URL || 'https://gemini.wdqs.cn';
        const geminiProxySecret = process.env.GEMINI_PROXY_SECRET || '';

        const response = await fetch(`${geminiProxyUrl}/v1beta/models/gemini-flash-latest:generateContent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:3000',
                'X-Proxy-Key': geminiProxySecret // [!] 新增的鉴权暗号
            },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                contents: [
                    {
                        parts: [
                            { text: userTextPrompt },
                            {
                                inlineData: {
                                    mimeType: mimeType,
                                    data: base64Data,
                                }
                            }
                        ]
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Proxy Error Status:', response.status);
            console.error('Proxy Error Text:', errorText.substring(0, 300));
            return NextResponse.json({ error: `代理被拦截: ${response.status} ${errorText.substring(0, 100)}` }, { status: response.status });
        }

        const data = await response.json();

        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!resultText) {
            return NextResponse.json({ error: 'AI 未返回任何文本内容' }, { status: 500 });
        }

        return NextResponse.json({ result: resultText });

    } catch (error: unknown) {
        console.error('API Route Error:', error);
        return NextResponse.json({ error: (error instanceof Error ? error.message : '服务器内部错误') }, { status: 500 });
    }
}
