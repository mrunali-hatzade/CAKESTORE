'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  isEggless: boolean;
  customMessage?: string;
  shopId: number;
  shopName: string;
  variantId?: number;
  variantName?: string;
  weight?: string | number;
  dietaryPreference?: string;
}

export interface AppliedCouponInfo {
  code: string;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  discountAmount: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => { success: boolean; conflict?: boolean };
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  totalPrice: number;
  totalItems: number;
  currentShopId: number | null;
  currentShopName: string | null;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  appliedCoupon: AppliedCouponInfo | null;
  setAppliedCoupon: (coupon: AppliedCouponInfo | null) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCouponInfo | null>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('cakestore_v2_cart');
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load cart from storage', e);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cakestore_v2_cart', JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save cart to storage', e);
    }
  }, [items]);

  const currentShopId = items.length > 0 ? items[0].shopId : null;
  const currentShopName = items.length > 0 ? items[0].shopName : null;

  const addItem = (newItem: CartItem): { success: boolean; conflict?: boolean } => {
    // If cart contains items from a different shop, flag conflict
    if (items.length > 0 && items[0].shopId !== newItem.shopId) {
      return { success: false, conflict: true };
    }

    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.productId === newItem.productId);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += newItem.quantity;
        if (newItem.customMessage) {
          updated[existingIndex].customMessage = newItem.customMessage;
        }
        return updated;
      }
      return [...prev, newItem];
    });

    return { success: true };
  };

  const removeItem = (productId: number) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
  };

  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalPrice,
        totalItems,
        currentShopId,
        currentShopName,
        isCartOpen,
        setIsCartOpen,
        appliedCoupon,
        setAppliedCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
