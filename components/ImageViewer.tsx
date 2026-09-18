"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function ImageViewer({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="image-viewer" role="dialog" aria-modal="true" aria-label={alt} onClick={onClose}>
      <img src={src} alt={alt} />
    </div>,
    document.body
  );
}
