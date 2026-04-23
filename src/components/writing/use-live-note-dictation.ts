"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type DictationLanguage = "en-US" | "th-TH";

type DictationSession = {
  noteId: number;
  lang: DictationLanguage;
};

type RecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0?: {
      transcript?: string;
    };
  }>;
};

type RecognitionErrorEventLike = {
  error?: string;
};

type RecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives?: number;
  onstart: (() => void) | null;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: RecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};

type RecognitionConstructor = new () => RecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  }
}

export const LIVE_NOTE_DICTATION_LABELS: Record<
  DictationLanguage,
  { short: string; full: string }
> = {
  "en-US": { short: "EN", full: "English" },
  "th-TH": { short: "TH-EN", full: "Thai-English" },
};

function getRecognitionErrorMessage(error?: string) {
  switch (error) {
    case "audio-capture":
      return "Microphone access is blocked. Please allow mic access and try again.";
    case "language-not-supported":
      return "This browser does not support dictation for that language.";
    case "network":
      return "Dictation could not reach the browser speech service.";
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone permission is not available in this browser session.";
    case "no-speech":
      return "No speech was detected. Try speaking a little closer to the mic.";
    default:
      return "Dictation stopped unexpectedly. Please try again.";
  }
}

export function useLiveNoteDictation(
  onCommit: (noteId: number, nextText: string) => void,
) {
  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const sessionIdRef = useRef(0);
  const seedTextRef = useRef("");
  const finalTranscriptRef = useRef("");

  const [activeSession, setActiveSession] = useState<DictationSession | null>(null);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorNoteId, setErrorNoteId] = useState<number | null>(null);
  const supported =
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    return () => {
      sessionIdRef.current += 1;
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  const stopDictation = useCallback(() => {
    sessionIdRef.current += 1;
    setActiveSession(null);
    setInterimTranscript("");
    finalTranscriptRef.current = "";
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  const clearDictationError = useCallback(() => {
    setErrorMessage(null);
    setErrorNoteId(null);
  }, []);

  const syncActiveText = useCallback((noteId: number, nextText: string) => {
    if (activeSession?.noteId !== noteId) {
      return;
    }

    // Allow teacher edits while dictation is active by treating the latest typed
    // content as the new baseline for upcoming dictated chunks.
    seedTextRef.current = nextText.trim();
    finalTranscriptRef.current = "";
    setInterimTranscript("");
  }, [activeSession]);

  const isListening = useCallback(
    (noteId: number, lang?: DictationLanguage) =>
      activeSession?.noteId === noteId && (!lang || activeSession.lang === lang),
    [activeSession],
  );

  const startDictation = useCallback(
    (noteId: number, lang: DictationLanguage, seedText: string) => {
      if (typeof window === "undefined") return;

      const Recognition =
        window.SpeechRecognition ?? window.webkitSpeechRecognition;

      if (!Recognition) {
        setErrorMessage("Live dictation is not available in this browser.");
        setErrorNoteId(noteId);
        return;
      }

      if (activeSession?.noteId === noteId && activeSession.lang === lang) {
        stopDictation();
        return;
      }

      sessionIdRef.current += 1;
      const sessionId = sessionIdRef.current;

      recognitionRef.current?.stop();
      recognitionRef.current = null;

      seedTextRef.current = seedText.trim();
      finalTranscriptRef.current = "";
      setInterimTranscript("");
      setErrorMessage(null);
      setErrorNoteId(noteId);

      const recognition = new Recognition();
      recognitionRef.current = recognition;
      recognition.lang = lang;
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        if (sessionId !== sessionIdRef.current) return;
        setActiveSession({ noteId, lang });
      };

      recognition.onresult = (event) => {
        if (sessionId !== sessionIdRef.current) return;

        let nextInterim = "";
        let nextFinal = "";

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = result?.[0]?.transcript?.trim() ?? "";
          if (!transcript) continue;

          if (result.isFinal) {
            nextFinal = `${nextFinal} ${transcript}`.trim();
          } else {
            nextInterim = `${nextInterim} ${transcript}`.trim();
          }
        }

        if (nextFinal) {
          finalTranscriptRef.current = `${finalTranscriptRef.current} ${nextFinal}`.trim();
          const nextText = [seedTextRef.current, finalTranscriptRef.current]
            .filter(Boolean)
            .join(seedTextRef.current && finalTranscriptRef.current ? "\n" : "");
          onCommit(noteId, nextText);
        }

        setInterimTranscript(nextInterim);
      };

      recognition.onerror = (event) => {
        if (sessionId !== sessionIdRef.current) return;
        setActiveSession(null);
        setInterimTranscript("");
        recognitionRef.current = null;
        setErrorMessage(getRecognitionErrorMessage(event.error));
        setErrorNoteId(noteId);
      };

      recognition.onend = () => {
        if (sessionId !== sessionIdRef.current) return;
        setActiveSession(null);
        setInterimTranscript("");
        recognitionRef.current = null;
      };

      recognition.start();
    },
    [activeSession, onCommit, stopDictation],
  );

  return {
    supported,
    activeSession,
    interimTranscript,
    errorMessage,
    errorNoteId,
    isListening,
    startDictation,
    stopDictation,
    clearDictationError,
    syncActiveText,
  };
}
