import { Providers } from '@/components/providers';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OpenPaddy — Nền tảng điều phối lúa gạo minh bạch',
  description:
    'OpenPaddy PoC: Giám sát tuân thủ canh tác bền vững và truy xuất nguồn gốc lúa gạo Đồng bằng sông Cửu Long.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
