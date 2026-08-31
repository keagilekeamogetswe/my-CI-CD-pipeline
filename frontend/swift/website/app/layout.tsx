import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Swift Secure Onboarding",
  description: "Phone-first onboarding, recovery, and secure session setup.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
