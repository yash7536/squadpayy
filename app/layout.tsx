import type { Metadata, Viewport } from "next";
import { Epilogue, Plus_Jakarta_Sans } from "next/font/google";
import { SquadPayProvider } from "@/lib/data/store-context";
import { MotionProvider } from "@/components/motion/MotionProvider";
import "./globals.css";

const epilogue = Epilogue({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-epilogue",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://squadpayy.vercel.app",
  ),
  title: {
    default: "SquadPay — Split bills, not friendships",
    template: "%s · SquadPay",
  },
  description:
    "Scan a receipt, split it fairly, and ask for what you're owed without the awkward conversation.",
  icons: {
    icon: "/squadpay-mark.svg",
    apple: "/squadpay-mark.svg",
  },
  openGraph: {
    title: "SquadPay",
    description:
      "Scan a receipt, split it fairly, and ask for what you're owed without the awkward conversation.",
    siteName: "SquadPay",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "SquadPay",
    description:
      "Scan a receipt, split it fairly, and ask for what you're owed without the awkward conversation.",
  },
};

export const viewport: Viewport = {
  themeColor: "#fbf9f5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${epilogue.variable} ${plusJakarta.variable}`}>
      <head>
        {/* Material Symbols is an icon-ligature font, not a next/font Google
            entry, and this is App Router's root layout (not pages/_document),
            so the legacy custom-font warning here doesn't apply. display=swap
            (not optional/block) matters here specifically: this is an icon
            font, so the "fallback" glyph is literal text like "add" — swap
            keeps retrying so it always corrects itself once the font loads,
            instead of permanently freezing on raw icon names. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface text-on-surface min-h-screen">
        <MotionProvider>
          <SquadPayProvider>{children}</SquadPayProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
