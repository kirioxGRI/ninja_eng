'use client';

import { useEffect, useState } from 'react';
import { generateExampleSentence } from '@/lib/browser-ai';
import { speakWord, speakSentence } from '@/lib/speech';

type Props = {
  word: string;
  pronunciacion?: string;
  traduccion?: string;
  oracion?: string;
  onClose: () => void;
};

export default function WordModal({ word, pronunciacion, traduccion, oracion, onClose }: Props) {
  const [generatedSentence, setGeneratedSentence] = useState<string>('');
  const [generating, setGenerating] = useState(true);

  useEffect(() => {
    let active = true;
    
    // Set loading state asynchronously to avoid ESLint warning on sync setState in effect
    Promise.resolve().then(() => {
      if (active) {
        setGenerating(true);
        setGeneratedSentence('');
      }
    });

    generateExampleSentence(word)
      .then((s) => {
        if (active) setGeneratedSentence(s);
      })
      .finally(() => {
        if (active) setGenerating(false);
      });

    return () => {
      active = false;
    };
  }, [word]);

  // Close on overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={handleOverlayClick} id="word-modal-overlay">
      <div className="modal-box" id="word-modal-box">
        <button className="modal-close" onClick={onClose} id="modal-close-btn" aria-label="Cerrar modal">✕</button>

        {/* Word */}
        <div className="modal-word">{word}</div>
        {pronunciacion && <div className="modal-pron">/{pronunciacion}/</div>}
        <div className="modal-trans">🇪🇸 {traduccion || 'No registrada'}</div>

        {/* Original sentence */}
        {oracion && (
          <>
            <div className="modal-sentence-label">Oración original</div>
            <div className="modal-sentence">{oracion}</div>
          </>
        )}

        {/* Generated sentence */}
        <div className="modal-sentence-label">Oración generada con IA</div>
        <div className="modal-sentence" style={{ minHeight: 48 }}>
          {generating ? (
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem' }}>Generando…</span>
          ) : (
            generatedSentence
          )}
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button
            id="modal-speak-word"
            className="btn btn-primary btn-sm"
            onClick={() => speakWord(word)}
          >
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
            Escuchar palabra
          </button>
          <button
            id="modal-speak-sentence"
            className="btn btn-ghost btn-sm"
            onClick={() => speakSentence(generatedSentence || oracion || word)}
            disabled={generating}
          >
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
            Escuchar oración
          </button>
          <button
            id="modal-close-bottom"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
