import './globals.css';

export const metadata = {
  title: 'Belize Travel Buddy - Tour Operators',
  description: 'Find and contact tour operators in Belize',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
