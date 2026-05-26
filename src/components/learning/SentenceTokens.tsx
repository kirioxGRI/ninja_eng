'use client';

import { useState } from 'react';
import { findWordByText } from '@/app/actions/word-actions';
import WordModal from './WordModal';

type Props = {
  sentence: string;
};

type ModalData = {
  word: string;
  pronunciacion?: string;
  traduccion?: string;
  oracion?: string;
} | null;

export default function SentenceTokens({ sentence }: Props) {
  const [tooltip, setTooltip] = useState<{ index: number; text: string } | null>(null);
  const [modal, setModal] = useState<ModalData>(null);
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

  // Split sentence preserving spaces/punctuation attached to words
  const tokens = sentence.match(/[\w']+|[^\w\s]/g) || sentence.split(' ');

  const handleHover = async (token: string, idx: number) => {
    const clean = token.replace(/[^a-zA-Z']/g, '');
    if (!clean) return;
    const found = await findWordByText(clean);
    setTooltip({
      index: idx,
      text: found?.traduccion_espanol ?? 'Sin traducción',
    });
  };

  const handleClick = async (token: string, idx: number) => {
    const clean = token.replace(/[^a-zA-Z']/g, '');
    if (!clean) return;
    setLoadingIndex(idx);
    const found = await findWordByText(clean);
    setModal({
      word: clean,
      pronunciacion: found?.pronunciacion ?? undefined,
      traduccion: found?.traduccion_espanol ?? 'No registrada',
      oracion: found?.oracion_ejemplo ?? undefined,
    });
    setLoadingIndex(null);
  };

  return (
    <>
      <p className="word-sentence">
        {tokens.map((token, idx) => {
          const isWord = /[\w']/.test(token);
          if (!isWord) return <span key={idx}>{token} </span>;

          return (
            <span
              key={idx}
              className="tooltip-container"
              style={{ display: 'inline', position: 'relative' }}
            >
              <span
                className="token"
                onMouseEnter={() => handleHover(token, idx)}
                onMouseLeave={() => setTooltip(null)}
                onClick={() => handleClick(token, idx)}
                style={{ opacity: loadingIndex === idx ? 0.5 : 1 }}
              >
                {token}
              </span>
              {tooltip?.index === idx && (
                <span className="tooltip-box">{tooltip.text}</span>
              )}
              {' '}
            </span>
          );
        })}
      </p>

      {modal && (
        <WordModal
          word={modal.word}
          pronunciacion={modal.pronunciacion}
          traduccion={modal.traduccion}
          oracion={modal.oracion}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
