import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "时间胶囊 · AI 视觉文案",
  description: "上传照片，AI 为你创作独特的极简旁白——听照片开口说话。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hans">
      <body>{children}</body>
    </html>
  );
}
