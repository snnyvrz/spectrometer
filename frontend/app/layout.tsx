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
        <body suppressHydrationWarning>{children}</body>
      </html>
    </>
  );
}
