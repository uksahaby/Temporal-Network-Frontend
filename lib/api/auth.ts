import axios, { AxiosInstance } from "axios";

// Types
export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

// Token management
const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getStoredUser = (): User | null => {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

export const setStoredUser = (user: User): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

// Auth API client
class AuthApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add auth interceptor
    this.client.interceptors.request.use((config) => {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle 401 errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          removeToken();
          // Redirect to login if not already there
          if (
            typeof window !== "undefined" &&
            !window.location.pathname.includes("/login")
          ) {
            window.location.href = "/login";
          }
        }
        return Promise.reject(error);
      },
    );
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>(
      "/api/auth/register",
      data,
    );
    setToken(response.data.access_token);
    setStoredUser(response.data.user);
    return response.data;
  }

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>(
      "/api/auth/login",
      data,
    );
    setToken(response.data.access_token);
    setStoredUser(response.data.user);
    return response.data;
  }

  async getMe(): Promise<User> {
    const response = await this.client.get<User>("/api/auth/me");
    setStoredUser(response.data);
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post("/api/auth/logout");
    } finally {
      removeToken();
    }
  }

  isAuthenticated(): boolean {
    return !!getToken();
  }
}

export const authApi = new AuthApiClient();
