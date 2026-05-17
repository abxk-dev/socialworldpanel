import { useReseller } from '../context/ResellerContext';

/**
 * Returns API endpoint paths based on reseller context.
 * When isReseller: use reseller API; otherwise use main SWP API.
 */
export function useApiEndpoints() {
  const { isReseller } = useReseller();
  if (isReseller) {
    return {
      authLogin: '/reseller/auth/login',
      authRegister: '/reseller/auth/register',
      me: '/reseller/me',
      services: '/reseller/services',
      orders: '/reseller/orders',
      balance: '/reseller/balance',
      isReseller: true,
    };
  }
  return {
    authLogin: '/auth/login',
    authRegister: '/auth/register',
    me: '/auth/me',
    services: '/services',
    orders: '/orders',
    balance: '/user/stats',
    isReseller: false,
  };
}
