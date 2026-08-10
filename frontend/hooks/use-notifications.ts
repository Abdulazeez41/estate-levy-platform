'use client';

import { useQuery } from '@tanstack/react-query';
import { notificationService } from '@/services/notification-service';

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: notificationService.list,
  });
}
