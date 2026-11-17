import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orion Bioinsumos Dashboard",
  description: "Dashboard acadêmico de condições e rendimento estimado para aplicação de bioinsumos.",
  icons: {
    icon: "/orion-logo.png",
    shortcut: "/orion-logo.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
