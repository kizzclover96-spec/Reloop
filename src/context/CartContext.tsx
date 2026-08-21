import React, { createContext, useContext, useEffect, useState } from "react";
import { getPreference, setPreference } from "../data/localStore";

interface CartContextValue {
  itemIds: string[];
  addItem: (id: string) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [itemIds, setItemIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getPreference<string[]>("cartItemIds", []).then((ids) => {
      setItemIds(ids);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) setPreference("cartItemIds", itemIds);
  }, [itemIds, loaded]);

  const addItem = (id: string) => setItemIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  const removeItem = (id: string) => setItemIds((prev) => prev.filter((x) => x !== id));
  const clear = () => setItemIds([]);
  const has = (id: string) => itemIds.includes(id);

  return <CartContext.Provider value={{ itemIds, addItem, removeItem, clear, has }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
