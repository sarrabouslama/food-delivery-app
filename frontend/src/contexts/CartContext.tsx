import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { MenuItem, Restaurant } from '../types';

type CartRestaurant = Pick<Restaurant, 'id' | 'name' | 'category' | 'imageUrl'>;

export interface CartLine {
  menuItem: MenuItem;
  quantity: number;
}

interface CartState {
  restaurant: CartRestaurant | null;
  items: Record<string, CartLine>;
}

interface AddItemResult {
  success: boolean;
  conflict?: boolean;
}

interface CartContextType {
  restaurant: CartRestaurant | null;
  items: CartLine[];
  itemCount: number;
  subtotal: number;
  addItem: (menuItem: MenuItem, restaurant: CartRestaurant, quantity?: number) => AddItemResult;
  replaceCart: (menuItem: MenuItem, restaurant: CartRestaurant, quantity?: number) => void;
  setQuantity: (menuItemId: string, quantity: number) => void;
  removeItem: (menuItemId: string) => void;
  clearCart: () => void;
}

const CART_STORAGE_KEY = 'cravedrop-cart-v1';

const defaultState: CartState = {
  restaurant: null,
  items: {},
};

const CartContext = createContext<CartContextType | null>(null);

function isCartRestaurant(value: unknown): value is CartRestaurant {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string' && typeof candidate.name === 'string';
}

function normalizeStoredState(raw: unknown): CartState {
  if (!raw || typeof raw !== 'object') return defaultState;

  const candidate = raw as Partial<CartState>;
  const restaurant = isCartRestaurant(candidate.restaurant) ? candidate.restaurant : null;
  const items: Record<string, CartLine> = {};

  if (candidate.items && typeof candidate.items === 'object') {
    for (const [key, value] of Object.entries(candidate.items)) {
      const line = value as Partial<CartLine>;
      if (line?.menuItem && typeof line.quantity === 'number' && line.quantity > 0) {
        items[key] = {
          menuItem: line.menuItem,
          quantity: line.quantity,
        };
      }
    }
  }

  if (restaurant && Object.keys(items).length === 0) {
    return defaultState;
  }

  return { restaurant, items };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>(defaultState);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as unknown;
        setState(normalizeStoredState(parsed));
      }
    } catch {
      localStorage.removeItem(CART_STORAGE_KEY);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
  }, [isHydrated, state]);

  const clearCart = useCallback(() => {
    setState(defaultState);
  }, []);

  const addItem = useCallback((menuItem: MenuItem, restaurant: CartRestaurant, quantity = 1): AddItemResult => {
    let result: AddItemResult = { success: false };

    setState(current => {
      const existingRestaurant = current.restaurant;
      const restaurantConflict = Boolean(
        existingRestaurant && existingRestaurant.id !== restaurant.id && Object.keys(current.items).length > 0,
      );

      if (restaurantConflict) {
        result = { success: false, conflict: true };
        return current;
      }

      const currentLine = current.items[menuItem.id] ?? { menuItem, quantity: 0 };
      result = { success: true };

      return {
        restaurant,
        items: {
          ...current.items,
          [menuItem.id]: {
            menuItem,
            quantity: currentLine.quantity + quantity,
          },
        },
      };
    });

    return result;
  }, []);

  const replaceCart = useCallback((menuItem: MenuItem, restaurant: CartRestaurant, quantity = 1) => {
    setState({
      restaurant,
      items: {
        [menuItem.id]: {
          menuItem,
          quantity,
        },
      },
    });
  }, []);

  const setQuantity = useCallback((menuItemId: string, quantity: number) => {
    setState(current => {
      const nextItems = { ...current.items };

      if (quantity <= 0) {
        delete nextItems[menuItemId];
      } else if (nextItems[menuItemId]) {
        nextItems[menuItemId] = {
          ...nextItems[menuItemId],
          quantity,
        };
      }

      const nextRestaurant = Object.keys(nextItems).length > 0 ? current.restaurant : null;
      return {
        restaurant: nextRestaurant,
        items: nextItems,
      };
    });
  }, []);

  const removeItem = useCallback((menuItemId: string) => {
    setQuantity(menuItemId, 0);
  }, [setQuantity]);

  const items = useMemo(() => Object.values(state.items), [state.items]);
  const itemCount = useMemo(
    () => items.reduce((count, line) => count + line.quantity, 0),
    [items],
  );
  const subtotal = useMemo(
    () => items.reduce((total, line) => total + line.menuItem.price * line.quantity, 0),
    [items],
  );

  const value = useMemo<CartContextType>(() => ({
    restaurant: state.restaurant,
    items,
    itemCount,
    subtotal,
    addItem,
    replaceCart,
    setQuantity,
    removeItem,
    clearCart,
  }), [addItem, clearCart, itemCount, items, replaceCart, removeItem, setQuantity, state.restaurant, subtotal]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}