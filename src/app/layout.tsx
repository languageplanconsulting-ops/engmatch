import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/lib/page-builders";

export const metadata: Metadata = {
  title: "Engmatch IELTS Practice",
  description: "IELTS practice app for listening, reading, speaking, and writing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
