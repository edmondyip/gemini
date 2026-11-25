declare global {
  interface Window {
    gtag?: (
      command: 'event' | 'config' | 'js',
      targetIdOrEventName: string | Date,
      params?: Record<string, string | number>
    ) => void;
  }
}

export function trackEvent(
  eventName: string,
  params?: Record<string, string | number>
): void {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    if (params !== undefined) {
      window.gtag('event', eventName, params);
    } else {
      window.gtag('event', eventName);
    }
  }
}
