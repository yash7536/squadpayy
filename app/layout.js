import { Inter } from "next/font/google";
import "./globals.css";

// The Figma prototype specifies Inter as the typeface, so we use it here
// instead of the create-next-app default (Geist).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "SquadPay",
  description: "A friendly bill-splitting and repayment tracker.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white">{children}</body>
    </html>
  );
}
