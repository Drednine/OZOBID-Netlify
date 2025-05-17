import { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OZOBID - Управление ставками на Озон',
  description: 'Платформа для автоматизации управления ставками и товарами на маркетплейсе Озон',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
