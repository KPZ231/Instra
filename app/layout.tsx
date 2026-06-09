import type { Metadata } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import I18nProvider from "@/components/providers/I18nProvider";
import AuthProvider from "@/components/providers/AuthProvider";
import Navbar from "@/components/ui/Navbar";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Instra",
  description: "Institutional-grade fintech SaaS platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${hankenGrotesk.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col pt-[73px]">
        <AuthProvider>
          <I18nProvider>
            <Navbar />
            {children}
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
