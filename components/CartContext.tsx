"use client";

import React, { useEffect, useState, useContext, createContext, ReactNode } from "react";

// Define CartItem type
export interface CartItem {
  _id: string;
  quantity: number;
  price: number;
  foodId: {
    _id: string;
    foodName: string;
    imageUrl?: string;
    image?: { asset?: { url?: string } };
    shopRef?: { shopName?: string };
  };
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  decrement: (id: string) => void;
  deleteItem: (id: string) => void;
  clearCart: () => void;
  updateQuantity: (id: string, quantity: number) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("cart");
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (item: CartItem) => {
    setCartItems((prev) => {
      const idx = prev.findIndex((i) => i.foodId._id === item.foodId._id);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx].quantity += item.quantity;
        return updated;
      }
      return [...prev, item];
    });
  };

  const decrement = (id: string) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item._id === id ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const deleteItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item._id !== id));
  };

  const clearCart = () => setCartItems([]);

  const updateQuantity = (id: string, quantity: number) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item._id === id ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    );
  };

  return (
    <CartContext.Provider value={{ cartItems, addToCart, decrement, deleteItem, clearCart, updateQuantity }}>
      {children}
    </CartContext.Provider>
  );
}; 