import { useLocation, useRouter } from "@tanstack/react-router";
import * as React from "react";

import { type SupportedLocale } from "#@/locale-config";
import { baseLocale, getLocale, localizeUrl, overwriteGetLocale } from "#@/paraglide/runtime";
import {
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  normalizeLocale,
  resolveLocale
} from "#@/tanstack-start/locale-resolution";

type Locale = SupportedLocale;

type LocaleContextValue = {
  locale: Locale;
  switchLocale: (locale: Locale) => void;
};

const LocaleContext = React.createContext<LocaleContextValue | null>(null);

let clientLocale: Locale | undefined;
function getLocaleFromPathname(pathname: string): Locale | undefined {
  const segment = pathname.split("/").filter(Boolean)[0];
  return normalizeLocale(segment);
}

function setClientLocale(locale: Locale) {
  clientLocale = locale;
  overwriteGetLocale(() => clientLocale ?? baseLocale);
}

export function LocaleProvider({
  children,
  initialLocale
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const router = useRouter();
  const pathname = useLocation({ select: (location) => location.pathname });
  const [preferredLocale, setPreferredLocale] = React.useState<Locale>(() => {
    // Keep the server and hydration renders deterministic. Persisted browser
    // state is applied in the effect below, after the first client render.
    if (initialLocale) return initialLocale;
    if (typeof window === "undefined") {
      try {
        return normalizeLocale(getLocale()) ?? (baseLocale as Locale);
      } catch {
        return baseLocale as Locale;
      }
    }
    return baseLocale as Locale;
  });
  const routeLocale = React.useMemo(() => getLocaleFromPathname(pathname), [pathname]);
  const locale = routeLocale ?? preferredLocale;

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const persisted = resolveLocale({
      cookie: document.cookie,
      stored: window.localStorage.getItem(LOCALE_STORAGE_KEY)
    });
    const effectiveLocale = routeLocale ?? persisted;
    if (!routeLocale && effectiveLocale !== preferredLocale) {
      setPreferredLocale(effectiveLocale);
    }
    setClientLocale(effectiveLocale);
    document.documentElement.lang = effectiveLocale;
  }, [preferredLocale, routeLocale]);

  const switchLocale = React.useCallback(
    (nextLocale: Locale) => {
      if (typeof window === "undefined") {
        return;
      }

      const nextUrl = localizeUrl(window.location.href, {
        locale: nextLocale
      });

      setPreferredLocale(nextLocale);
      setClientLocale(nextLocale);
      document.documentElement.lang = nextLocale;
      window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
      document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(nextLocale)}; Path=/; SameSite=Lax; Max-Age=31536000`;
      router.history.push(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    },
    [router]
  );

  return (
    <LocaleContext.Provider value={{ locale, switchLocale }}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = React.useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }

  return context;
}
