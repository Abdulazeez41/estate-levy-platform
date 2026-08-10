'use client';

import { authService } from '@/services/auth-service';
import { useAuthStore } from '@/store/auth-store';
import type { LoginInput } from '@/validators/auth';
import { useState } from 'react';

export function useAuth() {
  const { user, clearSession, setSession } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const login = async (payload: LoginInput) => {
    setIsLoading(true);
    try {
      const response = await authService.login(payload);
      setSession(response);
      return response.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      clearSession();
      window.location.href = '/login';
    }
  };

  return { user, login, logout, isLoading };
}
