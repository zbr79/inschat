import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import Sidebar from "@/components/Sidebar";
import GuestGuides from "@/components/GuestGuides";
import StandaloneMode from "@/components/StandaloneMode";
import ThemeMode from "@/components/ThemeMode";
import ToastProvider from "@/components/ToastProvider";
import { AuthProvider } from "@/lib/authContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "InsChat",
  applicationName: "InsChat",
  manifest: "/manifest.webmanifest",
  description: "A focused chat and health record companion.",
  appleWebApp: {
    capable: true,
    title: "InsChat",
    statusBarStyle: "default",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icons/icon-180.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1d1d1f",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(() => {
              try {
                const mode = localStorage.getItem("inschat_theme");
                const dark = mode === "dark" ||
                  (mode !== "light" &&
                    window.matchMedia("(prefers-color-scheme: dark)").matches);
                document.documentElement.classList.toggle("dark-mode", dark);
                document.documentElement.style.colorScheme = dark ? "dark" : "light";
              } catch {}
            })();`,
          }}
        />
        <StandaloneMode />
        <ThemeMode />
        <AuthProvider>
          <ToastProvider />
          <Suspense>
            <GuestGuides />
          </Suspense>
          <div className="shell">
            <Suspense>
              <Sidebar />
            </Suspense>
            <div className="main">{children}</div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
