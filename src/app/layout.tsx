import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { FloatingCta } from "~/components/floating-cta";
import { Footer } from "~/components/footer";
import { Navbar } from "~/components/navbar";
import { ThemeProvider } from "./theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Acuity Photos",
  description:
    "Acuity Photos helps people with overwhelming photo libraries use smart technology to effortlessly organize, clean, and rediscover their pictures.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <Navbar />
          {children}
          <Footer />
          <FloatingCta />
        </ThemeProvider>
      </body>
    </html>
  );
}
