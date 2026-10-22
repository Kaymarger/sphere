import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OfficeProvider } from "@/components/office-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Shell } from "@/components/shell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Sphere · Archibald Real Estate Group",
  description:
    "Kayla’s past-client desk for Archibald Real Estate Group at RE/MAX Crest Realty in Vancouver.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <TooltipProvider>
            <OfficeProvider>
              <Shell>{children}</Shell>
            </OfficeProvider>
            <Toaster position="top-center" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
