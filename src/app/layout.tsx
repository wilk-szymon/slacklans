import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionChrome } from "@/components/SessionChrome";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Slacklans",
  description: "Miejsca i sesje slackline w Gdyni.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionChrome />
        {children}
      </body>
    </html>
  );
}
