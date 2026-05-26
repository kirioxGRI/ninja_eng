import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Acerca de – NinjaEng',
  description: 'Conoce NinjaEng, la app personal para aprender vocabulario en inglés.',
};

const features = [
  { icon: '📖', title: 'Vocabulario estructurado', desc: 'Navega por una lista de palabras en inglés con pronunciación para hispanohablantes y traducción al español.' },
  { icon: '🔊', title: 'Escucha la pronunciación', desc: 'Usa el motor de voz del navegador para escuchar cada palabra y oración con acento en inglés.' },
  { icon: '✅', title: 'Marca palabras aprendidas', desc: 'Registra cuáles palabras ya dominas y lleva un seguimiento de tu progreso.' },
  { icon: '🧠', title: 'IA en el navegador', desc: 'Genera oraciones de ejemplo usando IA del navegador (Chrome AI) o un generador local de respaldo.' },
  { icon: '🔍', title: 'Oraciones interactivas', desc: 'Cada palabra de la oración es clickeable: ve su traducción, pronunciación y escúchala.' },
  { icon: '📊', title: 'Progreso visual', desc: 'Ve cuántas palabras has aprendido y cuántas has visto con barras de progreso en tiempo real.' },
];

export default function AcercaDePage() {
  return (
    <>
      <div className="topbar">
        <div className="topbar-title">
          <h2>Acerca de NinjaEng</h2>
          <p>Tu herramienta personal de aprendizaje</p>
        </div>
      </div>
      <div className="page-content">
        {/* Hero */}
        <div style={{
          background: 'linear-gradient(160deg, #1565c0 0%, #0d47a1 100%)',
          borderRadius: 20,
          padding: '40px 40px',
          color: '#fff',
          marginBottom: 24,
          boxShadow: '0 12px 40px rgba(13,71,161,0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: 32,
        }}>
          <div style={{ fontSize: '4rem', flexShrink: 0 }}>🥷</div>
          <div>
            <h1 style={{
              fontSize: '2rem', fontWeight: 900, marginBottom: 8,
              background: 'linear-gradient(135deg, #fff 0%, #bbdefb 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              NinjaEng
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', lineHeight: 1.7, maxWidth: 520 }}>
              Una aplicación personal para aprender vocabulario en inglés paso a paso.
              Diseñada para hispanohablantes que quieren dominar el inglés con pronunciación,
              oraciones de ejemplo y seguimiento de progreso.
            </p>
          </div>
        </div>

        {/* Features grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 18,
        }}>
          {features.map((f, i) => (
            <div key={i} className="progress-card" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{
                fontSize: '1.8rem', flexShrink: 0,
                width: 48, height: 48,
                background: 'linear-gradient(135deg, #e3f2fd, #bbdefb)',
                borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {f.icon}
              </div>
              <div>
                <h3 style={{
                  fontSize: '0.9rem', fontWeight: 700,
                  color: '#0d47a1', marginBottom: 6, textTransform: 'none', letterSpacing: 0,
                }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#546e7a', lineHeight: 1.6 }}>
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Version note */}
        <div style={{
          marginTop: 24,
          background: '#e3f2fd',
          borderRadius: 12,
          padding: '16px 20px',
          border: '1px solid #90caf9',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
          <p style={{ fontSize: '0.82rem', color: '#1565c0', margin: 0, lineHeight: 1.6 }}>
            <strong>Versión 1.0</strong> — App personal, sin autenticación compleja.
            Desarrollada con Next.js 16, TypeScript, Prisma y PostgreSQL.
            Funciona completamente offline para audio (Web Speech API).
          </p>
        </div>
      </div>
    </>
  );
}
