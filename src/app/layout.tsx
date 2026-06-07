import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LeadFlow CRM",
  description: "Enterprise SaaS Lead Management Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${inter.variable} font-sans h-full antialiased`}
      >
        <head>
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#7C3AED" />
        </head>
        <body className="min-h-full flex flex-col bg-background text-foreground">
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster richColors position="top-right" />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  function registerSW() {
                    navigator.serviceWorker.register('/sw.js').then(function(registration) {
                      console.log('ServiceWorker registration successful');
                    }, function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    });
                  }
                  if (document.readyState === 'complete') {
                    registerSW();
                  } else {
                    window.addEventListener('load', registerSW);
                  }
                }
              `,
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
