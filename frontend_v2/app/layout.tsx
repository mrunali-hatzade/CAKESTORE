import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { CustomerAuthProvider } from '@/lib/auth/CustomerAuthContext';
import { ToastProvider } from '@/components/common/Toast';
import { CartProvider } from '@/context/CartContext';
import { FavoritesProvider } from '@/context/FavoritesContext';

export const metadata: Metadata = {
  title: 'CakeStore — Artisanal Bakery SaaS Platform',
  description: 'Discover handcrafted artisanal cakes from top local bakeries or manage your bakery business seamlessly.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-brand-cream-light font-sans text-brand-espresso antialiased">
        <AuthProvider>
          <CustomerAuthProvider>
            <ToastProvider>
              <CartProvider>
                <FavoritesProvider>{children}</FavoritesProvider>
              </CartProvider>
            </ToastProvider>
          </CustomerAuthProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
