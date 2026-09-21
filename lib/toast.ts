"use client";

import { toast } from "react-hot-toast";

const MAX_TOASTS = 3;
const HARD_CLOSE_MS = 2500;
const toastQueue: string[] = [];

function pushToast(id: string) {
  toastQueue.push(id);
  if (toastQueue.length > MAX_TOASTS) {
    const oldest = toastQueue.shift();
    if (oldest) toast.dismiss(oldest);
  }
}

function showToast(create: () => string) {
  const id = create();
  pushToast(id);
  window.setTimeout(() => toast.dismiss(id), HARD_CLOSE_MS);
}

export function toastSuccess(message: string) {
  showToast(() => toast.success(message));
}

export function toastError(message: string) {
  showToast(() => toast.error(message));
}

export function toastInfo(message: string) {
  showToast(() => toast(message));
}

export function toastWarning(message: string) {
  showToast(() => toast.error(message));
}
