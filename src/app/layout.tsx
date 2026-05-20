import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Providers from "@/components/providers";
import { ToastProvider } from "@/components/Toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
  title: "SecureChat",
  description: "Secure real-time chat with end-to-end encryption",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ErrorBoundary>
          <ToastProvider>
            <Providers>
              <header className="h-14 shrink-0 border-b flex items-center px-4 bg-surface">
                <span className="font-semibold text-sm tracking-wide text-accent">
                  SecureChat
                </span>
              </header>
              <main className="flex-1 flex">{children}</main>
              <footer className="h-8 shrink-0 border-t flex items-center justify-center px-4">
                <span className="text-[10px] text-muted">
                  &copy; {new Date().getFullYear()} SecureChat
                </span>
              </footer>
            </Providers>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
