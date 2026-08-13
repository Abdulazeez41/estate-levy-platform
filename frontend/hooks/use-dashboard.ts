'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboard-service';

export function useChairmanDashboard() {
  return useQuery({
    queryKey: ['chairman-dashboard'],
    queryFn: dashboardService.getChairmanDashboard,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });
}

export function useResidentDashboard(userId?: string) {
  return useQuery({
    queryKey: ['resident-dashboard', userId],
    queryFn: () => dashboardService.getResidentDashboard(userId as string),
    enabled: Boolean(userId),
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
  });
}
