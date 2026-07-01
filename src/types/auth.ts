export interface User {
  id: string;
  email: string;
  nickname?: string;
  phone?: string;
  createdAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nickname?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
}
