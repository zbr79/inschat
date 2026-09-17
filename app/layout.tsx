import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import Sidebar from "@/components/Sidebar";
import GuestGuides from "@/components/GuestGuides";
import { AuthProvider } from "@/lib/authContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "InsChat",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
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
