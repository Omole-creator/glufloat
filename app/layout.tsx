import type { Metadata } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
});

const body = Instrument_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Glufloat | Know if a food is right for your diabetes, before you eat it",
  description:
    "Search any Nigerian food or build your full plate. Glufloat gives you a clear green, yellow, or red answer, plus the exact fix that makes your meal safer. 7-day free trial, then N1,500 a month.",
  icons: {
    icon: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Glufloat | Eat your food again, without the fear",
    description:
      "Green, yellow, or red answers on 143 Nigerian foods, with the exact fix that turns your plate green. Built for people living with diabetes.",
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
