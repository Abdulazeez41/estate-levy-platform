'use client';

import { useQuery } from '@tanstack/react-query';
import { householdService } from '@/services/household-service';

export function useHousehold(id: string) {
  return useQuery({
    queryKey: ['household', id],
    queryFn: () => householdService.getOne(id),
    enabled: Boolean(id),
  });
}
