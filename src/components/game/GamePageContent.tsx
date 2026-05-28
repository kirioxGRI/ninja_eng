'use client';

import { useState } from 'react';
import DictationGame from './DictationGame';
import WritingWordGame from './WritingWordGame';
import SpeakingGame from './SpeakingGame';

type GameId = 'writing-word' | 'writing-sentences' | 'dictation';

const games: {
  id: GameId;
  title: string;
  description: string;
  color: string;
  bg: string;
  available: boolean;
  icon: React.ReactNode;
}[] = [
  {
    id: 'writing-word',
    title: 'Writing',
    description: 'Juego de mecanografía. Escribe las palabras y oraciones en inglés que caen antes de que toquen el fondo.',
    color: '#1565c0',
    bg: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
    available: true,
    icon: (
      <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    id: 'writing-sentences',
    title: 'Speaking',
    description: 'Escucha una palabra en inglés y pronúnciala correctamente. El navegador validará tu pronunciación.',
    color: '#00695c',
    bg: 'linear-gradient(135deg, #00695c 0%, #004d40 100%)',
    available: true,
    icon: (
      <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'dictation',
    title: 'Listening',
    description: 'Escucha la pronunciación de una palabra u oración y escríbela correctamente antes de que se acabe el tiempo.',
    color: '#bf360c',
    bg: 'linear-gradient(135deg, #bf360c 0%, #870000 100%)',
    available: true,
    icon: (
      <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
  },
];

export default function GamePageContent() {
  const [activeGame, setActiveGame] = useState<GameId | null>(null);

  if (activeGame === 'dictation') {
    return <DictationGame onExit={() => setActiveGame(null)} />;
  }

  if (activeGame === 'writing-word') {
    return <WritingWordGame onExit={() => setActiveGame(null)} />;
  }

  if (activeGame === 'writing-sentences') {
    return <SpeakingGame onExit={() => setActiveGame(null)} />;
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">
          <h2>Game</h2>
          <p>Elige un modo de juego para practicar tu vocabulario</p>
        </div>
      </div>

      <div className="page-content">
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '20px',
          maxWidth: '900px',
          margin: '0 auto',
        }}>
          {games.map((game) => (
            <div
              key={game.id}
              onClick={() => game.available && setActiveGame(game.id)}
              style={{
                flex: '1 1 260px',
                maxWidth: '350px',
                background: '#fff',
                borderRadius: '18px',
                boxShadow: game.available
                  ? '0 4px 18px rgba(0,0,0,0.1)'
                  : '0 2px 10px rgba(0,0,0,0.06)',
                border: game.available ? `1.5px solid ${game.color}22` : '1px solid #e8eef8',
                overflow: 'hidden',
                opacity: game.available ? 1 : 0.68,
                cursor: game.available ? 'pointer' : 'default',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={(e) => {
                if (game.available) {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 28px rgba(0,0,0,0.14)';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = game.available
                  ? '0 4px 18px rgba(0,0,0,0.1)'
                  : '0 2px 10px rgba(0,0,0,0.06)';
              }}
            >
              {/* Header */}
              <div style={{
                background: game.bg,
                padding: '28px 24px 20px',
                color: '#fff',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
              }}>
                <div style={{
                  background: 'rgba(255,255,255,0.18)',
                  borderRadius: '12px',
                  padding: '10px',
                  flexShrink: 0,
                }}>
                  {game.icon}
                </div>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '5px' }}>
                    {game.title}
                  </div>
                  {game.available ? (
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.8px', background: 'rgba(255,255,255,0.25)',
                      padding: '2px 8px', borderRadius: '6px',
                    }}>
                      Disponible
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.8px', background: 'rgba(255,255,255,0.18)',
                      padding: '2px 8px', borderRadius: '6px',
                    }}>
                      Próximamente
                    </span>
                  )}
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '18px 22px 22px' }}>
                <p style={{ fontSize: '0.85rem', color: '#546e7a', lineHeight: 1.6, margin: '0 0 18px' }}>
                  {game.description}
                </p>
                <button
                  disabled={!game.available}
                  style={{
                    width: '100%', padding: '11px', borderRadius: '10px', border: 'none',
                    background: game.available ? game.bg : '#eeeeee',
                    color: game.available ? '#fff' : '#9e9e9e',
                    fontWeight: 700, fontSize: '0.85rem',
                    cursor: game.available ? 'pointer' : 'not-allowed',
                    transition: 'opacity 0.15s',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (game.available) setActiveGame(game.id);
                  }}
                >
                  {game.available ? '🎮 Jugar' : 'No disponible aún'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
