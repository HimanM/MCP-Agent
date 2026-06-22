"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { fetchTtsAudio } from "@/lib/api";

export interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

export function isSpeechRecognitionSupported() {
  if (typeof window === "undefined") return false;
  return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export function createRecognition(lang = "en-US"): RecognitionLike | null {
  if (typeof window === "undefined") return null;
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Ctor) return null;
  const recognition: RecognitionLike = new Ctor();
  recognition.lang = lang;
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  return recognition;
}

export function isSpeechSynthesisSupported() {
  return typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined";
}

function localeForLanguage(language: string) {
  if (language === "si") return "si-LK";
  if (language === "ta") return "ta-LK";
  return "en-IN";
}

let activeAudio: HTMLAudioElement | null = null;

export function stripForSpeech(text: string) {
  return text
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[*_`#>~]/g, "")
    .replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function speakText(text: string, language = "en") {
  if (!isSpeechSynthesisSupported()) return;
  const clean = stripForSpeech(text);
  if (!clean) return;
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = localeForLanguage(language);
  utterance.rate = 1.02;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
  if (!isSpeechSynthesisSupported()) return;
  window.speechSynthesis.cancel();
}

export async function playAssistantSpeech(text: string, language = "en", preferApi = true) {
  const clean = stripForSpeech(text);
  if (!clean) return "empty";

  if (preferApi) {
    try {
      const blob = await fetchTtsAudio(clean, language);
      stopSpeaking();
      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      activeAudio = audio;
      audio.onended = () => {
        URL.revokeObjectURL(objectUrl);
        if (activeAudio === audio) activeAudio = null;
      };
      await audio.play();
      return "api";
    } catch {
      // fall through to browser speech
    }
  }

  speakText(clean, language);
  return "browser";
}
