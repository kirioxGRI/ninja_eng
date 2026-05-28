'use client';

import { useState, useEffect, useRef } from 'react';
import { getWordsForTypingGame } from '@/app/actions/game-actions';

type Phase = 'idle' | 'loading' | 'playing' | 'gameover';

interface ActiveWord {
  id: number;
  word: string;
  translation: string;
  isSentence: boolean;
  x: number; // 5 to 80 (percentage)
  y: number; // 0 to 100 (percentage)
  speed: number; // speed per frame
  progress: number; // correctly typed characters count
  isExploding: boolean;
  explodeTimer: number;
}

type Props = { onExit: () => void };

export default function WritingWordGame({ onExit }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [wordsPool, setWordsPool] = useState<{ id: number; word: string; translation: string; isSentence: boolean }[]>([]);
  const [activeWords, setActiveWords] = useState<ActiveWord[]>([]);
  const [flashRed, setFlashRed] = useState(false);
  const [flashGreen, setFlashGreen] = useState(false);
  const [maxSimultaneous, setMaxSimultaneous] = useState(1);

  const activeWordsRef = useRef<ActiveWord[]>([]);
  const wordsPoolRef = useRef<typeof wordsPool>([]);
  const scoreRef = useRef<number>(0);
  const levelRef = useRef<number>(1);
  const livesRef = useRef<number>(3);
  const maxSimultaneousRef = useRef<number>(1);
  const spawnTimerRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const animationFrameIdRef = useRef<number | null>(null);

  // Sync refs to avoid stale closures in frame loops
  useEffect(() => {
    activeWordsRef.current = activeWords;
  }, [activeWords]);

  useEffect(() => {
    wordsPoolRef.current = wordsPool;
  }, [wordsPool]);

  useEffect(() => {
    scoreRef.current = score;
    const nextLevel = Math.floor(score / 80) + 1;
    if (nextLevel !== level && phase === 'playing') {
      setLevel(nextLevel);
      levelRef.current = nextLevel;
    }
  }, [score, level, phase]);

  useEffect(() => {
    livesRef.current = lives;
    if (lives <= 0 && phase === 'playing') {
      endGame();
    }
  }, [lives, phase]);

  // Load words from DB on mount
  useEffect(() => {
    loadGameData();
  }, []);

  async function loadGameData() {
    try {
      setPhase('loading');
      const fetched = await getWordsForTypingGame();
      if (fetched && fetched.length > 0) {
        setWordsPool(fetched);
      } else {
        useFallbackPool();
      }
    } catch (err) {
      console.error("Error loading words from database, using fallback:", err);
      useFallbackPool();
    } finally {
      setPhase('idle');
    }
  }

  function useFallbackPool() {
    setWordsPool([
      { id: 1, word: 'welcome', translation: 'bienvenido', isSentence: false },
      { id: 2, word: 'english', translation: 'inglés', isSentence: false },
      { id: 3, word: 'learning', translation: 'aprendizaje', isSentence: false },
      { id: 4, word: 'keyboard', translation: 'teclado', isSentence: false },
      { id: 5, word: 'software', translation: 'software', isSentence: false },
      { id: 6, word: 'adventure', translation: 'aventura', isSentence: false },
      { id: 7, word: 'speed', translation: 'velocidad', isSentence: false },
      { id: 8, word: 'challenge', translation: 'desafío', isSentence: false },
      { id: 9, word: 'practice makes perfect', translation: 'la práctica hace al maestro', isSentence: true },
      { id: 10, word: 'never give up', translation: 'nunca te rindas', isSentence: true }
    ]);
  }

  function spawnWordInList(pool: typeof wordsPool, currentList: ActiveWord[]): ActiveWord[] {
    if (pool.length === 0) return currentList;

    const selected = pool[Math.floor(Math.random() * pool.length)];
    const baseSpeed = 4.5 + levelRef.current * 0.75;
    const speedVariation = Math.random() * 1.5;
    const finalSpeed = (selected.isSentence ? baseSpeed * 0.78 : baseSpeed) + speedVariation;

    const spawnX = findValidSpawnXForList(selected.word, currentList);

    const newWord: ActiveWord = {
      id: Date.now() + Math.random(),
      word: selected.word,
      translation: selected.translation,
      isSentence: selected.isSentence,
      x: spawnX,
      y: -8, // Start slightly above the top boundary
      speed: finalSpeed,
      progress: 0,
      isExploding: false,
      explodeTimer: 0,
    };

    return [...currentList, newWord];
  }

  function startGame() {
    setScore(0);
    setLives(3);
    setLevel(1);
    levelRef.current = 1;
    scoreRef.current = 0;
    livesRef.current = 3;
    
    // Spawn initial words based on maxSimultaneous setting
    let initialList: ActiveWord[] = [];
    const pool = wordsPoolRef.current;
    const initialCount = Math.min(maxSimultaneousRef.current, pool.length);
    if (pool.length > 0) {
      for (let i = 0; i < initialCount; i++) {
        initialList = spawnWordInList(pool, initialList);
      }
    }
    
    setActiveWords(initialList);
    activeWordsRef.current = initialList;
    
    spawnTimerRef.current = 0; // reset spawn timer
    lastFrameTimeRef.current = performance.now();
    setPhase('playing');
  }

  function endGame() {
    setPhase('gameover');
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
  }

  // Prevent superpositions of falling words
  function findValidSpawnXForList(wordText: string, currentList: ActiveWord[]): number {
    let attempts = 0;
    let bestX = 20 + Math.random() * 60; // default random (centered positioning)

    while (attempts < 10) {
      const candidateX = 15 + Math.random() * 70; // 15% to 85% (words are centered via translateX(-50%))
      // Check if candidateX is too close to any word currently near the top (y < 22)
      const isOverlap = currentList.some((w) => {
        if (w.y > 22) return false;
        const textLenDiff = Math.max(w.word.length, wordText.length) * 0.7;
        return Math.abs(w.x - candidateX) < 14 + textLenDiff;
      });

      if (!isOverlap) {
        return candidateX;
      }
      attempts++;
    }
    return bestX;
  }

  // Animation and physics loop
  useEffect(() => {
    if (phase !== 'playing') return;

    function gameLoop(timestamp: number) {
      const elapsed = timestamp - lastFrameTimeRef.current;
      lastFrameTimeRef.current = timestamp;

      // Normalize delta time (seconds)
      const dt = elapsed / 1000;

      // 1. Fall physics and explosion updates
      let lifeLostOccurred = false;
      let nextActiveWords = activeWordsRef.current
        .map((w) => {
          if (w.isExploding) {
            return {
              ...w,
              explodeTimer: w.explodeTimer + dt,
            };
          }
          const nextY = w.y + w.speed * dt;
          return {
            ...w,
            y: nextY,
          };
        })
        .filter((w) => {
          if (w.isExploding) {
            return w.explodeTimer < 0.28;
          }
          if (w.y >= 92) {
            lifeLostOccurred = true;
            return false;
          }
          return true;
        });

      // 2. Check spawn timer using dt accumulator (respecting maxSimultaneous cap)
      spawnTimerRef.current += dt;
      const spawnInterval = Math.max(1.6, 3.6 - levelRef.current * 0.32);
      const nonExplodingCount = nextActiveWords.filter(w => !w.isExploding).length;
      if (spawnTimerRef.current >= spawnInterval && nonExplodingCount < maxSimultaneousRef.current) {
        nextActiveWords = spawnWordInList(wordsPoolRef.current, nextActiveWords);
        spawnTimerRef.current = 0;
      }

      if (lifeLostOccurred) {
        setLives((l) => Math.max(0, l - 1));
        setFlashRed(true);
        setTimeout(() => setFlashRed(false), 200);
      }

      // 3. Apply the single batched state update!
      setActiveWords(nextActiveWords);
      activeWordsRef.current = nextActiveWords; // keep ref in sync immediately!

      animationFrameIdRef.current = requestAnimationFrame(gameLoop);
    }

    lastFrameTimeRef.current = performance.now();
    animationFrameIdRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [phase]);

  // Global keyboard input listener — MULTI-TARGET system
  // No exclusive lock: each keystroke advances whichever word matches.
  // Priority: words with existing progress first (sorted by most progress then closest to bottom),
  // then new words (sorted by closest to bottom).
  useEffect(() => {
    if (phase !== 'playing') return;

    function handleKeyDown(e: KeyboardEvent) {
      const active = activeWordsRef.current;

      // Ignore utility keys
      if (e.key === 'Alt' || e.key === 'Control' || e.key === 'Shift' || e.key === 'Meta' || e.key === 'CapsLock') {
        return;
      }

      // ESC: reset ALL progress on all words
      if (e.key === 'Escape') {
        const hasProgress = active.some((w) => w.progress > 0 && !w.isExploding);
        if (hasProgress) {
          const nextActive = active.map((w) => (w.isExploding ? w : { ...w, progress: 0 }));
          setActiveWords(nextActive);
          activeWordsRef.current = nextActive;
        }
        return;
      }

      // Backspace: reduce progress on the word closest to the bottom that has progress
      if (e.key === 'Backspace') {
        const wordsWithProgress = active
          .filter((w) => w.progress > 0 && !w.isExploding)
          .sort((a, b) => b.y - a.y); // closest to bottom first

        if (wordsWithProgress.length > 0) {
          const target = wordsWithProgress[0];
          const nextActive = active.map((w) => {
            if (w.id === target.id) {
              return { ...w, progress: Math.max(0, w.progress - 1) };
            }
            return w;
          });
          setActiveWords(nextActive);
          activeWordsRef.current = nextActive;
        }
        return;
      }

      // We only care about characters of length 1 (alphanumeric/spaces/punctuation)
      if (e.key.length !== 1) return;
      const typedChar = e.key.toLowerCase();

      // STEP 1: Try to advance a word that ALREADY has progress
      // Among words with progress, prioritize: most progress first, then closest to bottom
      const wordsInProgress = active
        .filter((w) => !w.isExploding && w.progress > 0 && w.progress < w.word.length)
        .filter((w) => w.word[w.progress].toLowerCase() === typedChar)
        .sort((a, b) => {
          if (b.progress !== a.progress) return b.progress - a.progress; // most progress first
          return b.y - a.y; // then closest to bottom
        });

      if (wordsInProgress.length > 0) {
        const target = wordsInProgress[0];
        const nextProgress = target.progress + 1;
        const nextActive = active.map((w) => (w.id === target.id ? { ...w, progress: nextProgress } : w));
        setActiveWords(nextActive);
        activeWordsRef.current = nextActive;

        playAudioFeedback(true);
        checkWordCompletionInList(target.id, nextProgress, target.word, nextActive);
        return;
      }

      // STEP 2: Try to START a new word (progress === 0) whose first char matches
      // Priority: closest to bottom (most urgent)
      const newCandidates = active
        .filter((w) => !w.isExploding && w.progress === 0 && w.word[0].toLowerCase() === typedChar)
        .sort((a, b) => b.y - a.y);

      if (newCandidates.length > 0) {
        const target = newCandidates[0];
        const nextActive = active.map((w) => (w.id === target.id ? { ...w, progress: 1 } : w));
        setActiveWords(nextActive);
        activeWordsRef.current = nextActive;

        playAudioFeedback(true);
        checkWordCompletionInList(target.id, 1, target.word, nextActive);
        return;
      }

      // Nothing matched
      playAudioFeedback(false);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase]);

  function checkWordCompletionInList(wordId: number, currentProgress: number, fullText: string, currentList: ActiveWord[]) {
    if (currentProgress >= fullText.length) {
      setFlashGreen(true);
      setTimeout(() => setFlashGreen(false), 150);

      const pointsEarned = fullText.length * 2;
      setScore((s) => s + pointsEarned);

      const nextActive = currentList.map((w) => (w.id === wordId ? { ...w, isExploding: true, explodeTimer: 0 } : w));
      setActiveWords(nextActive);
      activeWordsRef.current = nextActive;
    }
  }

  // Premium synth audio effects
  function playAudioFeedback(correct: boolean) {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (correct) {
        osc.frequency.setValueAtTime(680, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      }
    } catch {
      // Fallback silently
    }
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">
          <h2>Writing Word – Typing Tutor</h2>
          <p>Escribe las palabras y oraciones antes de que toquen el fondo</p>
        </div>
      </div>

      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* GAMEBOARD PANEL */}
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: '1512px',
          height: '620px',
          margin: '0 auto',
          background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: flashRed 
            ? '0 0 45px rgba(239, 83, 80, 0.45), inset 0 0 24px rgba(239, 83, 80, 0.3)'
            : flashGreen
            ? '0 0 45px rgba(76, 175, 80, 0.35), inset 0 0 20px rgba(76, 175, 80, 0.2)'
            : '0 16px 48px rgba(0,0,0,0.4)',
          border: flashRed
            ? '2.5px solid #ef5350'
            : flashGreen
            ? '2.5px solid #66bb6a'
            : '1.5px solid rgba(255,255,255,0.08)',
          transition: 'box-shadow 0.18s ease, border-color 0.18s ease',
        }}>
          
          {/* Neon Grid Overlay for Retro Arcade Look */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
            pointerEvents: 'none',
          }} />

          {/* PLAYING GUI */}
          {phase === 'playing' && (
            <>
              {/* Header Hud */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '64px',
                background: 'rgba(15, 23, 42, 0.85)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px',
                zIndex: 10,
                fontFamily: "'Inter', sans-serif",
              }}>
                {/* Left: Score & Level */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 800 }}>
                    🏆 <span style={{ color: '#60a5fa' }}>{score}</span> <span style={{ fontSize: '0.8rem', color: '#64748b' }}>pts</span>
                  </div>
                  <div style={{
                    background: 'rgba(96, 165, 250, 0.12)',
                    color: '#60a5fa',
                    borderRadius: '8px',
                    padding: '3px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}>
                    Level {level}
                  </div>
                </div>

                {/* Center: Max Objects Slider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                    Objetos
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={maxSimultaneous}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setMaxSimultaneous(val);
                      maxSimultaneousRef.current = val;
                    }}
                    style={{
                      width: '90px',
                      accentColor: '#f59e0b',
                      cursor: 'pointer',
                    }}
                  />
                  <span style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                    borderRadius: '6px',
                    padding: '2px 10px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    minWidth: '24px',
                    textAlign: 'center',
                  }}>
                    {maxSimultaneous}
                  </span>
                </div>

                {/* Right: Lives & Exit */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '6px', fontSize: '1.2rem' }}>
                    {[...Array(3)].map((_, i) => (
                      <span 
                        key={i} 
                        style={{ 
                          opacity: i < lives ? 1 : 0.22,
                          filter: i < lives ? 'none' : 'grayscale(100%)',
                          transition: 'opacity 0.3s ease',
                        }}
                      >
                        ❤️
                      </span>
                    ))}
                  </div>

                  <button 
                    onClick={endGame}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ef5350'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                  >
                    ✕ Salir
                  </button>
                </div>
              </div>

              {/* Falling words container */}
              <div style={{ position: 'absolute', inset: '64px 0 0 0', width: '100%', height: 'calc(100% - 64px)' }}>
                {activeWords.map((w) => {
                  const hasProgress = w.progress > 0 && !w.isExploding;
                  const isInDanger = w.y >= 72 && !w.isExploding;
                  const dangerIntensity = isInDanger ? Math.min(1, (w.y - 72) / 20) : 0;
                  
                  return (
                    <div
                      key={w.id}
                      style={{
                        position: 'absolute',
                        left: `${w.x}%`,
                        top: `${w.y}%`,
                        transform: w.isExploding
                          ? 'translateX(-50%) scale(1.4) rotate(4deg)'
                          : isInDanger
                          ? `translateX(-50%) scale(${1 + dangerIntensity * 0.08}) translateX(${Math.sin(Date.now() / 80) * dangerIntensity * 3}px)`
                          : 'translateX(-50%) scale(1)',
                        opacity: w.isExploding ? 0 : 1,
                        background: w.isExploding
                          ? 'rgba(74, 222, 128, 0.25)'
                          : isInDanger
                          ? `rgba(${Math.round(127 + dangerIntensity * 128)}, ${Math.round(30 - dangerIntensity * 20)}, ${Math.round(30 - dangerIntensity * 20)}, ${0.7 + dangerIntensity * 0.25})`
                          : hasProgress
                          ? 'rgba(30, 41, 59, 0.9)'
                          : 'rgba(15, 23, 42, 0.72)',
                        border: w.isExploding
                          ? '2px solid #4ade80'
                          : isInDanger
                          ? `2px solid rgba(239, 68, 68, ${0.5 + dangerIntensity * 0.5})`
                          : hasProgress
                          ? '2px solid #38bdf8'
                          : '1px solid rgba(255,255,255,0.08)',
                        borderRadius: w.isSentence ? '14px' : '10px',
                        padding: w.isSentence ? '10px 18px' : '7px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        whiteSpace: 'nowrap',
                        boxShadow: isInDanger
                          ? `0 0 ${12 + dangerIntensity * 24}px rgba(239, 68, 68, ${0.3 + dangerIntensity * 0.5}), inset 0 0 ${dangerIntensity * 12}px rgba(239, 68, 68, ${dangerIntensity * 0.2})`
                          : hasProgress
                          ? '0 0 20px rgba(56, 189, 248, 0.35)'
                          : '0 4px 12px rgba(0,0,0,0.18)',
                        transition: 'opacity 0.25s, border-color 0.15s',
                        zIndex: hasProgress ? 5 : isInDanger ? 4 : 2,
                        animation: isInDanger && dangerIntensity > 0.6 ? 'wordDangerPulse 0.4s ease-in-out infinite alternate' : undefined,
                      }}
                    >
                      {/* Danger warning icon for near-bottom words */}
                      {isInDanger && dangerIntensity > 0.3 && (
                        <div style={{
                          position: 'absolute',
                          top: '-18px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          fontSize: '0.9rem',
                          opacity: 0.5 + dangerIntensity * 0.5,
                        }}>
                          ⚠️
                        </div>
                      )}

                      {/* English text with highlighting */}
                      <div style={{
                        fontFamily: "'Courier New', Courier, monospace",
                        fontSize: w.isSentence ? '1rem' : '1.15rem',
                        fontWeight: 800,
                        color: isInDanger ? '#fecaca' : '#fff',
                        letterSpacing: '1px',
                      }}>
                        {/* Highlighted correct typing progress */}
                        <span style={{ 
                          color: isInDanger ? '#fbbf24' : '#38bdf8', 
                          textShadow: isInDanger
                            ? '0 0 10px rgba(251, 191, 36, 0.8)'
                            : '0 0 10px rgba(56, 189, 248, 0.8)',
                        }}>
                          {w.word.substring(0, w.progress)}
                        </span>
                        {/* Remaining letters */}
                        <span style={{ opacity: isInDanger ? 1 : 0.88 }}>
                          {w.word.substring(w.progress)}
                        </span>
                      </div>

                      {/* Spanish Translation clue under */}
                      <div style={{
                        fontSize: '0.68rem',
                        color: isInDanger ? '#fca5a5' : hasProgress ? '#93c5fd' : '#64748b',
                        fontWeight: 600,
                        marginTop: '3px',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                      }}>
                        {w.translation}
                      </div>

                      {/* Locked marker dot */}
                      {hasProgress && !isInDanger && (
                        <div style={{
                          position: 'absolute',
                          top: '-5px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: '#38bdf8',
                          boxShadow: '0 0 8px #38bdf8',
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Laser Line danger indicator at bottom */}
              <div style={{
                position: 'absolute',
                bottom: '8%',
                left: 0,
                right: 0,
                height: '2.5px',
                background: 'linear-gradient(90deg, transparent 0%, #ef4444 30%, #ff6b6b 50%, #ef4444 70%, transparent 100%)',
                boxShadow: '0 0 18px #ef4444, 0 0 40px rgba(239,68,68,0.3)',
                opacity: 0.7,
                pointerEvents: 'none',
                animation: 'laserPulse 1.5s ease-in-out infinite alternate',
              }} />

              {/* Danger zone gradient above laser line */}
              <div style={{
                position: 'absolute',
                bottom: '8%',
                left: 0,
                right: 0,
                height: '28%',
                background: 'linear-gradient(to bottom, transparent 0%, rgba(239, 68, 68, 0.04) 60%, rgba(239, 68, 68, 0.08) 100%)',
                pointerEvents: 'none',
              }} />
            </>
          )}

          {/* IDLE SCREEN (Start Menu) */}
          {phase === 'idle' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
              padding: '40px',
              zIndex: 5,
              position: 'relative',
            }}>
              <div style={{ fontSize: '5rem', marginBottom: '14px' }}>⌨️</div>
              <h2 style={{
                fontSize: '2.5rem',
                fontWeight: 900,
                color: '#fff',
                marginBottom: '10px',
                letterSpacing: '-0.5px',
                textShadow: '0 4px 12px rgba(96,165,250,0.3)',
              }}>
                Typing Tutor
              </h2>
              <p style={{
                color: '#94a3b8',
                fontSize: '0.98rem',
                maxWidth: '480px',
                lineHeight: 1.65,
                marginBottom: '26px',
              }}>
                ¡Practica tu inglés a toda velocidad! Escribe las palabras y oraciones en inglés que caen antes de que toquen la línea roja.
              </p>

              {/* Max simultaneous selector in idle screen */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                marginBottom: '24px',
                background: 'rgba(30, 41, 59, 0.6)',
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.06)',
                padding: '14px 24px',
              }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  🎯 Objetos simultáneos:
                </span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={maxSimultaneous}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setMaxSimultaneous(val);
                    maxSimultaneousRef.current = val;
                  }}
                  style={{
                    width: '120px',
                    accentColor: '#f59e0b',
                    cursor: 'pointer',
                  }}
                />
                <span style={{
                  background: 'rgba(245, 158, 11, 0.18)',
                  color: '#f59e0b',
                  borderRadius: '8px',
                  padding: '4px 14px',
                  fontSize: '1.1rem',
                  fontWeight: 900,
                  minWidth: '32px',
                  textAlign: 'center',
                }}>
                  {maxSimultaneous}
                </span>
              </div>

              <div style={{
                background: 'rgba(30, 41, 59, 0.6)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.06)',
                padding: '16px 28px',
                maxWidth: '420px',
                fontSize: '0.85rem',
                color: '#64748b',
                lineHeight: 1.55,
                textAlign: 'left',
                marginBottom: '32px',
              }}>
                💡 <strong style={{ color: '#cbd5e1' }}>Cómo jugar:</strong> Simplemente escribe con tu teclado. Si te equivocas de palabra, presiona <strong style={{ color: '#38bdf8' }}>ESC</strong> o <strong style={{ color: '#38bdf8' }}>Backspace</strong> para desbloquear y cambiar de objetivo.
              </div>

              <div style={{ display: 'flex', gap: '14px' }}>
                <button
                  className="btn btn-primary"
                  style={{
                    padding: '15px 44px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    borderRadius: '12px',
                  }}
                  onClick={startGame}
                >
                  Comenzar
                </button>
                <button
                  style={{
                    padding: '15px 24px',
                    fontSize: '0.95rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'transparent',
                    color: '#94a3b8',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                  }}
                  onClick={onExit}
                >
                  Volver
                </button>
              </div>
            </div>
          )}

          {/* LOADING SCREEN */}
          {phase === 'loading' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#94a3b8',
            }}>
              <div className="spinner" style={{ marginBottom: '14px' }} />
              <p style={{ fontWeight: 600 }}>Cargando banco de vocabulario...</p>
            </div>
          )}

          {/* GAMEOVER SCREEN */}
          {phase === 'gameover' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
              padding: '40px',
              zIndex: 5,
              position: 'relative',
            }}>
              <div style={{ fontSize: '4.5rem', marginBottom: '12px' }}>💥</div>
              <h2 style={{
                fontSize: '2.5rem',
                fontWeight: 900,
                color: '#ef4444',
                marginBottom: '8px',
                textShadow: '0 4px 16px rgba(239,68,68,0.25)',
              }}>
                Game Over
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '28px' }}>
                ¡Buen intento! Tu vocabulario va mejorando.
              </p>

              {/* Final Score Board */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px',
                padding: '24px 48px',
                marginBottom: 36,
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginBottom: '6px' }}>
                  Puntuación final
                </div>
                <div style={{ fontSize: '3.2rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                  {score} <span style={{ fontSize: '1.2rem', color: '#64748b' }}>pts</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#60a5fa', fontWeight: 700, marginTop: '10px' }}>
                  Llegaste al Nivel {level}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px' }}>
                <button
                  className="btn btn-primary"
                  style={{
                    padding: '14px 36px',
                    fontSize: '0.98rem',
                    fontWeight: 700,
                    borderRadius: '12px',
                  }}
                  onClick={startGame}
                >
                  🎮 Jugar de nuevo
                </button>
                <button
                  style={{
                    padding: '14px 24px',
                    fontSize: '0.95rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'transparent',
                    color: '#94a3b8',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                  }}
                  onClick={startGame}
                >
                  Volver al menú
                </button>
                <button
                  style={{
                    padding: '14px 24px',
                    fontSize: '0.95rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'transparent',
                    color: '#94a3b8',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.color = '#ef5350';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                  }}
                  onClick={onExit}
                >
                  ✕ Salir
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* CSS animations for danger effects */}
      <style>{`
        @keyframes wordDangerPulse {
          from {
            box-shadow: 0 0 12px rgba(239, 68, 68, 0.4), inset 0 0 6px rgba(239, 68, 68, 0.1);
          }
          to {
            box-shadow: 0 0 30px rgba(239, 68, 68, 0.7), inset 0 0 14px rgba(239, 68, 68, 0.25);
          }
        }
        @keyframes laserPulse {
          from { opacity: 0.5; }
          to { opacity: 0.85; }
        }
      `}</style>
    </>
  );
}
