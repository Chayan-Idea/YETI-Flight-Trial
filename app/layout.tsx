import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "YETI Flight Trial Library",
  description: "Private document library for authorized YETI Flight Trial team members.",
  applicationName: "YETI Library", manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "YETI Library" }
};
export const viewport: Viewport = { themeColor: "#102b4e", width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
