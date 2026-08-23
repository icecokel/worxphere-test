import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { MswProvider } from "@/components/msw-provider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "채용 파이프라인 보드",
  description: "지원자의 채용 단계를 관리하는 파이프라인 보드",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <MswProvider>{children}</MswProvider>
      </body>
    </html>
  );
}
