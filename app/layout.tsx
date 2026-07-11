import type { Metadata } from "next";
import { Geist, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, abs } from "@/lib/site";
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
  // Without metadataBase, every Open Graph and canonical URL Next writes is
  // RELATIVE, and the social scrapers and Google ignore relative ones. This one
  // line is what makes the canonical tags on every page below actually work.
  metadataBase: new URL(SITE_URL),
  title: "Glufloat | Know if a food is right for your diabetes, before you eat it",
  description:
    "Check any Nigerian food or your whole meal. Glufloat gives you a clear green, yellow, or red answer, plus the simple fix that makes it safe for your sugar. 3 days free, then N1,500 a month.",
  alternates: { canonical: "/" },
  icons: {
    icon: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Glufloat | Eat your food again, without the fear",
    description:
      "Green, yellow, or red answers on 1,400+ Nigerian foods, with the simple fix that turns your meal green. Made for people living with diabetes.",
    type: "website",
    siteName: SITE_NAME,
    locale: "en_NG",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Glufloat | Eat your food again, without the fear",
    description:
      "Green, yellow, or red answers on 1,400+ Nigerian foods, with the fix that turns your meal green.",
  },
};

/**
 * Site-level structured data. Told once, in the layout, so every page carries
 * it: who publishes this, and what the site is called. Google uses it to build
 * the knowledge panel and the sitelinks.
 */
const orgLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": abs("/#organization"),
      name: SITE_NAME,
      url: abs("/"),
      logo: { "@type": "ImageObject", url: abs("/icon.png") },
      description: SITE_DESCRIPTION,
      areaServed: { "@type": "Country", name: "Nigeria" },
    },
    {
      "@type": "WebSite",
      "@id": abs("/#website"),
      url: abs("/"),
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      publisher: { "@id": abs("/#organization") },
      inLanguage: "en-NG",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-NG"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
