import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Interactive-Edu • AI-Driven Visual Simulator',
  description: 'Transform educational prompts into live, interactive simulations for Math, Physics, Chemistry & History.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" async></script>
      </head>
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
} 