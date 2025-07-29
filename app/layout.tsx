import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { CartProvider } from "@/components/CartContext";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "WeDine - Smart Campus Dining",
  description: "Smart campus dining with real-time payments, RFID pickup verification, and seamless ordering experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  

  return (
    <ClerkProvider
      appearance={{
        elements: {
          formButtonPrimary: "bg-[var(--color-tomato)] hover:bg-[var(--color-coral)] text-white",
          card: "bg-white/90 backdrop-blur-md border border-white/30",
          headerTitle: "text-[var(--color-tomato)] font-poppins",
          headerSubtitle: "text-[var(--color-deep-blue)]",
          socialButtonsBlockButton: "bg-[var(--color-yellow)] text-[var(--color-deep-blue)] hover:bg-[var(--color-tomato)]",
          formFieldInput: "border-[var(--color-coral)] focus:border-[var(--color-tomato)]",
          footerActionLink: "text-[var(--color-tomato)] hover:text-[var(--color-coral)]",
        },
        variables: {
          colorPrimary: "#FF4B3E",
          colorText: "#2B2D42",
          colorBackground: "#FFF3E2",
        },
      }}
    >
      <html lang="en" className={inter.variable}>
        <head>
          <Script
            src="https://checkout.razorpay.com/v1/checkout.js"
            strategy="beforeInteractive"
          />
        </head>
        <body className="font-poppins antialiased">
          
          <CartProvider>
            {children}
          </CartProvider>
          <Toaster 
            position="top-right"
            richColors
            closeButton
            duration={4000}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
