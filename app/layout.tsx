import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aura",
  description: "Your people are out there. Let's find them.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FAF7F2",
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
      </body>
    </html>
  );
}
