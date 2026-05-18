import { ModeToggle } from "@/components/mode-toggler";
import { ThemeProvider } from "@/components/theme-provider";
import { Suspense } from "react";

export const metadata = {
  title: "Monipa",
  description:
    "Monipa is a Spectrometer Control Panel built with Next.js and React.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <html lang="en" suppressHydrationWarning>
        <head />
        <body suppressHydrationWarning>
          <Suspense>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <header className="flex items-center justify-center w-full h-24 border-b">
                <div className="container flex items-center justify-between p-8">
                  <h1 className="text-3xl font-bold">Monipa</h1>
                  <ModeToggle />
                </div>
              </header>
              {children}
            </ThemeProvider>
          </Suspense>
        </body>
      </html>
    </>
  );
}
