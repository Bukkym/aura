import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import FeedbackWidget from "@/components/FeedbackWidget";

export const metadata: Metadata = {
  title: "aura · meet people you click with",
  description: "Meet people you click with, then keep seeing them.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#F6F2E9",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@500,700&display=swap"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&display=swap"
        />
      </head>
      {/*
        suppressHydrationWarning is here to silence the React hydration
        warning produced by browser extensions (Bitdefender's `bis_register`,
        LastPass's `__processed_*`, Dark Reader, Grammarly, etc.) that
        inject attributes onto the <body> tag before React hydrates. The
        prop only suppresses warnings on direct attributes of this element;
        children still hydrate normally.
      */}
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
        <FeedbackWidget />
      </body>
    </html>
  );
}
