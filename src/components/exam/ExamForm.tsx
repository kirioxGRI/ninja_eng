// src/components/exam/ExamForm.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { getRandomWordsForExam, submitExamResult } from '@/app/actions/exam-actions';
import type { ExamWord, ExamSubmissionResult } from '@/app/actions/exam-actions';

type Props = {
  usuarioId: number;
  nombreUsuario: string;
  learnedCount: number;
};

export default function ExamForm({ usuarioId, nombreUsuario, learnedCount }: Props) {
  const [step, setStep] = useState<'setup' | 'testing' | 'results'>('setup');
  const [questionCount, setQuestionCount] = useState<number>(Math.min(5, learnedCount));
  const [customCount, setCustomCount] = useState<string>('');
  const [words, setWords] = useState<ExamWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  const [answers, setAnswers] = useState<{ wordId: number; answer: string }[]>([]);
  const [result, setResult] = useState<ExamSubmissionResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when moving to a new word
  useEffect(() => {
    if (step === 'testing' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [step, currentIndex]);

  const handleStartExam = async () => {
    setLoading(true);
    setError(null);
    const res = await getRandomWordsForExam(usuarioId, questionCount);
    if (!res.success) {
      setError(res.error || 'No se pudieron cargar las palabras para el examen.');
      setLoading(false);
      return;
    }

    if (res.words.length === 0) {
      setError('No hay suficientes palabras registradas para realizar un examen.');
      setLoading(false);
      return;
    }

    setWords(res.words);
    setAnswers([]);
    setCurrentIndex(0);
    setCurrentAnswer('');
    setStep('testing');
    setLoading(false);
  };

  const handleNextWord = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!words[currentIndex]) return;

    const newAnswers = [
      ...answers,
      { wordId: words[currentIndex].id, answer: currentAnswer.trim() },
    ];
    setAnswers(newAnswers);
    setCurrentAnswer('');

    if (currentIndex + 1 < words.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // End of exam, submit results
      handleSubmitExam(newAnswers);
    }
  };

  const handleSubmitExam = async (finalAnswers: { wordId: number; answer: string }[]) => {
    setLoading(true);
    setError(null);
    const res = await submitExamResult(usuarioId, finalAnswers);
    if (!res.success) {
      setError(res.error || 'Ocurrió un error al enviar el examen.');
      setLoading(false);
      return;
    }
    setResult(res);
    setStep('results');
    setLoading(false);
  };

  const handleReset = () => {
    setStep('setup');
    setWords([]);
    setAnswers([]);
    setCurrentIndex(0);
    setCurrentAnswer('');
    setResult(null);
    setError(null);
  };

  // Setup view
  if (step === 'setup') {
    const presets = [5, 10, 20].filter((n) => n <= learnedCount);
    const canStart = learnedCount > 0 && questionCount >= 1;

    const handleCustomCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setCustomCount(raw);
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= learnedCount) {
        setQuestionCount(parsed);
      }
    };

    return (
      <div className="progress-card" style={{ maxWidth: 540, margin: '20px auto', padding: '36px' }}>
        <div style={{ fontSize: '3rem', textAlign: 'center', marginBottom: '12px' }}>📝</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0d47a1', textAlign: 'center', marginBottom: '8px' }}>
          Examen de Vocabulario
        </h2>
        <p style={{ color: '#546e7a', fontSize: '0.88rem', textAlign: 'center', lineHeight: 1.6, marginBottom: '16px' }}>
          ¡Hola {nombreUsuario}! Se examinarán palabras que marcaste como <strong>aprendidas</strong>.
        </p>

        {/* Learned pool info */}
        <div style={{
          background: learnedCount > 0 ? 'rgba(13,71,161,0.06)' : 'rgba(244,67,54,0.06)',
          border: `1px solid ${learnedCount > 0 ? 'rgba(13,71,161,0.2)' : 'rgba(244,67,54,0.2)'}`,
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '24px',
          textAlign: 'center',
        }}>
          {learnedCount > 0 ? (
            <span style={{ color: '#0d47a1', fontSize: '0.88rem', fontWeight: 600 }}>
              📚 Tienes <strong>{learnedCount}</strong> {learnedCount === 1 ? 'palabra aprendida' : 'palabras aprendidas'} disponibles para el examen.
            </span>
          ) : (
            <span style={{ color: '#c62828', fontSize: '0.88rem', fontWeight: 600 }}>
              ⚠️ Aún no tienes palabras aprendidas. Ve a <strong>Reading</strong> y marca algunas palabras primero.
            </span>
          )}
        </div>

        {error && (
          <div style={{ background: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '20px', textAlign: 'center' }}>
            ⚠️ {error}
          </div>
        )}

        {learnedCount > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0d47a1', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              ¿Cuántas palabras quieres examinar?
            </label>

            {/* Preset buttons */}
            {presets.length > 0 && (
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                {presets.map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`btn ${questionCount === num && customCount === '' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => { setQuestionCount(num); setCustomCount(''); }}
                    disabled={loading}
                  >
                    {num}
                  </button>
                ))}
                {learnedCount > 1 && (
                  <button
                    type="button"
                    className={`btn ${questionCount === learnedCount && customCount === '' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => { setQuestionCount(learnedCount); setCustomCount(''); }}
                    disabled={loading}
                  >
                    Todas ({learnedCount})
                  </button>
                )}
              </div>
            )}

            {/* Custom number input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="number"
                className="form-input"
                style={{ flex: 1, padding: '10px 14px', marginBottom: 0 }}
                placeholder={`Número personalizado (1–${learnedCount})`}
                min={1}
                max={learnedCount}
                value={customCount}
                onChange={handleCustomCountChange}
                disabled={loading}
              />
            </div>
            <div style={{ fontSize: '0.75rem', color: '#90a4ae', marginTop: '6px' }}>
              Seleccionado: <strong>{questionCount}</strong> {questionCount === 1 ? 'palabra' : 'palabras'}
            </div>
          </div>
        )}

        <button
          id="btn-start-exam"
          className="btn btn-success"
          style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '0.95rem' }}
          onClick={handleStartExam}
          disabled={loading || !canStart}
        >
          {loading ? 'Preparando...' : 'Comenzar Examen'}
        </button>
      </div>
    );
  }

  // Testing view
  if (step === 'testing') {
    const currentWord = words[currentIndex];
    const progressPercent = Math.round((currentIndex / words.length) * 100);

    return (
      <div className="progress-card" style={{ maxWidth: 540, margin: '20px auto', padding: '36px' }}>
        {/* Progress header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0d47a1', textTransform: 'uppercase' }}>
            Pregunta {currentIndex + 1} de {words.length}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#546e7a', fontWeight: 500 }}>
            {progressPercent}% completado
          </span>
        </div>
        <div className="progress-bar-track" style={{ height: '6px', marginBottom: '32px' }}>
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
        </div>

        {/* Word Display */}
        <div
          style={{
            background: 'linear-gradient(160deg, #1565c0 0%, #0d47a1 100%)',
            borderRadius: '16px',
            padding: '40px 20px',
            textAlign: 'center',
            color: '#fff',
            marginBottom: '28px',
            boxShadow: '0 8px 24px rgba(13,71,161,0.25)',
          }}
        >
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>
            Traduce al español:
          </div>
          <div id="exam-word-display" style={{ fontSize: '2.8rem', fontWeight: 900, letterSpacing: '-1px' }}>
            {currentWord?.palabra}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleNextWord}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0d47a1', display: 'block', marginBottom: '8px' }}>
              Tu respuesta en español:
            </label>
            <input
              id="input-exam-answer"
              ref={inputRef}
              type="text"
              className="form-input"
              style={{ fontSize: '1rem', padding: '14px', marginBottom: 0 }}
              placeholder="Escribe la traducción aquí..."
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              disabled={loading}
              autoComplete="off"
            />
          </div>

          <button
            id="btn-submit-answer"
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
            disabled={loading}
          >
            {loading ? 'Procesando...' : currentIndex + 1 === words.length ? 'Finalizar Examen' : 'Siguiente Palabra'}
          </button>
        </form>
      </div>
    );
  }

  // Results view
  if (step === 'results' && result) {
    const scorePct = Math.round((result.correctCount / result.totalQuestions) * 100);
    let emoji = '⭐️';
    let statusText = '¡Buen intento!';
    let cardGradient = 'linear-gradient(135deg, #42a5f5 0%, #1565c0 100%)';

    if (scorePct >= 80) {
      emoji = '🏆';
      statusText = '¡Excelente trabajo!';
      cardGradient = 'linear-gradient(135deg, #66bb6a 0%, #2e7d32 100%)';
    } else if (scorePct >= 50) {
      emoji = '👍';
      statusText = '¡Vas por buen camino!';
      cardGradient = 'linear-gradient(135deg, #ffb74d 0%, #f57c00 100%)';
    } else {
      emoji = '💪';
      statusText = '¡Sigue practicando!';
      cardGradient = 'linear-gradient(135deg, #ef5350 0%, #c62828 100%)';
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '640px', margin: '10px auto' }}>
        {/* Score Header Card */}
        <div
          style={{
            background: cardGradient,
            borderRadius: '20px',
            padding: '36px',
            color: '#fff',
            textAlign: 'center',
            boxShadow: '0 12px 32px rgba(13,71,161,0.3)',
          }}
        >
          <div style={{ fontSize: '3.5rem', marginBottom: '8px' }}>{emoji}</div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '4px' }}>{statusText}</h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', marginBottom: '20px' }}>
            Has completado tu examen de vocabulario.
          </p>
          <div
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              background: 'rgba(255,255,255,0.18)',
              borderRadius: '16px',
              padding: '16px 28px',
              border: '1px solid rgba(255,255,255,0.25)',
            }}
          >
            <span style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1 }}>
              {result.correctCount} / {result.totalQuestions}
            </span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginTop: '6px', color: 'rgba(255,255,255,0.8)' }}>
              Aciertos — {scorePct}%
            </span>
          </div>
        </div>

        {/* Detailed Results List */}
        <div className="progress-card">
          <h3 style={{ color: '#0d47a1', marginBottom: '18px' }}>📋 Desglose de Respuestas</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {result.detailedResults.map((r, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: r.isCorrect ? 'rgba(76,175,80,0.06)' : 'rgba(244,67,54,0.06)',
                  border: `1px solid ${r.isCorrect ? 'rgba(76,175,80,0.2)' : 'rgba(244,67,54,0.2)'}`,
                  borderRadius: '12px',
                  padding: '14px 18px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0d47a1' }}>
                      {r.palabra}
                    </span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: r.isCorrect ? 'rgba(76,175,80,0.15)' : 'rgba(244,67,54,0.15)',
                        color: r.isCorrect ? '#2e7d32' : '#c62828',
                      }}
                    >
                      {r.isCorrect ? 'Correcto' : 'Incorrecto'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#546e7a' }}>
                    Tu respuesta: <strong style={{ color: r.isCorrect ? '#2e7d32' : '#c62828' }}>{r.userAnswer || '(vacío)'}</strong>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Traducción esperada:
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0d47a1' }}>
                    {r.correctTranslations}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            id="btn-restart-exam"
            className="btn btn-primary"
            style={{ flex: 1, justifyContent: 'center', padding: '14px', fontSize: '0.95rem' }}
            onClick={handleReset}
          >
            Tomar Otro Examen
          </button>
          <button
            style={{
              flex: 1, padding: '14px', fontSize: '0.95rem', fontWeight: 700,
              border: '2px solid #546e7a', borderRadius: '10px',
              background: 'transparent', color: '#546e7a',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={() => window.location.href = '/dashboard/reading'}
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return null;
}
