import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "民力库存管理",
  description: "产品库存、每日进出货与销量排名管理。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
