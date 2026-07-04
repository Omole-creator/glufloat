import type { Metadata } from "next";
import { Geist, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const display = Geist({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Glufloat | Know if a food is right for your diabetes, before you eat it",
  description:
    "Check any Nigerian food or your whole meal. Glufloat gives you a clear green, yellow, or red answer, plus the simple fix that makes it safe for your sugar. 7 days free, then N1,500 a month.",
  icons: {
    icon: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Glufloat | Eat your food again, without the fear",
    description:
      "Green, yellow, or red answers on 250+ Nigerian foods, with the simple fix that turns your meal green. Made for people living with diabetes.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
