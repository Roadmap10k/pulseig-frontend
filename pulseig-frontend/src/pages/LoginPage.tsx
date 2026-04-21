import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';

export default function LoginPage() {
  const [email, setEmail] = useState('demo@pulseig.com');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');
  const { login, loading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/inbox');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 360 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, justifyContent: 'center' }}>
          <div style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff' }}>P</div>
          <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.3px' }}>PulseIG</span>
        </div>

        <div className="card" style={{ padding: '28px 32px' }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4, letterSpacing: '-0.3px' }}>Bienvenido</h1>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 24 }}>Ingresá a tu cuenta para continuar</p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@negocio.com"
                required
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Contraseña</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div style={{ background: 'var(--red-bg)', color: 'var(--red)', padding: '8px 12px', borderRadius: 'var(--r)', fontSize: 12, marginBottom: 16, border: '1px solid var(--red-b)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', padding: '10px', fontSize: 13 }}
              disabled={loading}
            >
              {loading ? 'Ingresando...' : 'Ingresar →'}
            </button>
          </form>

          <div style={{ marginTop: 20, padding: '12px', background: 'var(--surface2)', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Cuenta de demo:</p>
            <p style={{ fontSize: 11, color: 'var(--text2)' }}>demo@pulseig.com / demo123</p>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text3)', marginTop: 20 }}>
          © 2026 PulseIG · Cada conversación es una venta
        </p>
      </div>
    </div>
  );
}
