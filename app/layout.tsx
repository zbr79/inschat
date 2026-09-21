import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import Sidebar from "@/components/Sidebar";
import GuestGuides from "@/components/GuestGuides";
import StandaloneMode from "@/components/StandaloneMode";
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
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StandaloneMode />
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
