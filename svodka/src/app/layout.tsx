import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Сводка — контроль рекламы и сайта",
  description: "Состояние бизнеса по рекламе и сайту за 30 секунд",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-amber-200 bg-amber-50 px-4 py-2 text-center text-[13px] text-amber-700">
          Сайт в разработке. Некоторые функции могут быть недоступны.
        </div>
      </body>
    </html>
  );
}
