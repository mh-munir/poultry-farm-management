export function getFriendlyServerActionError(error: unknown) {
  const message = typeof error === 'string'
    ? error
    : error instanceof Error
      ? error.message
      : '';

  if (isStaleServerActionError(error)) {
    return 'A new version of the application is available. Please refresh the page and try again.';
  }

  return message || 'An unexpected error occurred. Please try again.';
}

export function isStaleServerActionError(error: unknown) {
  const message = typeof error === 'string'
    ? error
    : error instanceof Error
      ? error.message
      : '';

  return /Failed to find Server Action|server action.*not found|could not find server action|invalid action reference|unknown action/i.test(message);
}

export function handleStaleServerActionError(error: unknown, notify: (message: string) => void) {
  if (!isStaleServerActionError(error)) {
    return false;
  }

  const message = getFriendlyServerActionError(error);
  notify(message);
  setTimeout(() => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, 1500);

  return true;
}
