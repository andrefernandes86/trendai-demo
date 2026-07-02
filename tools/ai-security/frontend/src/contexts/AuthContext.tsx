import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  authAxios: any;
  nutritionAxios: any;
  fitnessAxios: any;
  aiAxios: any;
  reportsAxios: any;
  notificationsAxios: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Configure axios defaults - use direct service URLs to avoid API Gateway proxy issues
  const getServiceUrl = (service: string) => {
    const baseUrl = process.env.REACT_APP_API_URL || 'http://192.168.1.100';
    const ports = {
      auth: '3001',
      nutrition: '3002', 
      fitness: '3007',
      ai: '3004',
      reports: '3005',
      notifications: '3006'
    };
    return `${baseUrl}:${ports[service as keyof typeof ports]}`;
  };

  // Create axios instances for each service
  const authAxios = axios.create({ baseURL: getServiceUrl('auth') });
  const nutritionAxios = axios.create({ baseURL: getServiceUrl('nutrition') });
  const fitnessAxios = axios.create({ baseURL: getServiceUrl('fitness') });
  const aiAxios = axios.create({ baseURL: getServiceUrl('ai') });
  const reportsAxios = axios.create({ baseURL: getServiceUrl('reports') });
  const notificationsAxios = axios.create({ baseURL: getServiceUrl('notifications') });

  // Add request interceptor to include auth token for all axios instances
  const addAuthInterceptor = (axiosInstance: any) => {
    axiosInstance.interceptors.request.use(
      (config: any) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: any) => {
        return Promise.reject(error);
      }
    );
  };

  // Add auth interceptors to all service instances
  addAuthInterceptor(authAxios);
  addAuthInterceptor(nutritionAxios);
  addAuthInterceptor(fitnessAxios);
  addAuthInterceptor(aiAxios);
  addAuthInterceptor(reportsAxios);
  addAuthInterceptor(notificationsAxios);

  // Add response interceptor to handle token refresh for auth service
  authAxios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            const response = await authAxios.post('/auth/refresh', { refreshToken });
            const { accessToken, refreshToken: newRefreshToken } = response.data;
            
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', newRefreshToken);
            
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return authAxios(originalRequest);
          }
        } catch (refreshError) {
          logout();
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await authAxios.post('/auth/login', { username, password });
      const { user, accessToken, refreshToken } = response.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(user);

      toast.success('Login successful!');
      return true;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
      return false;
    }
  };

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      const response = await authAxios.post('/auth/register/public', { username, email, password });
      const { user, accessToken, refreshToken } = response.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(user);

      toast.success('Registration successful!');
      return true;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Registration failed';
      toast.error(message);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    toast.success('Logged out successfully');
  };

  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token');
      }

      const response = await authAxios.post('/auth/refresh', { refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = response.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', newRefreshToken);
    } catch (error) {
      logout();
      throw error;
    }
  };

  const verifyToken = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await authAxios.post('/auth/verify', { token });
      if (response.data.valid) {
        setUser(response.data.user);
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    } catch (error) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verifyToken();
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    refreshToken,
    authAxios,
    nutritionAxios,
    fitnessAxios,
    aiAxios,
    reportsAxios,
    notificationsAxios,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
