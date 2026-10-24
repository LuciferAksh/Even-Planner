import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Gather — thoughtful events, beautifully planned",
  description:
    "Plan weddings, birthdays, and community events with budgets, timelines, vendor checklists, and Gemini-powered ideas.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
