"use client";

import { useEffect } from "react";

type StandaloneNavigator = Navigator & {
  standalone?: boolean;
};

export default function StandaloneMode() {
  useEffect(() => {
    const mediaStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const iosStandalone = Boolean((navigator as StandaloneNavigator).standalone);

    document.documentElement.classList.toggle(
      "standalone-mode",
      mediaStandalone || iosStandalone
    );
  }, []);

  return null;
}
