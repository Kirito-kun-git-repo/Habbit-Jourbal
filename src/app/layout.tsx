import type { Metadata, Viewport } from "next";
import { Courier_Prime, Inter, Lexend, Montserrat, Poppins } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", display: "swap" });
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});
const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend", display: "swap" });
const courier = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-courier",
  display: "swap",
});

const fontVars = [inter, montserrat, poppins, lexend, courier].map((f) => f.variable).join(" ");

export const metadata: Metadata = {
  // `template` keeps "Habit Journal" in the tab even on nested routes.
  title: { default: "Habit Journal", template: "%s · Habit Journal" },
  description: "A habit tracker that remembers what actually happened.",
  applicationName: "Habit Journal",
  appleWebApp: { title: "Habit Journal" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Applies the saved theme before first paint so the page never flashes the
// default one on the way to the chosen one.
const NO_FLASH = `
try {
  var s = JSON.parse(localStorage.getItem("habit-journal/settings") || "{}").state || {};
  document.documentElement.dataset.theme = s.theme || "warm";
  document.documentElement.dataset.font = s.font || "inter";
} catch (e) {
  document.documentElement.dataset.theme = "warm";
  document.documentElement.dataset.font = "inter";
}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVars} data-theme="warm" data-font="inter">
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
