'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';

const HIDDEN_NAV_ROUTES = new Set(['/','/login','/register']);

export default function ConditionalNav() {
  const pathname = usePathname();

  if (HIDDEN_NAV_ROUTES.has(pathname)) {
    return null;
  }

  return <Navigation />;
}
