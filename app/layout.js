import { Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({ 
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: '--font-sora'
});

export const metadata = {
  title: "Elan Book Mark",
  description: "Your personal bookmark manager",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        {/* We use Font Awesome for icons */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
      </head>
      <body className={sora.className}>{children}</body>
    </html>
  );
}