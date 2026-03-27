import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from '@/components/theme-provider';
import { Providers } from '@/components/providers';
import { DashboardShell } from '@/components/dashboard-shell';
import { SwRegister } from '@/components/pwa/sw-register';
import './globals.css';

export const viewport: Viewport = {
  themeColor: "#09090b",
  minimumScale: 1,
  initialScale: 1,
  width: "device-width",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: 'PDE Dashboard',
  description: 'Remote monitoring for Platform Development Engine',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PDE Dashboard',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${GeistSans.variable} ${GeistMono.variable}`}
        suppressHydrationWarning
      >
        <body className="font-sans bg-background text-foreground">
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <Providers>
              <DashboardShell>
                {children}
              </DashboardShell>
            </Providers>
          </ThemeProvider>
          <SwRegister />
        </body>
      </html>
    </ClerkProvider>
  );
}
