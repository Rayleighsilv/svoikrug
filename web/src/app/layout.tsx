import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { CityProvider } from "@/contexts/CityContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

// Применяем сохранённую тему до первой отрисовки, чтобы не было вспышки светлой темы.
const themeScript = `(function(){try{var t=localStorage.getItem('sk_theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}var d=t==='dark';document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=t}catch(e){}})()`;

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "SvoiKrug - Квартирники",
  description: "Социальная сеть для организации камерных встреч",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans`}
      >
        <ThemeProvider>
          <AuthProvider>
            <CityProvider>{children}</CityProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
