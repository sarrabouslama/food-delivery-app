
import { Role, AuthResponse, JwtPayload } from "../auth.types";
import { User } from "../models.types";

export const mockJwtPayload: JwtPayload = {
  sub:   "user_001",
  email: "customer@test.com",
  role:  Role.CUSTOMER,
  iat:   Math.floor(Date.now() / 1000),
  exp:   Math.floor(Date.now() / 1000) + 3600,
};

export const mockAuthResponse: AuthResponse = {
  accessToken:  "mock.jwt.access.token",
  refreshToken: "mock.jwt.refresh.token",
  user: {
    id:    "user_001",
    email: "customer@test.com",
    role:  Role.CUSTOMER,
  },
};

export const mockCustomer: User = {
  id:    "user_001",
  email: "customer@test.com",
  role:  Role.CUSTOMER,
  profile: {
    id:        "profile_001",
    firstName: "Ali",
    lastName:  "Ben Salah",
    phone:     "+216 20 000 001",
    avatarUrl: null,
    address:   "12 Rue de la Liberté, Tunis",
  },
  createdAt: new Date("2024-01-01"),
};

export const mockRestaurantOwner: User = {
  id:    "user_002",
  email: "owner@restaurant.com",
  role:  Role.RESTAURANT,
  profile: {
    id:        "profile_002",
    firstName: "Mohamed",
    lastName:  "Chaabane",
    phone:     "+216 20 000 002",
    avatarUrl: null,
    address:   "45 Avenue Habib Bourguiba, Tunis",
  },
  createdAt: new Date("2024-01-02"),
};
