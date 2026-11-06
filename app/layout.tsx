import type { Metadata } from "next";
import "./globals.css";
import FeedbackButton from "@/components/FeedbackButton";
import ChatWidget from "@/components/ChatWidget";

export const metadata: Metadata = {
  title: "Wingman Games - 找到你的最佳游戏搭子",
  description: "Wingman Games，为你匹配志同道合的游戏队友。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
        {/* 全局挂载反馈与悬浮聊天框 */}
        <FeedbackButton />
        <ChatWidget />
      </body>
    </html>
  );
}