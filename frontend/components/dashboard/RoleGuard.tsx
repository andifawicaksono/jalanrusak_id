'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';

interface RoleGuardProps {
  readonly allowedRoles: User['role'][];
  readonly children: React.ReactNode;
  /** Route to redirect to when role is insufficient (default: /reports) */
  readonly redirectTo?: string;
}

/**
 * Protects a page section from users whose role is not in allowedRoles.
 * Auth check (authenticated vs not) is handled by the dashboard layout.
 * This component only checks role-level access.
 */
export default function RoleGuard({
  allowedRoles,
  children,
  redirectTo = '/reports',
}: RoleGuardProps) {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && user && !allowedRoles.includes(user.role)) {
      router.replace(redirectTo);
    }
  }, [user, isLoading, allowedRoles, redirectTo, router]);

  // Still loading auth state → render nothing (layout shows global loading)
  if (isLoading) return null;

  // Authenticated but wrong role → redirect in progress
  if (user && !allowedRoles.includes(user.role)) return null;

  return <>{children}</>;
}
