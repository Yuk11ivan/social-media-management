import { useLocation } from 'react-router-dom';

/**
 * Returns true when the current route is the homepage ('/').
 * Used by AppLayout to switch between homepage (top navbar) and
 * dashboard (sidebar + header bar) layout modes.
 */
export function useIsHomePage(): boolean {
  const location = useLocation();

  // Exclude auth pages from homepage treatment
  if (location.pathname === '/account') return false;

  return location.pathname === '/';
}
