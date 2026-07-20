/**
 * Helper function to build redirect URLs with query parameters that work with Next.js typedRoutes.
 * Returns a URL object which is the only way to include dynamic query parameters with typedRoutes: true.
 * 
 * With typedRoutes enabled, redirect() only accepts:
 * - Static literal routes from app directory (e.g., '/dashboard/parties')
 * - URL objects for dynamic/parametrized URLs
 * 
 * This helper uses the URL API to safely build URLs with query parameters.
 */
export function buildRedirectUrl(
  pathname: string,
  params?: Record<string, string>
): URL {
  const url = new URL(pathname, 'http://localhost');
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return url;
}
