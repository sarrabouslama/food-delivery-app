export enum Role {
  CUSTOMER = 'CUSTOMER',
  RESTAURANT = 'RESTAURANT',
}

// Shape of the decoded JWT payload
export interface JwtPayload {
  sub: string; // user ID
  email: string;
  role: Role;
  iat: number;
  exp: number;
}

// What login/register endpoints return
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: Role;
  };
}

// Login request body
export interface LoginDto {
  email: string;
  password: string;
}

// Register request body
export interface RegisterDto {
  email: string;
  password: string;
  role: Role;
  firstName: string;
  lastName: string;
}
