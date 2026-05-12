import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "雲端自助掃描 | Cloud Scan",
  description: "Cloud Document Scan System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className="antialiased bg-black text-white">
        {children}
      </body>
    </html>
  );
}