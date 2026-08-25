import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MuScriptor — Audio/Video → MIDI',
  description: 'Multi-platform music transcription via the MuScriptor 1.3B model.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}