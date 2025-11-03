import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < MOBILE_BREAKPOINT;
    }
    return false;
  });

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(mql.matches);

    try {
      if (typeof mql.addEventListener === "function") {
        mql.addEventListener("change", onChange);
      } else if (typeof mql.addListener === "function") {
        mql.addListener(onChange);
      }
    } catch {
      // Ignora erros de navegadores incompatíveis
    }

    setIsMobile(mql.matches);

    return () => {
      try {
        if (typeof mql.removeEventListener === "function") {
          mql.removeEventListener("change", onChange);
        } else if (typeof mql.removeListener === "function") {
          mql.removeListener(onChange);
        }
      } catch {
        // Ignora erros ao limpar listeners
      }
    };
  }, []);

  return isMobile;
}
