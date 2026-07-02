import "./globals.css";
import PwaRegister from "@/lib/pwa";

export const metadata = {
  title: "Muslihan Tekstil Mağaza",
  description: "Satış, stok, müşteri, kumaşçı ve çek/senet takip sistemi",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Muslihan", statusBarStyle: "default" },
};

export const viewport = {
  themeColor: "#131417",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
