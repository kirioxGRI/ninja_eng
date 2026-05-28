// src/app/dashboard/examen/page.tsx
import type { Metadata } from 'next';
import { getUserForCurrentSession } from '@/app/actions/user-actions';
import { getLearnedWordsCount } from '@/app/actions/exam-actions';
import ExamForm from '@/components/exam/ExamForm';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Examen – NinjaEng',
  description: 'Pon a prueba tu vocabulario en inglés.',
};

export default async function ExamenPage() {
  const user = await getUserForCurrentSession();

  if (!user) {
    redirect('/login');
  }

  const learnedCount = await getLearnedWordsCount(user.id);

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">
          <h2>Tomar examen</h2>
          <p>Hola, {user.nombre} 👋 — ¡Ponte a prueba!</p>
        </div>
        <div className="topbar-right">
          <span className="topbar-badge">
            📚 {learnedCount} palabras disponibles
          </span>
        </div>
      </div>
      <div className="page-content">
        <ExamForm usuarioId={user.id} nombreUsuario={user.nombre} learnedCount={learnedCount} />
      </div>
    </>
  );
}
