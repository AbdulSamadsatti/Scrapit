import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ProductItem = {
  id: string;
  title: string;
  price?: string;
  image?: string;
  location?: string;
  type?: string;
  postedDate?: string;
  category?: string;
  banner?: string;
  link?: string;
  source?: string;
  source_label?: string;
};

export type CartItem = ProductItem & {
  quantity: number;
};

type CartContextValue = {
  cartItems: CartItem[];
  likedItems: ProductItem[];
  addToCart: (item: ProductItem) => void;
  updateQuantity: (id: string, change: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  getTotal: () => number;
  toggleLike: (item: ProductItem) => void;
  removeFromLiked: (id: string) => void;
  isLiked: (id: string) => boolean;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const parsePrice = (raw?: string) => {
  const normalized = (raw ?? "0").replace(/[^0-9.]/g, "");
  const value = parseFloat(normalized);
  return Number.isFinite(value) ? value : 0;
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [likedItems, setLikedItems] = useState<ProductItem[]>([]);

  const addToCart = useCallback((item: ProductItem) => {
    setCartItems((prev) => {
      const existing = prev.find((x) => x.id === item.id);
      if (!existing) return [...prev, { ...item, quantity: 1 }];
      return prev.map((x) =>
        x.id === item.id ? { ...x, quantity: x.quantity + 1 } : x,
      );
    });
  }, []);

  const updateQuantity = useCallback((id: string, change: number) => {
    setCartItems((prev) =>
      prev
        .map((x) =>
          x.id === id ? { ...x, quantity: Math.max(1, x.quantity + change) } : x,
        )
        .filter((x) => x.quantity > 0),
    );
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCartItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const getTotal = useCallback(
    () =>
      cartItems.reduce((sum, item) => sum + parsePrice(item.price) * item.quantity, 0),
    [cartItems],
  );

  const isLiked = useCallback(
    (id: string) => likedItems.some((x) => x.id === id),
    [likedItems],
  );

  const toggleLike = useCallback((item: ProductItem) => {
    setLikedItems((prev) => {
      const exists = prev.some((x) => x.id === item.id);
      if (exists) return prev.filter((x) => x.id !== item.id);
      return [...prev, item];
    });
  }, []);

  const removeFromLiked = useCallback((id: string) => {
    setLikedItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      cartItems,
      likedItems,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      getTotal,
      toggleLike,
      removeFromLiked,
      isLiked,
    }),
    [
      cartItems,
      likedItems,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      getTotal,
      toggleLike,
      removeFromLiked,
      isLiked,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
