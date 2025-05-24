
import type {Metadata} from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script'; 
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer"; 
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider"; 
import { siteConfig } from '@/config/site';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico", 
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased min-h-screen bg-background flex flex-col`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark" // Keep dark as default from previous preference
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <Header />
            <main className="flex-1 flex flex-col">{children}</main> 
            <Toaster />
            <Footer /> 
          </AuthProvider>
        </ThemeProvider>

        {/* 
          Tawk.to Live Chat Widget Script 
          IMPORTANT: Replace YOUR_PROPERTY_ID and YOUR_WIDGET_ID with your actual IDs from Tawk.to dashboard.
        */}
        <Script id="tawk-to-script" strategy="afterInteractive">
          {`
            var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
            (function(){
            var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
            s1.async=true;
            // IMPORTANT: Replace YOUR_PROPERTY_ID and YOUR_WIDGET_ID with your actual IDs
            s1.src='https://embed.tawk.to/YOUR_PROPERTY_ID/YOUR_WIDGET_ID'; 
            s1.charset='UTF-8';
            s1.setAttribute('crossorigin','*');
            s0.parentNode.insertBefore(s1,s0);
            })();
          `}
        </Script>
      </body>
    </html>
  );
}
