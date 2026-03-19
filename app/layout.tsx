import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "48-Hour Pilot | SquareUp",
  description:
    "Get a decision-ready customer research brief in 48 hours. SquareUp runs multilingual interviews at scale. Every recommendation backed by real quotes and evidence you can audit.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
