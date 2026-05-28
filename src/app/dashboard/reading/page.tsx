import type { Metadata } from 'next';
import { auth } from '@/auth';
import { getUserForCurrentSession } from '@/app/actions/user-actions';
import { getRandomWord, getUserStats } from '@/app/actions/word-actions';
import WordCard from '@/components/learning/WordCard';
import TopbarUserMenu from '@/components/layout/TopbarUserMenu';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Aprender – NinjaEng',
  description: 'Aprende palabras en inglés con pronunciación, oraciones y seguimiento de progreso.',
};

export default async function AprenderPage() {
  const session = await auth();
  const user = await getUserForCurrentSession();

  if (!user) {
    redirect('/login');
  }

  const [word, stats] = await Promise.all([
    getRandomWord(user.id),
    getUserStats(user.id),
  ]);

  if (!word) {
    return (
      <>
        <div className="topbar">
          <div className="topbar-title">
            <h2>Aprender palabras</h2>
            <p>Hola, {user.nombre} 👋</p>
          </div>
        </div>
        <div className="page-content">
          <div className="empty-state">
            <h3>📭 No hay palabras en la lista</h3>
            <p>
              Ve a <strong>Configurar</strong> para agregar palabras a tu vocabulario.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Top bar */}
      <div className="topbar">
        <div className="topbar-title">
          <h2>Aprender palabras</h2>
          <p>Hola, {user.nombre} 👋 — ¡Sigue aprendiendo!</p>
        </div>
        <div className="topbar-right">
          <span className="topbar-badge">
            🎯 {stats.aprendidas} / {stats.totalPalabras} aprendidas
          </span>
          <TopbarUserMenu
            email={session?.user?.email}
            image={session?.user?.image}
            name={session?.user?.name}
          />
        </div>
      </div>

      {/* Page content */}
      <div className="page-content">
        <WordCard
          initialWord={word}
          usuarioId={user.id}
          stats={stats}
        />
      </div>
    </>
  );
}
