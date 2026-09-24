"use client";

import { useEffect, useRef } from "react";

const BOTTOM_THRESHOLD_PX = 72;

export function useFollowLatestScroll(dependency: unknown) {
  const endRef = useRef<HTMLDivElement>(null);
  const shouldFollowRef = useRef(true);

  useEffect(() => {
    const end = endRef.current;
    const container = end?.closest<HTMLElement>(".main");
    if (!container) return;

    const handleScroll = () => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      shouldFollowRef.current = distanceFromBottom <= BOTTOM_THRESHOLD_PX;
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const end = endRef.current;
    const container = end?.closest<HTMLElement>(".main");
    if (!container || !shouldFollowRef.current) return;

    const frame = requestAnimationFrame(() => {
      container.scrollTo({ top: container.scrollHeight, behavior: "auto" });
    });
    return () => cancelAnimationFrame(frame);
  }, [dependency]);

  return endRef;
}
