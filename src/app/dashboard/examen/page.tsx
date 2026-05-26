// src/app/dashboard/examen/page.tsx
import type { Metadata } from 'next';
import { getActiveUser } from '@/app/actions/user-actions';
import { getLearnedWordsCount } from '@/app/actions/exam-actions';
import CreateUserPrompt from '@/components/learning/CreateUserPrompt';
import ExamForm from '@/components/exam/ExamForm';

export const metadata: Metadata = {
  title: 'Examen – NinjaEng',
  description: 'Pon a prueba tu vocabulario en inglés.',
};

export default async function ExamenPage() {
  const user = await getActiveUser();

  if (!user) {
    return (
      <>
        <div className="topbar">
          <div className="topbar-title">
            <h2>Tomar examen</h2>
            <p>Primero crea tu perfil de usuario</p>
          </div>
        </div>
        <div className="page-content">
          <CreateUserPrompt />
        </div>
      </>
    );
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
