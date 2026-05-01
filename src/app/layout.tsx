import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "时间胶囊 · AI 视觉文案",
  description: "上传照片，AI 为你创作独特的极简旁白——听照片开口说话。",
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: "时间胶囊 · AI 视觉文案",
    description: "上传照片，AI 为你创作独特的极简旁白——听照片开口说话。",
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hans">
      <body>
        {children}
        <Script 
          src="https://cloud.umami.is/script.js" 
          data-website-id="6c490776-0e0e-4c3e-bffa-bbddbe879a68" 
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}