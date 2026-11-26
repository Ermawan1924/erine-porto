import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Erine Palba Febmiani – Illustrator & Graphic Designer",
  description: "Portfolio of Erine Palba Febmiani: illustration, mascot, character, packaging and apparel design from Indonesia.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
