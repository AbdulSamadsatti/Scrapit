import React, { createContext, useContext, useState, ReactNode } from "react";

interface CartItem {
  id: string;
  title: string;
  price: string;
  image: string;
  location: string;
  type?: string;
  postedDate?: string;
  category?: string;
  quantity: number;
}

interface LikedItem {
  id: string;
  title: string;
  price: string;
  image: string;
  location: string;
  type?: string;
  postedDate?: string;
  category?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  likedItems: LikedItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, change: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  toggleLike: (item: LikedItem) => void;
  isLiked: (id: string) => boolean;
  removeFromLiked: (id: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [likedItems, setLikedItems] = useState<LikedItem[]>([]);

  // Add item to cart
  const addToCart = (item: Omit<CartItem, "quantity">) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find(
        (cartItem) => cartItem.id === item.id,
      );
      if (existingItem) {
        return prevItems.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem,
        );
      }
      return [...prevItems, { ...item, quantity: 1 }];
    });
  };

  // Remove item from cart
  const removeFromCart = (id: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  // Update item quantity
  const updateQuantity = (id: string, change: number) => {
    setCartItems((prevItems) => {
      return prevItems
        .map((item) => {
          if (item.id === id) {
            const newQuantity = item.quantity + change;
            return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null);
    });
  };

  // Clear cart
  const clearCart = () => {
    setCartItems([]);
  };

  // Calculate total cart amount
  const getTotal = () => {
    return cartItems.reduce((sum, item) => {
      const priceStr = item.price.replace(/[rs,\s]/gi, "");
      const price = parseFloat(priceStr);
      return sum + (isNaN(price) ? 0 : price) * item.quantity;
    }, 0);
  };

  // Toggle like status for an item
  const toggleLike = (item: LikedItem) => {
    setLikedItems((prevItems) => {
      const isLiked = prevItems.some((likedItem) => likedItem.id === item.id);
      if (isLiked) {
        return prevItems.filter((likedItem) => likedItem.id !== item.id);
      } else {
        return [...prevItems, item];
      }
    });
  };

  // Check if an item is liked
  const isLiked = (id: string) => {
    return likedItems.some((item) => item.id === id);
  };

  // Remove item from liked list
  const removeFromLiked = (id: string) => {
    setLikedItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const value: CartContextType = {
    cartItems,
    likedItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotal,
    toggleLike,
    isLiked,
    removeFromLiked,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

// Custom hook to use cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
