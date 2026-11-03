import type { Metadata } from "next";
import "./globals.css";

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
      </body>
    </html>
  );
}