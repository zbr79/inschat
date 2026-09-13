"use client";

import { useEffect, useRef, useState } from "react";
import { GUEST_MAX_AUDIO_MS, MAX_AUDIO_BYTES, USER_MAX_AUDIO_MS } from "@/lib/types";
import {
  isVoiceInputSupported,
  recordVoice,
  VoiceInputError,
  type VoiceRecordHandle,
} from "@/lib/audioRecorder";

export type VoiceStatus = "idle" | "recording" | "transcribing";

export type VoiceLabels = {
  micUnsupported: string;
  micDenied: string;
  audioTooLarge: string;
  transcribeUnavailable: string;
};

export function formatVoiceElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function useVoiceInput(opts: {
  disabled: boolean;
  signedIn: boolean;
  labels: VoiceLabels;
  onTranscript: (text: string, autoSend: boolean) => void;
}) {
  const { disabled, signedIn, labels, onTranscript } = opts;
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const voiceRef = useRef<VoiceRecordHandle | null>(null);
  const autoSendRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;
  const labelsRef = useRef(labels);
  labelsRef.current = labels;

  useEffect(() => {
    return () => {
      voiceRef.current?.cancel();
    };
  }, []);

  const transcribe = async (blob: Blob, durationMs: number) => {
    if (blob.size > MAX_AUDIO_BYTES) {
      setVoiceHint(labelsRef.current.audioTooLarge);
      setVoiceStatus("idle");
      return;
    }
    setVoiceStatus("transcribing");
    const shouldAutoSend = autoSendRef.current;
    autoSendRef.current = false;
    const body = new FormData();
    body.append("file", blob, "dictation.wav");
    body.append("language", "auto");
    body.append("durationMs", String(durationMs));
    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body,
        credentials: "same-origin",
        signal: AbortSignal.timeout(240000),
      });
      const payload = (await response.json().catch(() => null)) as
        | { text?: string; error?: string }
        | null;
      if (response.status === 503) {
        setVoiceHint(labelsRef.current.transcribeUnavailable);
        return;
      }
      if (response.status === 413) {
        setVoiceHint(labelsRef.current.audioTooLarge);
        return;
      }
      if (!response.ok) {
        setVoiceHint(null);
        return;
      }
      const transcript = payload?.text?.trim() ?? "";
      if (!transcript) {
        setVoiceHint(null);
        return;
      }
      setVoiceHint(null);
      onTranscriptRef.current(transcript, shouldAutoSend);
    } catch {
      setVoiceHint(null);
    } finally {
      setVoiceStatus("idle");
    }
  };

  const requestAutoSend = () => {
    autoSendRef.current = true;
  };

  const stopAndTranscribe = () => {
    setVoiceStatus("transcribing");
    voiceRef.current?.stop();
  };

  const startRecording = () => {
    if (disabled || voiceStatus !== "idle") return;
    if (!isVoiceInputSupported()) {
      setVoiceHint(labels.micUnsupported);
      return;
    }
    setVoiceHint(null);
    setElapsedMs(0);
    const handle = recordVoice({
      maxMs: signedIn ? USER_MAX_AUDIO_MS : GUEST_MAX_AUDIO_MS,
      onTick: setElapsedMs,
    });
    voiceRef.current = handle;
    setVoiceStatus("recording");
    void handle.result
      .then((recording) => {
        if (voiceRef.current !== handle) return;
        voiceRef.current = null;
        void transcribe(recording.blob, recording.durationMs);
      })
      .catch((error: unknown) => {
        if (voiceRef.current !== handle) return;
        voiceRef.current = null;
        setVoiceStatus("idle");
        if (error instanceof VoiceInputError && error.code === "cancelled") return;
        if (error instanceof VoiceInputError && error.code === "unsupported") {
          setVoiceHint(labelsRef.current.micUnsupported);
          return;
        }
        if (error instanceof VoiceInputError && error.code === "denied") {
          setVoiceHint(labelsRef.current.micDenied);
          return;
        }
        setVoiceHint(null);
      });
  };

  const handleMic = () => {
    if (voiceStatus === "recording") {
      setVoiceStatus("transcribing");
      voiceRef.current?.stop();
      return;
    }
    if (voiceStatus === "transcribing") return;
    startRecording();
  };

  return {
    voiceHint,
    voiceStatus,
    elapsedMs,
    handleMic,
    requestAutoSend,
    stopAndTranscribe,
  };
}
