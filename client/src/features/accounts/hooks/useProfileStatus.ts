// src/features/accounts/User/hooks/useProfileStatus.ts
import { useQuery } from '@tanstack/react-query';
import {useAuthStore} from '../../../store/authStore';
import { fetchProfileStatus } from '../apis/profileStatusApi';

export function useProfileStatus() {
  const access = useAuthStore((s) => s.access);

  return useQuery({
    queryKey: ['profile-status', access],
    queryFn: () => fetchProfileStatus(access),
    enabled: !!access,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}