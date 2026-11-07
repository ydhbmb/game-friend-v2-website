import type { Metadata } from "next";
import "./globals.css";
import FeedbackButton from "@/components/FeedbackButton";
import ChatWidget from "@/components/ChatWidget";

export const metadata: Metadata = {
  title: "僚机雷达 - 精准匹配你的神级游戏搭子",
  description: "僚机雷达 (Wingman Radar)，为你扫描全网最契合的游戏队友。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased bg-[#050B14] text-gray-200">
        {children}
        <FeedbackButton />
        <ChatWidget />
      </body>
    </html>
  );
}