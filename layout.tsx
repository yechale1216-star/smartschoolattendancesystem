import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Smart Attendance Tracker - School Management System",
  description: "School attendance tracking and management system",
  manifest: "/manifest.json",
  themeColor: "#2563eb",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Attendance Tracker",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Attendance Tracker",
    title: "Smart Attendance Tracker - School Management System",
    description: "School attendance tracking and management system",
  },
  twitter: {
    card: "summary",
    title: "Smart Attendance Tracker - School Management System",
    description: "School attendance tracking and management system",
  },
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="application-name" content="Attendance Tracker" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Attendance Tracker" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#2563eb" />

        <link rel="apple-touch-icon" href="/icon-192.jpg" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.jpg" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.jpg" />

        <link rel="icon" type="image/png" sizes="32x32" href="/icon-192.jpg" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icon-192.jpg" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="shortcut icon" href="/icon-192.jpg" />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
