"use client";

import { useEffect, useState } from "react";
import { Images, X } from "lucide-react";
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
  closeLabel,
}: {
  imageKeys?: string[];
  unavailableLabel: string;
  imageAlt: string;
  buttonLabel: string;
  closeLabel: string;
}) {
  const [images, setImages] = useState<Array<ChatImage | null>>([]);
  const [viewer, setViewer] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
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

  return (
    <>
      <button
        type="button"
        className="record-images-trigger"
        onClick={() => setOpen(true)}
        aria-label={buttonLabel}
      >
        <Images size={15} strokeWidth={2.2} aria-hidden="true" />
        {buttonLabel}
      </button>
      {open && (
        <div
          className="record-images-dialog"
          role="dialog"
          aria-modal="true"
          aria-label={buttonLabel}
          onClick={() => setOpen(false)}
        >
          <div className="record-images-panel" onClick={(event) => event.stopPropagation()}>
            <div className="record-images-head">
              <span>{buttonLabel}</span>
              <button
                type="button"
                className="record-images-close"
                onClick={() => setOpen(false)}
                aria-label={closeLabel}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div className="record-images" aria-label={imageAlt}>
              {keys.map((key, index) => {
                const image = images[index];
                if (!image) {
                  return (
                    <span className="record-image-unavailable" key={key}>
                      {unavailableLabel}
                    </span>
                  );
                }
                const src = dataUrl(image);
                return (
                  <button
                    type="button"
                    className="record-image-button"
                    key={key}
                    onClick={() => setViewer(src)}
                    aria-label={imageAlt}
                  >
                    <img src={src} alt={imageAlt} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {viewer && <ImageViewer src={viewer} alt={imageAlt} onClose={() => setViewer(null)} />}
    </>
  );
}
