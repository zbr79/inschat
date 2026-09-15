"use client";

import { useEffect, useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import type { ChatImage } from "@/lib/types";
import { getGuestImage } from "@/lib/guestImages";
import ImageViewer from "./ImageViewer";

function dataUrl(image: ChatImage): string {
  return `data:${image.mimeType};base64,${image.data}`;
}

export default function RecordImages({
  imageKeys,
  unavailableLabel,
  imageAlt,
  buttonLabel,
}: {
  imageKeys?: string[];
  unavailableLabel: string;
  imageAlt: string;
  buttonLabel: string;
}) {
  const [images, setImages] = useState<Array<ChatImage | null>>([]);
  const [viewer, setViewer] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const keys = imageKeys ?? [];
  const keySignature = keys.join("\u0000");

  useEffect(() => {
    let active = true;
    if (keys.length === 0) {
      setImages([]);
      return () => {
        active = false;
      };
    }
    void Promise.all(keys.map((key) => getGuestImage(key))).then((loaded) => {
      const normalized = loaded.map((image) => image ?? null);
      if (active) setImages(normalized);
    });
    return () => {
      active = false;
    };
  }, [keySignature]);

  if (keys.length === 0) return null;

  const openImage = async () => {
    const image = images[0] ?? (keys[0] ? await getGuestImage(keys[0]) : null);
    if (!image) {
      setUnavailable(true);
      return;
    }
    setViewer(dataUrl(image));
  };

  return (
    <>
      <button
        type="button"
        className="record-images-trigger"
        onClick={() => void openImage()}
        aria-label={buttonLabel}
      >
        <ImageIcon size={15} strokeWidth={2} aria-hidden="true" />
      </button>
      {unavailable && (
        <span className="record-image-unavailable">{unavailableLabel}</span>
      )}
      {viewer && (
        <ImageViewer
          src={viewer}
          alt={imageAlt}
          onClose={() => setViewer(null)}
        />
      )}
    </>
  );
}
