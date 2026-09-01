import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { FloatingCtaGate } from "~/components/floating-cta-gate";
import { Footer } from "~/components/footer";
import { Navbar } from "~/components/navbar";
import { env } from "~/env";
import { ThemeProvider } from "./theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const title = "Acuity Photos";
const description =
  "Acuity Photos helps people with overwhelming photo libraries use smart technology to effortlessly organize, clean, and rediscover their pictures.";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
    siteName: title,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
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
          <FloatingCtaGate />
        </ThemeProvider>
      </body>
    </html>
  );
}
