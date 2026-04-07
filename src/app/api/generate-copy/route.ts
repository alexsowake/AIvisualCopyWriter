import { NextResponse } from 'next/server';
import { SYSTEM_PROMPT, QUOTE_SYSTEM_PROMPT } from '@/config/systemPrompt';

export const maxDuration = 60;

export async function GET() {
    return NextResponse.json({ modelName: 'Gemini 3 Flash' });
}

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const image = formData.get('image') as File | null;
        const prompt = formData.get('prompt') as string | null;
        const modelProvider = formData.get('modelProvider') as string || 'gemini';
        const copyMode = formData.get('copyMode') as string || 'ai-original';
        
        // 从前端接收预处理好的元数据
        const metadataDate = formData.get('metadataDate') as string | null;
        const metadataLocation = formData.get('metadataLocation') as string | null;

        if (!image) {
            return NextResponse.json({ error: '缺少图片' }, { status: 400 });
        }

        // 构建元数据提示
        const metadataHint = `\n\n[图片元数据]\n- 拍摄日期：${metadataDate || '无法获取'}\n- 拍摄地点：${metadataLocation || '无法获取'}`;

        // 将图片转换为 base64
        const arrayBuffer = await image.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Data = buffer.toString('base64');
        const mimeType = image.type || 'image/jpeg';

        const systemPrompt = copyMode === 'quote-style' ? QUOTE_SYSTEM_PROMPT : SYSTEM_PROMPT;

        const basePrompt = prompt ? `用户补充要求: ${prompt}\n` : '请根据系统设定生成文案\n';
        const userTextPrompt = copyMode === 'ai-original' ? basePrompt + metadataHint : basePrompt;

        if (modelProvider === 'kimi') {
            const kimiProxySecret = process.env.KIMI_PROXY_SECRET || '';

            const response = await fetch(`${process.env.KIMI_PROXY_URL}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Proxy-Key': kimiProxySecret
                },
                body: JSON.stringify({
                    model: 'kimi-k2.5',
                    temperature: 1,
                    max_tokens: 1024,
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
                    return NextResponse.json({ error: 'Kimi 专属通道口令错误' }, { status: 403 });
                }
                return NextResponse.json({ error: `Kimi API 请求失败: ${response.status}` }, { status: response.status });
            }

            const data = await response.json();
            const resultText = data.choices?.[0]?.message?.content;
            return NextResponse.json({ result: resultText });
        }

        if (modelProvider === 'qwen') {
            const qwenApiKey = process.env.QWEN_API_KEY || '';
            const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${qwenApiKey}`
                },
                body: JSON.stringify({
                    model: 'qwen-vl-max',
                    max_tokens: 1024,
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
            if (!response.ok) return NextResponse.json({ error: data.error?.message || '生成失败' }, { status: response.status });
            return NextResponse.json({ result: data.choices?.[0]?.message?.content });
        }

        // Gemini 接口
        const geminiProxyUrl = process.env.GEMINI_PROXY_URL || 'https://gemini.wdqs.cn';
        const geminiProxySecret = process.env.GEMINI_PROXY_SECRET || '';

        const response = await fetch(`${geminiProxyUrl}/v1beta/models/gemini-flash-latest:generateContent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Proxy-Key': geminiProxySecret
            },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                generationConfig: {
                    maxOutputTokens: 1024,
                    temperature: 0.7
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

        if (!response.ok) return NextResponse.json({ error: `代理被拦截: ${response.status}` }, { status: response.status });
        const data = await response.json();
        return NextResponse.json({ result: data.candidates?.[0]?.content?.parts?.[0]?.text });

    } catch (error: unknown) {
        console.error('API Route Error:', error);
        return NextResponse.json({ error: (error instanceof Error ? error.message : '服务器内部错误') }, { status: 500 });
    }
}
