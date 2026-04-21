import React, { useState, useEffect } from 'react';
import { dashboardApi } from '../api';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.metrics(30)
      .then(r => setMetrics(r.data))
      .catch(() => setMetrics(null))
      .finally(() => setLoading(false));
  }, []);

  const m = metrics;
  const revenue = m?.revenue?.total || 0;
  const roi = m?.roi?.multiplier || 0;
  const netProfit = m?.roi?.net_profit || 0;
  const aiSales = m?.revenue?.ai_sales_count || 0;
  const closeRate = m?.conversations?.close_rate || 0;
  const newLeads = m?.contacts?.total || 0;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.4px' }}>ROI Dashboard</h1>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>Últimos 30 días · {loading ? 'cargando...' : 'actualizado ahora'}</p>
        </div>
        <button className="btn-secondary">Exportar PDF ↗</button>
      </div>

      {/* ROI Banner */}
      <div style={{ background: 'var(--accent)', borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Revenue generado por PulseIG</div>
          <div className="mono" style={{ fontSize: 38, fontWeight: 300, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>${revenue.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
            Inversión: $1,000 · <span style={{ color: '#6EE7B7', fontWeight: 500 }}>ganás ${Math.max(0, netProfit).toLocaleString()} netos</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="mono" style={{ fontSize: 46, fontWeight: 300, color: '#6EE7B7', letterSpacing: '-2px', lineHeight: 1 }}>{roi}x</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>retorno sobre inversión</div>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Ventas por IA', value: aiSales, color: 'var(--green)', delta: '↑ cerrando más' },
          { label: 'Carritos recuperados', value: m?.revenue?.sales_count || 0, color: 'var(--amber)', delta: '↑ sin IA se perdían' },
          { label: 'Tasa de cierre IA', value: `${closeRate}%`, color: 'var(--blue)', delta: '↑ mejorando' },
          { label: 'Leads totales', value: newLeads, color: 'var(--text)', delta: '4 canales activos' },
        ].map(({ label, value, color, delta }) => (
          <div key={label} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text3)', marginBottom: 8 }}>{label}</div>
            <div className="mono" style={{ fontSize: 26, color, lineHeight: 1, letterSpacing: '-0.5px' }}>{value}</div>
            <div style={{ fontSize: 10, color: 'var(--green)', marginTop: 5 }}>{delta}</div>
          </div>
        ))}
      </div>

      {/* Contact segments */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 14, display: 'flex', justifyContent: 'space-between' }}>
          Contactos por segmento
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {[
            { label: '🔥 Calientes', val: m?.contacts?.hot || 0, bg: 'var(--red-bg)', c: 'var(--red)' },
            { label: '🟡 Tibios', val: m?.contacts?.warm || 0, bg: 'var(--amber-bg)', c: 'var(--amber)' },
            { label: '🔵 Fríos', val: m?.contacts?.cold || 0, bg: 'var(--blue-bg)', c: 'var(--blue)' },
            { label: '⚪ Inactivos', val: m?.contacts?.inactive || 0, bg: 'var(--surface2)', c: 'var(--text3)' },
          ].map(({ label, val, bg, c }) => (
            <div key={label} style={{ background: bg, borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 22, fontWeight: 300, color: c, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 10, color: c, marginTop: 4, fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Insight */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 30, height: 30, background: 'var(--accent)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>💡</div>
        <div style={{ flex: 1, fontSize: 11, color: 'var(--text2)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text)' }}>Insight del Analista:</strong> Tus ventas los sábados son 60% menores al resto de la semana. Activar respuesta automática los sábados puede recuperar hasta $680/mes.
        </div>
        <button className="btn-primary" style={{ whiteSpace: 'nowrap', fontSize: 11, padding: '5px 12px' }}>Activar →</button>
      </div>
    </div>
  );
}
