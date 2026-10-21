import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OfficeProvider } from "@/components/office-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Shell } from "@/components/shell";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

export const metadata: Metadata = {
  title: "Sphere · Archibald Real Estate Group",
  description:
    "Kayla’s past-client desk for Archibald Real Estate Group at RE/MAX Crest Realty in Vancouver.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} antialiased`}>
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
