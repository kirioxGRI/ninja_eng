'use client';

import { useState } from 'react';
import { createUser } from '@/app/actions/user-actions';
import { useRouter } from 'next/navigation';

export default function CreateUserPrompt() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) { setError('Ingresa tu nombre.'); return; }
    if (!email.trim()) { setError('Ingresa tu correo.'); return; }
    setLoading(true);
    setError('');
    const result = await createUser(nombre, email);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.refresh();
    }
  };

  return (
    <div className="no-user-prompt">
      <div style={{
        fontSize: '3.5rem',
        marginBottom: 16,
        filter: 'drop-shadow(0 4px 8px rgba(13,71,161,0.3))',
      }}>🥷</div>
      <h2>¡Bienvenido a NinjaEng!</h2>
      <p>
        Para comenzar a aprender inglés, necesitamos tu nombre y tu correo.
        Así podremos guardar tu progreso.
      </p>
      <div className="create-user-form">
        <form onSubmit={handleSubmit}>
          <input
            id="input-user-name"
            className="form-input"
            type="text"
            placeholder="Tu nombre (ej: Carlos)"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            disabled={loading}
            autoFocus
          />
          <input
            id="input-user-email"
            className="form-input"
            type="email"
            placeholder="Tu correo (ej: correo@dominio.com)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          {error && (
            <p style={{
              color: '#ef5350',
              fontSize: '0.8rem',
              marginBottom: 12,
              textAlign: 'left',
            }}>
              ⚠ {error}
            </p>
          )}
          <button
            id="btn-create-user"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {loading ? 'Creando...' : '🚀 Comenzar a aprender'}
          </button>
        </form>
      </div>
    </div>
  );
}
