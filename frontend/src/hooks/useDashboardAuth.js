import { useReseller } from '../context/ResellerContext';
import { useAuth } from '../App';
import { useResellerAuth } from '../context/ResellerAuthContext';

/**
 * Returns the current dashboard auth: reseller user on reseller domain, SWP user otherwise.
 * Use in dashboard pages for user, token, refreshUser so they work on both main and reseller panels.
 */
export function useDashboardAuth() {
  const { isReseller } = useReseller();
  const swpAuth = useAuth();
  const resellerAuth = useResellerAuth();

  if (isReseller) {
    return {
      user: resellerAuth.user,
      token: resellerAuth.token,
      refreshUser: resellerAuth.refreshUser,
      logout: resellerAuth.logout,
      isReseller: true,
    };
  }
  return {
    user: swpAuth.user,
    token: swpAuth.token,
    refreshUser: swpAuth.refreshUser,
    logout: swpAuth.logout,
    isReseller: false,
  };
}
