// src/services/graphql.ts

const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:3000/graphql';
const REST_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function gqlFetch<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const token = localStorage.getItem('access_token');
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message || 'GraphQL error');
  return json.data as T;
}

// ─── Frontend interfaces (unchanged so pages don't need to change) ────────────

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  available: boolean;
}

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  cuisine: string;
  imageUrl?: string;
  rating: number;
  reviewCount: number;
  deliveryTime: number;
  deliveryFee: number;
  isOpen: boolean;
  address: string;
  menu?: MenuItem[];
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  updatedAt: string;
  restaurant: { id: string; name: string; imageUrl?: string };
  items: OrderItem[];
  deliveryAddress: string;
  estimatedDelivery?: string;
}

export interface DashboardStats {
  totalOrders: number;
  activeOrders: number;
  totalSpent: number;
  favoriteRestaurant?: string;
}

// ─── Backend → frontend transformers ─────────────────────────────────────────

function transformRestaurant(r: Record<string, unknown>): Restaurant {
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) || '',
    cuisine: (r.category as string) || '',
    imageUrl: r.imageUrl as string | undefined,
    rating: Number(r.rating) || 0,
    reviewCount: 0,
    deliveryTime: 30,
    deliveryFee: 2.0,
    isOpen: r.isOpen as boolean,
    address: (r.address as string) || '',
  };
}

function transformMenuItem(
  item: Record<string, unknown>,
  categories: Array<{ id: string; name: string }> = [],
): MenuItem {
  const cat = categories.find(c => c.id === item.categoryId);
  return {
    id: item.id as string,
    name: item.name as string,
    description: (item.description as string) || '',
    price: Number(item.price),
    category: cat?.name || 'Other',
    imageUrl: item.imageUrl as string | undefined,
    available: item.isAvailable as boolean,
  };
}

function transformOrder(o: Record<string, unknown>): Order {
  const restaurant = o.restaurant as Record<string, unknown> | null;
  const items = (o.items as Array<Record<string, unknown>>) || [];
  return {
    id: o.id as string,
    status: typeof o.status === 'string' ? o.status.toLowerCase() : (o.status as string),
    total: Number(o.totalPrice ?? o.total ?? 0),
    createdAt: o.createdAt as string,
    updatedAt: o.updatedAt as string,
    deliveryAddress: (o.address as string) || (o.deliveryAddress as string) || '',
    restaurant: {
      id: (restaurant?.id as string) || (o.restaurantId as string) || '',
      name: (restaurant?.name as string) || '',
      imageUrl: restaurant?.imageUrl as string | undefined,
    },
    items: items.map(item => {
      const menuItem = item.menuItem as Record<string, unknown> | null;
      return {
        id: item.id as string,
        name: (menuItem?.name as string) || (item.name as string) || '',
        price: Number(menuItem?.price ?? item.unitPrice ?? item.price ?? 0),
        quantity: Number(item.quantity || 1),
      };
    }),
  };
}

// ─── Restaurants ──────────────────────────────────────────────────────────────

export const getRestaurants = async (_category?: string): Promise<{ restaurants: Restaurant[] }> => {
  try {
    const data = await gqlFetch<{ restaurants: Record<string, unknown>[] }>(`
      query Restaurants {
        restaurants {
          id name description category imageUrl address isOpen rating
        }
      }
    `);
    return { restaurants: data.restaurants.map(transformRestaurant) };
  } catch {
    return { restaurants: MOCK_RESTAURANTS };
  }
};

export const getRestaurant = async (id: string): Promise<{ restaurant: Restaurant }> => {
  try {
    const data = await gqlFetch<{ restaurant: Record<string, unknown> }>(`
      query GetRestaurant($id: String!) {
        restaurant(id: $id) {
          id name description category imageUrl address isOpen rating
          categories { id name }
          menuItems { id name description price imageUrl isAvailable categoryId }
        }
      }
    `, { id });
    const r = data.restaurant;
    const categories = (r.categories as Array<{ id: string; name: string }>) || [];
    const menuItems = (r.menuItems as Array<Record<string, unknown>>) || [];
    return {
      restaurant: {
        ...transformRestaurant(r),
        menu: menuItems.map(item => transformMenuItem(item, categories)),
      },
    };
  } catch {
    const mock = MOCK_RESTAURANTS.find(r => r.id === id) || { ...MOCK_RESTAURANTS[0], id };
    return { restaurant: { ...mock, menu: MOCK_MENU } };
  }
};

// ─── Orders ───────────────────────────────────────────────────────────────────

export const getMyOrders = async (): Promise<{ myOrders: Order[] }> => {
  try {
    const data = await gqlFetch<{ orders: Record<string, unknown>[] }>(`
      query Orders {
        orders {
          id status totalPrice address createdAt updatedAt
          restaurant { id name imageUrl }
          items { id quantity unitPrice menuItem { id name price } }
        }
      }
    `);
    return { myOrders: data.orders.map(transformOrder) };
  } catch {
    return { myOrders: [] };
  }
};

export const getOrder = async (id: string): Promise<{ order: Order }> => {
  try {
    const data = await gqlFetch<{ order: Record<string, unknown> }>(`
      query GetOrder($id: String!) {
        order(id: $id) {
          id status totalPrice address createdAt updatedAt
          restaurant { id name imageUrl }
          items { id quantity unitPrice menuItem { id name price } }
        }
      }
    `, { id });
    return { order: transformOrder(data.order) };
  } catch {
    const mock = MOCK_ORDERS.find(o => o.id === id);
    if (mock) return { order: mock };
    throw new Error('Order not found');
  }
};

export const createOrder = async (input: {
  restaurantId: string;
  items: Array<{ menuItemId: string; quantity: number }>;
  deliveryAddress: string;
}): Promise<{ createOrder: Order }> => {
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${REST_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      restaurantId: input.restaurantId,
      items: input.items,
      address: input.deliveryAddress,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = Array.isArray(err.message) ? err.message[0] : err.message;
    throw new Error(msg || 'Failed to place order');
  }
  const data = await res.json();
  return { createOrder: transformOrder(data as Record<string, unknown>) };
};

// ─── Dashboard stats (derived from orders) ───────────────────────────────────

export const getDashboardStats = async (): Promise<{ dashboardStats: DashboardStats }> => {
  const { myOrders } = await getMyOrders();
  const activeOrders = myOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;
  const totalSpent = myOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0);
  return {
    dashboardStats: {
      totalOrders: myOrders.length,
      activeOrders,
      totalSpent,
      favoriteRestaurant: myOrders[0]?.restaurant.name,
    },
  };
};

// ─── Mock data (fallback when backend is unavailable) ─────────────────────────
// The seeded demo accounts (customer@test.com / owner@restaurant.com, password: password123)
// have real data in the database. This mock data is only used when the backend is unreachable.

export const MOCK_RESTAURANTS: Restaurant[] = [
  { id: '1', name: 'Bella Italia', description: 'Authentic Italian cuisine', cuisine: 'Italian', rating: 4.8, reviewCount: 324, deliveryTime: 25, deliveryFee: 1.99, isOpen: true, address: '12 Via Roma', imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80' },
  { id: '2', name: 'Sushi Zen', description: 'Fresh Japanese sushi & rolls', cuisine: 'Japanese', rating: 4.6, reviewCount: 189, deliveryTime: 35, deliveryFee: 2.49, isOpen: true, address: '88 Sakura St', imageUrl: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&q=80' },
  { id: '3', name: 'The Burger Lab', description: 'Gourmet smash burgers', cuisine: 'American', rating: 4.7, reviewCount: 512, deliveryTime: 20, deliveryFee: 0.99, isOpen: true, address: '5 Liberty Ave', imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80' },
  { id: '4', name: 'Spice Garden', description: 'Authentic Indian flavors', cuisine: 'Indian', rating: 4.5, reviewCount: 276, deliveryTime: 30, deliveryFee: 1.49, isOpen: false, address: '23 Curry Lane', imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80' },
  { id: '5', name: 'Green Bowl', description: 'Healthy salads & bowls', cuisine: 'Healthy', rating: 4.4, reviewCount: 143, deliveryTime: 15, deliveryFee: 1.99, isOpen: true, address: '7 Garden Way', imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80' },
  { id: '6', name: 'Dragon Palace', description: 'Traditional Chinese dim sum', cuisine: 'Chinese', rating: 4.3, reviewCount: 98, deliveryTime: 40, deliveryFee: 2.99, isOpen: true, address: '44 Eastern Blvd', imageUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&q=80' },
];

export const MOCK_MENU: MenuItem[] = [
  { id: 'm1', name: 'Margherita Pizza', description: 'San Marzano tomato, fresh mozzarella, basil', price: 14.50, category: 'Pizza', available: true },
  { id: 'm2', name: 'Truffle Pasta', description: 'Handmade tagliatelle, black truffle, parmesan', price: 18.00, category: 'Pasta', available: true },
  { id: 'm3', name: 'Arancini (4pc)', description: 'Crispy risotto balls with ragù filling', price: 9.00, category: 'Starters', available: true },
  { id: 'm4', name: 'Bruschetta', description: 'Toasted sourdough, heritage tomatoes, basil oil', price: 7.50, category: 'Starters', available: true },
  { id: 'm5', name: 'Tiramisu', description: 'Classic recipe with espresso-soaked ladyfingers', price: 8.00, category: 'Desserts', available: true },
  { id: 'm6', name: 'Panna Cotta', description: 'Vanilla bean panna cotta with berry coulis', price: 7.00, category: 'Desserts', available: true },
  { id: 'm7', name: 'Ribollita Soup', description: 'Tuscan bread and vegetable soup', price: 10.50, category: 'Mains', available: false },
  { id: 'm8', name: 'Osso Buco', description: 'Braised veal shanks with gremolata and saffron risotto', price: 26.00, category: 'Mains', available: true },
];

export const MOCK_ORDERS: Order[] = [
  { id: 'ord-001', status: 'delivered', total: 32.50, createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date(Date.now() - 82800000).toISOString(), restaurant: { id: '1', name: 'Bella Italia', imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80' }, items: [{ id: 'i1', name: 'Margherita Pizza', price: 14.50, quantity: 1 }, { id: 'i2', name: 'Tiramisu', price: 8.00, quantity: 2 }], deliveryAddress: '12 Rue de la Liberté, Tunis' },
  { id: 'ord-002', status: 'on_the_way', total: 24.99, createdAt: new Date(Date.now() - 3600000).toISOString(), updatedAt: new Date(Date.now() - 1800000).toISOString(), restaurant: { id: '3', name: 'The Burger Lab', imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80' }, items: [{ id: 'i3', name: 'Double Smash Burger', price: 16.99, quantity: 1 }, { id: 'i4', name: 'Truffle Fries', price: 8.00, quantity: 1 }], deliveryAddress: '12 Rue de la Liberté, Tunis', estimatedDelivery: new Date(Date.now() + 900000).toISOString() },
  { id: 'ord-003', status: 'delivered', total: 18.20, createdAt: new Date(Date.now() - 172800000).toISOString(), updatedAt: new Date(Date.now() - 169200000).toISOString(), restaurant: { id: '2', name: 'Sushi Zen', imageUrl: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&q=80' }, items: [{ id: 'i5', name: 'Dragon Roll', price: 18.20, quantity: 1 }], deliveryAddress: '12 Rue de la Liberté, Tunis' },
];
