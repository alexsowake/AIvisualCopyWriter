import { NextResponse } from 'next/server';

export const runtime = 'nodejs'; // 强制使用 Node.js 运行时以兼容 heic-convert 依赖的 Buffer/fs 逻辑

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Convert the HEIC file to JPEG using heic-convert
    // @ts-expect-error - heic-convert does not have type declarations
    const { default: convert } = await import('heic-convert');
    const convertedBuffer = await convert({
      buffer: buffer,
      format: 'JPEG',
      quality: 0.8
    });
    
    return new NextResponse(convertedBuffer, {
      headers: {
        'Content-Type': 'image/jpeg'
      }
    });
  } catch (err: unknown) {
    console.error('HEIC Converter Error:', err);
    return NextResponse.json({ error: 'HEIC Conversion failed: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}

