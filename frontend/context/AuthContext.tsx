'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type User = {
  id: string;
  email: string;
  role: string;
  subscription: string;
  daily_quota: number;
  quota_reset_at: string | null;
  avatar_url: string | null;
  avatar_color: string;
  background_color: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<any>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  subscribePlan: (plan: 'monthly' | 'yearly') => Promise<void>;
  updateAvatar: (file: File) => Promise<string>;
  updateAvatarColor: (color: string) => Promise<void>;
  updateBackgroundColor: (color: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:8001';

async function jsonFetch(path: string, options: RequestInit = {}) {
  // Fail fast with a clearer message when NEXT_PUBLIC_API_URL isn't set in prod
  const url = `${API_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || 'Erreur serveur');
  }
  return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = typeof window !== 'undefined' ? window.localStorage.getItem('hopeveri_token') : null;
    if (storedToken) {
      setToken(storedToken);
      fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.user) {
            setUser(data.user);
          } else {
            setToken(null);
            window.localStorage.removeItem('hopeveri_token');
          }
        })
        .catch(() => {
          // Most likely: API_URL incorrect / backend unreachable in prod
          setToken(null);
          window.localStorage.removeItem('hopeveri_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await jsonFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
      setUser(data.user);
      window.localStorage.setItem('hopeveri_token', data.token);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Échec de la connexion.';
      // Network-level message (commonly happens when NEXT_PUBLIC_API_URL is not configured)
      if (/Failed to fetch/i.test(msg)) {
        throw new Error(`Impossible de contacter le backend (${API_URL}). Vérifie NEXT_PUBLIC_API_URL.`);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await jsonFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    window.localStorage.removeItem('hopeveri_token');
  };

  const refreshUser = async () => {
    if (!token) return;
    const data = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => res.json());
    if (data?.user) {
      setUser(data.user);
    }
  };

  const subscribePlan = async (plan: 'monthly' | 'yearly') => {
    if (!token) throw new Error('Connectez-vous pour souscrire.');
    const result = await jsonFetch('/api/subscription/buy', {
      method: 'POST',
      body: JSON.stringify({ plan }),
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (result?.user) {
      setUser(result.user);
    }
  };

  const updateAvatar = async (file: File): Promise<string> => {
    if (!token) throw new Error('Connectez-vous.');
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await fetch(`${API_URL}/api/profile/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || 'Upload échoué.');
    if (data?.avatar_url) {
      setUser((prev) => prev ? { ...prev, avatar_url: data.avatar_url } : prev);
    }
    return data.avatar_url;
  };

  const updateAvatarColor = async (color: string) => {
    if (!token) throw new Error('Connectez-vous.');
    const data = await jsonFetch('/api/profile/avatar-color', {
      method: 'POST',
      body: JSON.stringify({ color }),
      headers: { Authorization: `Bearer ${token}` },
    });
    if (data?.avatar_color) {
      setUser((prev) => prev ? { ...prev, avatar_color: data.avatar_color } : prev);
    }
  };

  const updateBackgroundColor = async (color: string) => {
    if (!token) throw new Error('Connectez-vous.');
    const data = await jsonFetch('/api/profile/background-color', {
      method: 'POST',
      body: JSON.stringify({ color }),
      headers: { Authorization: `Bearer ${token}` },
    });
    if (data?.background_color) {
      setUser((prev) => prev ? { ...prev, background_color: data.background_color } : prev);
    }
  };

  const value = useMemo(
    () => ({ user, token, loading, error, login, register, logout, refreshUser, subscribePlan, updateAvatar, updateAvatarColor, updateBackgroundColor }),
    [user, token, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
