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
  addToCart: (item: CartItem) => Promise<{ success: boolean; error?: string }>;
  decrement: (id: string) => void;
  deleteItem: (id: string) => void;
  clearCart: () => void;
  updateQuantity: (id: string, quantity: number) => Promise<{ success: boolean; error?: string }>;
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

  const addToCart = async (item: CartItem): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log(`🛒 Adding ${item.foodId.foodName} to cart - checking stock...`);
      
      // Fetch current stock from API
      const response = await fetch(`/api/food-items/${item.foodId._id}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch item details');
      }
      
      const foodItem = await response.json();
      const availableStock = foodItem.quantity || 0;
      
      // Check if stock is managed for this item
      if (foodItem.quantity !== null && foodItem.quantity !== undefined) {
        const existingItem = cartItems.find((i) => i.foodId._id === item.foodId._id);
        const currentCartQuantity = existingItem ? existingItem.quantity : 0;
        const totalQuantity = currentCartQuantity + item.quantity;
        
        if (totalQuantity > availableStock) {
          return {
            success: false,
            error: `Not available! Only ${availableStock} pieces left in stock. You're trying to add ${totalQuantity} pieces.`
          };
        }
        
        console.log(`✅ Stock check passed: ${availableStock} available, adding ${item.quantity}`);
      } else {
        console.log(`⚠️ Stock not managed for ${item.foodId.foodName} - allowing unlimited`);
      }
      
      // Add to cart if stock validation passes
      setCartItems((prev) => {
        const idx = prev.findIndex((i) => i.foodId._id === item.foodId._id);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx].quantity += item.quantity;
          return updated;
        }
        return [...prev, item];
      });
      
      return { success: true };
      
    } catch (error) {
      console.error('Error adding to cart:', error);
      return {
        success: false,
        error: 'Failed to add item to cart. Please try again.'
      };
    }
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

  const updateQuantity = async (id: string, quantity: number): Promise<{ success: boolean; error?: string }> => {
    try {
      // Find the cart item
      const cartItem = cartItems.find(item => item._id === id);
      if (!cartItem) {
        return { success: false, error: 'Item not found in cart' };
      }
      
      // Ensure minimum quantity of 1
      const newQuantity = Math.max(1, quantity);
      
      console.log(`🔄 Updating ${cartItem.foodId.foodName} quantity to ${newQuantity} - checking stock...`);
      
      // Fetch current stock from API
      const response = await fetch(`/api/food-items/${cartItem.foodId._id}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch item details');
      }
      
      const foodItem = await response.json();
      const availableStock = foodItem.quantity || 0;
      
      // Check if stock is managed for this item
      if (foodItem.quantity !== null && foodItem.quantity !== undefined) {
        if (newQuantity > availableStock) {
          return {
            success: false,
            error: `Not available! Only ${availableStock} pieces left in stock. You're trying to set ${newQuantity} pieces.`
          };
        }
        
        console.log(`✅ Stock check passed: ${availableStock} available, setting to ${newQuantity}`);
      } else {
        console.log(`⚠️ Stock not managed for ${cartItem.foodId.foodName} - allowing unlimited`);
      }
      
      // Update quantity if stock validation passes
      setCartItems((prev) =>
        prev.map((item) =>
          item._id === id ? { ...item, quantity: newQuantity } : item
        )
      );
      
      return { success: true };
      
    } catch (error) {
      console.error('Error updating quantity:', error);
      return {
        success: false,
        error: 'Failed to update quantity. Please try again.'
      };
    }
  };

  return (
    <CartContext.Provider value={{ cartItems, addToCart, decrement, deleteItem, clearCart, updateQuantity }}>
      {children}
    </CartContext.Provider>
  );
}; 