// lib/speech.ts
'use client';

// Preferred voices ranked by quality (highest first)
const VOICE_PRIORITY = [
  'Google US English',
  'Google UK English Female',
  'Google UK English Male',
  'Microsoft Aria',
  'Microsoft Guy',
  'Microsoft Jenny',
  'Samantha',       // macOS
  'Alex',           // macOS
  'Karen',          // macOS
];

function getBestEnglishVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  for (const preferred of VOICE_PRIORITY) {
    const found = voices.find((v) => v.name.includes(preferred));
    if (found) return found;
  }
  // Any en-US voice
  return (
    voices.find((v) => v.lang === 'en-US') ||
    voices.find((v) => v.lang.startsWith('en')) ||
    null
  );
}

function speakText(text: string, rate: number, pitch: number): void {
  if (typeof window === 'undefined') return;
  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  utterance.pitch = pitch;
  utterance.volume = 1;

  const voice = getBestEnglishVoice();
  if (voice) utterance.voice = voice;

  // Chrome bug: voices may not be loaded yet on first call
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      const v = getBestEnglishVoice();
      if (v) utterance.voice = v;
      window.speechSynthesis.speak(utterance);
    };
  } else {
    window.speechSynthesis.speak(utterance);
  }
}

export function speakWord(word: string): void {
  speakText(word, 0.8, 1.05);
}

export function speakSentence(sentence: string): void {
  speakText(sentence, 0.88, 1.0);
}
