
import { OrderStatus, PaymentStatus, Order, MenuItem, Restaurant, Category } from "../models.types";

export const mockRestaurant: Restaurant = {
  id:          "rest_001",
  ownerId:     "user_002",
  name:        "Burger House",
  description: "Best burgers in town",
  category:    "Fast Food",
  imageUrl:    null,
  address:     "45 Avenue Habib Bourguiba, Tunis",
  phone:       "+216 71 000 001",
  isOpen:      true,
  rating:      4.5,
  createdAt:   new Date("2024-01-02"),
};

export const mockCategory: Category = {
  id:           "cat_001",
  restaurantId: "rest_001",
  name:         "Burgers",
};

export const mockMenuItems: MenuItem[] = [
  {
    id:           "item_001",
    restaurantId: "rest_001",
    categoryId:   "cat_001",
    name:         "Classic Burger",
    description:  "Beef patty, lettuce, tomato, cheese",
    price:        12.99,
    imageUrl:     null,
    isAvailable:  true,
  },
  {
    id:           "item_002",
    restaurantId: "rest_001",
    categoryId:   "cat_001",
    name:         "Fries",
    description:  "Crispy golden fries",
    price:        4.99,
    imageUrl:     null,
    isAvailable:  true,
  },
];

export const mockOrder: Order = {
  id:           "order_001",
  customerId:   "user_001",
  restaurantId: "rest_001",
  status:       OrderStatus.PREPARING,
  totalPrice:   30.97,
  notes:        "No onions please",
  address:      "12 Rue de la Liberté, Tunis",
  items: [
    {
      id:         "oi_001",
      menuItemId: "item_001",
      name:       "Classic Burger",
      quantity:   2,
      unitPrice:  12.99,
      subtotal:   25.98,
    },
    {
      id:         "oi_002",
      menuItemId: "item_002",
      name:       "Fries",
      quantity:   1,
      unitPrice:  4.99,
      subtotal:   4.99,
    },
  ],
  payment: {
    id:              "pay_001",
    orderId:         "order_001",
    amount:          30.97,
    status:          PaymentStatus.PAID,
    stripePaymentId: "pi_mock_stripe_001",
    paidAt:          new Date("2024-06-01T10:05:00Z"),
  },
  createdAt: new Date("2024-06-01T10:00:00Z"),
  updatedAt: new Date("2024-06-01T10:10:00Z"),
};

