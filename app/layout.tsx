import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stada MBR | The AI Challenge",
  description: "A little curiosity. A little competition. Ten questions to explore AI together.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
