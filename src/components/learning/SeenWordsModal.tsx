'use client';

import { useState, useEffect, useTransition } from 'react';
import type { SeenWordItem } from '@/app/actions/word-actions';
import { getSeenWords, removeSeenWord, resetAllSeenWords } from '@/app/actions/word-actions';

type Props = {
  usuarioId: number;
  onClose: () => void;
  onStatsChange: (newCount: number) => void;
};

export default function SeenWordsModal({ usuarioId, onClose, onStatsChange }: Props) {
  const [words, setWords] = useState<SeenWordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getSeenWords(usuarioId).then((w) => {
      setWords(w);
      setLoading(false);
    });
  }, [usuarioId]);

  const handleRemove = (palabraId: number) => {
    startTransition(async () => {
      const res = await removeSeenWord(usuarioId, palabraId);
      if (!res.error) {
        const updated = words.filter((w) => w.palabraId !== palabraId);
        setWords(updated);
        onStatsChange(updated.length);
      }
    });
  };

  const handleReset = () => {
    startTransition(async () => {
      const res = await resetAllSeenWords(usuarioId);
      if (!res.error) {
        setWords([]);
        onStatsChange(0);
        setConfirmReset(false);
      }
    });
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: '20px',
        width: '100%', maxWidth: '860px',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          padding: '24px 28px 20px',
          borderBottom: '1px solid #e0f2f1',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #00695c 0%, #004d40 100%)',
        }}>
          <div>
            <h2 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
              👁 Palabras Vistas
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.82rem', margin: '4px 0 0' }}>
              {loading ? 'Cargando...' : `${words.length} ${words.length === 1 ? 'palabra' : 'palabras'} — al remover vuelven a estar disponibles`}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.15)', border: 'none',
              borderRadius: '10px', padding: '8px 12px',
              color: '#fff', fontSize: '1rem', cursor: 'pointer',
            }}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#90a4ae', padding: '40px 0' }}>
              Cargando palabras...
            </div>
          ) : words.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#90a4ae', padding: '40px 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>👁</div>
              <p style={{ fontWeight: 600 }}>No hay palabras vistas</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
            }}>
              {words.map((w) => (
                <div
                  key={w.palabraId}
                  style={{
                    background: '#f0fdf9',
                    border: '1px solid #b2dfdb',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    opacity: isPending ? 0.6 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.95rem', fontWeight: 700,
                      color: '#00695c', whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {w.palabra}
                    </div>
                    <div style={{
                      fontSize: '0.75rem', color: '#546e7a',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {w.traduccion}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(w.palabraId)}
                    disabled={isPending}
                    title="Desmarcar vista"
                    style={{
                      flexShrink: 0,
                      background: 'rgba(244,67,54,0.08)',
                      border: '1px solid rgba(244,67,54,0.2)',
                      borderRadius: '8px',
                      padding: '5px 8px',
                      color: '#c62828', cursor: 'pointer',
                      fontSize: '0.75rem', fontWeight: 700,
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '18px 28px',
          borderTop: '1px solid #e0f2f1',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: '12px',
          background: '#fafffe',
        }}>
          {confirmReset ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
              <span style={{ fontSize: '0.85rem', color: '#c62828', fontWeight: 600 }}>
                ¿Resetear todas las palabras vistas?
              </span>
              <button
                onClick={handleReset}
                disabled={isPending}
                style={{
                  background: '#c62828', border: 'none', borderRadius: '8px',
                  padding: '8px 16px', color: '#fff', fontWeight: 700,
                  fontSize: '0.82rem', cursor: 'pointer',
                }}
              >
                {isPending ? 'Reseteando...' : 'Sí, resetear'}
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                disabled={isPending}
                style={{
                  background: 'transparent', border: '1px solid #ccc',
                  borderRadius: '8px', padding: '8px 16px',
                  color: '#546e7a', fontWeight: 600,
                  fontSize: '0.82rem', cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              disabled={isPending || words.length === 0}
              style={{
                background: 'rgba(244,67,54,0.08)',
                border: '1px solid rgba(244,67,54,0.25)',
                borderRadius: '10px', padding: '10px 20px',
                color: '#c62828', fontWeight: 700,
                fontSize: '0.85rem', cursor: words.length === 0 ? 'not-allowed' : 'pointer',
                opacity: words.length === 0 ? 0.5 : 1,
              }}
            >
              🔄 Reset todo
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              background: 'linear-gradient(135deg, #00695c, #004d40)',
              border: 'none', borderRadius: '10px',
              padding: '10px 24px', color: '#fff',
              fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
