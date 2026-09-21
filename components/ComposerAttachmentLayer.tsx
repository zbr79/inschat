"use client";

import { AlertCircle, X } from "lucide-react";
import type { ReactNode } from "react";
import type { ChatImage } from "@/lib/types";

export default function ComposerAttachmentLayer({
  images,
  imageError,
  documentLayer,
  documentLayerVisible,
  onImageClick,
  onRemoveImage,
  imageAlt,
  removeImageLabel,
}: {
  images: ChatImage[];
  imageError: string | null;
  documentLayer: ReactNode;
  documentLayerVisible: boolean;
  onImageClick: (image: ChatImage) => void;
  onRemoveImage: (index: number) => void;
  imageAlt: string;
  removeImageLabel: string;
}) {
  if (images.length === 0 && !imageError && !documentLayerVisible) return null;

  return (
    <div className="composer-attachment-layer">
      <div className="composer-attachment-scroll">
        {images.length > 0 && (
          <div className="preview-grid">
            {images.map((image, index) => (
              <div key={index} className="preview">
                <img
                  src={`data:${image.mimeType};base64,${image.data}`}
                  alt={imageAlt}
                  onClick={() => onImageClick(image)}
                />
                <button
                  type="button"
                  className="attachment-remove"
                  onClick={() => onRemoveImage(index)}
                  aria-label={removeImageLabel}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        {imageError && (
          <div className="composer-attachment-errors" role="alert">
            <AlertCircle size={14} aria-hidden="true" />
            <span>{imageError}</span>
          </div>
        )}
        {documentLayer}
      </div>
    </div>
  );
}
