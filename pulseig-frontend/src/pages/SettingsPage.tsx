/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { campaignsApi, webhookApi } from '../api';
import { useAuthStore } from '../store';

export default function SettingsPage() {
  const { business } = useAuthStore();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ name:'', ai_persona:'', instagram_handle:'', page_id:'', access_token:'' });
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [simMsg, setSimMsg] = useState('Hola! tienen Nike Air Max en talle 42?');
  const [simSender, setSimSender] = useState('cliente_demo_001');
  const [simResult, setSimResult] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);

  useEffect(() => {
    campaignsApi.getSettings()
      .then(r => {
        setSettings(r.data);
        setForm({ name: r.data.name || '', ai_persona: r.data.ai_persona || '', instagram_handle: r.data.instagram_handle || '', page_id: r.data.page_id || '', access_token: '' });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: any = { name: form.name, ai_persona: form.ai_persona, instagram_handle: form.instagram_handle };
      if (form.page_id) data.page_id = form.page_id;
      if (form.access_token) data.access_token = form.access_token;
      await campaignsApi.updateSettings(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  const handleSimulate = async () => {
    if (!simMsg.trim()) return;
    setSimLoading(true);
    setSimResult(null);
    try {
      const res = await webhookApi.simulate(business?.id || '', simSender, simMsg);
      setSimResult(res.data);
    } catch (err: any) {
      setSimResult({ error: err.response?.data?.error || 'Error al simular' });
    }
    setSimLoading(false);
  };

  if (loading) return <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)' }}>Cargando...</div>;

  return (
    <div style={{ flex:1, overflowY:'auto', padding:24 }}>
      <h1 style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>Configuración</h1>
      <p style={{ fontSize:11, color:'var(--text3)', marginBottom:24 }}>Configurá tu negocio, la IA y las integraciones</p>

      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:600, marginBottom:16 }}>Datos del negocio</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:5 }}>Nombre del negocio</label>
            <input className="input" value={form.name} onChange={e => setForm(p => ({...p, name:e.target.value}))} placeholder="Ej: Zapatería Urbana" />
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:5 }}>Instagram handle</label>
            <input className="input" value={form.instagram_handle} onChange={e => setForm(p => ({...p, instagram_handle:e.target.value}))} placeholder="@minegocio" />
          </div>
        </div>
        <div style={{ fontSize:11, color:'var(--text3)', padding:'8px 12px', background:'var(--surface2)', borderRadius:'var(--r)' }}>
          Plan: <strong style={{ color:'var(--text)' }}>{settings?.plan?.toUpperCase() || 'PRO'}</strong> · Email: {settings?.email}
        </div>
      </div>

      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Personalidad de la IA</div>
        <div style={{ fontSize:11, color:'var(--text3)', marginBottom:12 }}>Describí cómo querés que la IA hable con tus clientes.</div>
        <textarea value={form.ai_persona} onChange={e => setForm(p => ({...p, ai_persona:e.target.value}))} rows={4}
          style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--border)', borderRadius:'var(--r)', fontSize:12, fontFamily:'Inter,sans-serif', background:'var(--surface2)', color:'var(--text)', resize:'vertical', outline:'none', lineHeight:1.6 }}
          placeholder="Ej: Sos Martín, vendedor amigable de Zapatería Urbana. Usás lenguaje argentino informal y ofrecés cuotas cuando hay dudas por precio." />
      </div>

      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Conexión con Instagram</div>
        <div style={{ fontSize:11, color:'var(--text3)', marginBottom:12 }}>Para recibir mensajes reales configurá el webhook en <span style={{ color:'var(--blue)', cursor:'pointer' }} onClick={() => window.open('https://developers.facebook.com','_blank')}>developers.facebook.com</span></div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:10 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:5 }}>Page ID de Facebook</label>
            <input className="input" value={form.page_id} onChange={e => setForm(p => ({...p, page_id:e.target.value}))} placeholder="123456789" />
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:5 }}>Access Token de Meta</label>
            <input className="input" type="password" value={form.access_token} onChange={e => setForm(p => ({...p, access_token:e.target.value}))} placeholder="EAAxxxx..." />
          </div>
        </div>
        <div style={{ padding:'10px 12px', background:'var(--surface2)', borderRadius:'var(--r)', fontSize:11, color:'var(--text2)' }}>
          <strong>Webhook URL:</strong> <code style={{ fontFamily:'JetBrains Mono,monospace', color:'var(--blue)', fontSize:10 }}>https://pulseig-backend-production.up.railway.app/api/webhook/instagram</code><br/>
          <strong>Verify Token:</strong> <code style={{ fontFamily:'JetBrains Mono,monospace', color:'var(--blue)', fontSize:10 }}>pulseig_webhook_2026</code>
        </div>
      </div>

      <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ marginBottom:24 }}>
        {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar cambios'}
      </button>

      <div className="card" style={{ border:'1px solid var(--blue-b)', background:'var(--blue-bg)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: simulatorOpen ? 16 : 0 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#1D4ED8' }}>🧪 Simulador de DMs</div>
            <div style={{ fontSize:11, color:'#3B82F6', marginTop:2 }}>Testear la IA sin conectar Instagram real</div>
          </div>
          <button onClick={() => setSimulatorOpen(p => !p)}
            style={{ fontSize:12, fontWeight:500, color:'#1D4ED8', padding:'5px 12px', border:'1px solid var(--blue-b)', borderRadius:'var(--r)', background:'var(--surface)', cursor:'pointer' }}>
            {simulatorOpen ? 'Cerrar' : 'Abrir simulador'}
          </button>
        </div>
        {simulatorOpen && (
          <div>
            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:11, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:5 }}>ID del cliente simulado</label>
              <input className="input" value={simSender} onChange={e => setSimSender(e.target.value)} style={{ background:'var(--surface)' }} />
            </div>
            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:11, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:5 }}>Mensaje del cliente</label>
              <textarea value={simMsg} onChange={e => setSimMsg(e.target.value)} rows={2}
                style={{ width:'100%', padding:'8px 10px', border:'1px solid var(--border)', borderRadius:'var(--r)', fontSize:12, fontFamily:'Inter,sans-serif', background:'var(--surface)', color:'var(--text)', resize:'none', outline:'none' }} />
            </div>
            <button className="btn-primary" onClick={handleSimulate} disabled={simLoading}>
              {simLoading ? 'Procesando...' : 'Simular DM entrante →'}
            </button>
            {simResult && (
              <div style={{ marginTop:12, padding:'10px 12px', background:'var(--surface)', borderRadius:'var(--r)', border:'1px solid var(--border)' }}>
                {simResult.error ? (
                  <div style={{ color:'var(--red)', fontSize:12 }}>Error: {simResult.error}</div>
                ) : (
                  <>
                    <div style={{ fontSize:10, fontWeight:600, color:'var(--green)', marginBottom:6 }}>✓ DM procesado correctamente</div>
                    <div style={{ fontSize:12, color:'var(--text2)' }}>
                      <strong>Respuesta de la IA:</strong>
                      <div style={{ marginTop:4, padding:8, background:'var(--surface2)', borderRadius:6, lineHeight:1.6 }}>
                        {simResult.ai_response || 'Respuesta en modo simulado'}
                      </div>
                    </div>
                    <div style={{ marginTop:8, fontSize:11, color:'var(--text3)' }}>La conversación quedó guardada en la Bandeja.</div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
