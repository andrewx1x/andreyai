import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CookieBanner } from "@/components/cookie-banner";

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
        <CookieBanner />
        {process.env.NEXT_PUBLIC_DEV_BANNER === "true" && (
          <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-amber-200 bg-amber-50 px-4 py-2 text-center text-[13px] text-amber-700">
            Сайт в разработке. Некоторые функции могут быть недоступны.
          </div>
        )}
        {/* Yandex Metrika */}
        {process.env.NEXT_PUBLIC_YM_ID && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
                m[i].l=1*new Date();
                for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r)return;}
                k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
                (window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
                ym(${process.env.NEXT_PUBLIC_YM_ID},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});
              `,
            }}
          />
        )}
      </body>
    </html>
  );
}
