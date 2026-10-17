import type { MouseEvent } from "react";

declare global {
  interface Window {
    Cookiebot?: {
      show: () => void;
    };
  }
}

export function CookiePreferencesLink({ className }: { className?: string }) {
  function openPreferences(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    window.Cookiebot?.show();
  }

  return (
    <a href="#" onClick={openPreferences} className={className}>
      Privacy settings
    </a>
  );
}
