'use client';

import { useState } from 'react';

import { createUser } from '@/app/actions/user-actions';
import { createWord } from '@/app/actions/word-actions';

function AddWordCard() {
  const [form, setForm] = useState({
    palabra: '',
    pronunciacion: '',
    traduccion_espanol: '',
    oracion_ejemplo: '',
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const result = await createWord(form);

    if (result.error) {
      setMsg({ type: 'err', text: result.error });
    } else {
      setMsg({ type: 'ok', text: `✓ "${result.word?.palabra}" agregada correctamente.` });
      setForm({
        palabra: '',
        pronunciacion: '',
        traduccion_espanol: '',
        oracion_ejemplo: '',
      });
    }

    setLoading(false);
  };

  return (
    <div className="progress-card" style={{ maxWidth: 520 }}>
      <h3 style={{ color: '#0d47a1', marginBottom: 20 }}>➕ Agregar palabra</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          name="palabra"
          className="form-input"
          style={{ marginBottom: 0 }}
          placeholder="Palabra en inglés *"
          value={form.palabra}
          onChange={handleChange}
          disabled={loading}
        />
        <input
          name="pronunciacion"
          className="form-input"
          style={{ marginBottom: 0 }}
          placeholder="Pronunciación (ej: abándon)"
          value={form.pronunciacion}
          onChange={handleChange}
          disabled={loading}
        />
        <input
          name="traduccion_espanol"
          className="form-input"
          style={{ marginBottom: 0 }}
          placeholder="Traducción en español *"
          value={form.traduccion_espanol}
          onChange={handleChange}
          disabled={loading}
        />
        <textarea
          name="oracion_ejemplo"
          className="form-input"
          style={{ marginBottom: 0, resize: 'vertical', minHeight: 80 }}
          placeholder="Oración de ejemplo"
          value={form.oracion_ejemplo}
          onChange={handleChange}
          disabled={loading}
        />

        {msg && (
          <p
            style={{
              fontSize: '0.82rem',
              padding: '8px 12px',
              borderRadius: 8,
              background: msg.type === 'ok' ? '#e8f5e9' : '#ffebee',
              color: msg.type === 'ok' ? '#2e7d32' : '#c62828',
            }}
          >
            {msg.text}
          </p>
        )}
        <button
          id="btn-add-word"
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ justifyContent: 'center' }}
        >
          {loading ? 'Guardando…' : 'Agregar palabra'}
        </button>
      </form>
    </div>
  );
}

function CreateUserCard() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setMsg({ type: 'err', text: 'El nombre es obligatorio.' });
      return;
    }
    if (!email.trim()) {
      setMsg({ type: 'err', text: 'El correo es obligatorio.' });
      return;
    }

    setLoading(true);
    setMsg(null);
    const result = await createUser(nombre, email);

    if (result.error) {
      setMsg({ type: 'err', text: result.error });
    } else {
      setMsg({ type: 'ok', text: `✓ Usuario "${result.user?.nombre}" creado.` });
      setNombre('');
      setEmail('');
    }

    setLoading(false);
  };

  return (
    <div className="progress-card" style={{ maxWidth: 520 }}>
      <h3 style={{ color: '#0d47a1', marginBottom: 20 }}>👤 Crear usuario</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          id="input-config-user-name"
          className="form-input"
          style={{ marginBottom: 0 }}
          placeholder="Nombre del usuario *"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          disabled={loading}
        />
        <input
          id="input-config-user-email"
          className="form-input"
          style={{ marginBottom: 0 }}
          type="email"
          placeholder="Correo del usuario *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
        {msg && (
          <p
            style={{
              fontSize: '0.82rem',
              padding: '8px 12px',
              borderRadius: 8,
              background: msg.type === 'ok' ? '#e8f5e9' : '#ffebee',
              color: msg.type === 'ok' ? '#2e7d32' : '#c62828',
            }}
          >
            {msg.text}
          </p>
        )}
        <button
          id="btn-create-user-config"
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ justifyContent: 'center' }}
        >
          {loading ? 'Creando…' : 'Crear usuario'}
        </button>
      </form>
    </div>
  );
}

function CreateRoleCard() {
  return (
    <div className="progress-card" style={{ maxWidth: 520, opacity: 0.75 }}>
      <h3 style={{ color: '#0d47a1', marginBottom: 12 }}>🔐 Crear rol</h3>
      <div
        style={{
          background: '#e3f2fd',
          borderRadius: 10,
          padding: '16px 20px',
          border: '1px dashed #90caf9',
        }}
      >
        <p style={{ color: '#1565c0', fontSize: '0.88rem', lineHeight: 1.6 }}>
          🚧 <strong>Disponible en una versión futura.</strong>
          <br />
          Los roles permitirán asignar permisos y niveles de acceso a los usuarios.
        </p>
      </div>
    </div>
  );
}

export default function ConfigurarPageContent() {
  return (
    <>
      <div className="topbar">
        <div className="topbar-title">
          <h2>Configuración</h2>
          <p>Administra palabras, usuarios y ajustes</p>
        </div>
      </div>
      <div className="page-content">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <AddWordCard />
          <CreateUserCard />
          <CreateRoleCard />
        </div>
      </div>
    </>
  );
}
