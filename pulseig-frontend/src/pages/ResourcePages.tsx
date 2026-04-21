import React, { useState, useEffect } from 'react';
import { contactsApi, productsApi, triggersApi } from '../api';

const SEG_CLASS: Record<string,string> = { hot:'seg-hot', warm:'seg-warm', cold:'seg-cold', inactive:'seg-inactive' };
const SEG_LABEL: Record<string,string> = { hot:'HOT', warm:'TIBIO', cold:'FRÍO', inactive:'INACTIVO' };
const CH_CLASS: Record<string,string> = { instagram:'ch-ig', marketplace:'ch-mp', whatsapp:'ch-wa', messenger:'ch-ms' };
const CH_LABEL: Record<string,string> = { instagram:'IG', marketplace:'MP', whatsapp:'WA', messenger:'MS' };

function Avatar({ name, size=28 }: { name: string; size?: number }) {
  const ini = name?.slice(0,2).toUpperCase() || '??';
  const cols = [['#EFF6FF','#1D4ED8'],['#F0FDF4','#166534'],['#F5F3FF','#5B21B6'],['#FDF2F8','#9D174D'],['#FFFBEB','#92400E']];
  const [bg, tc] = cols[name?.charCodeAt(0) % cols.length] || cols[0];
  return <div className="avatar" style={{ width: size, height: size, background: bg, color: tc, fontSize: size*0.38 }}>{ini}</div>;
}

// ════════════════════════════════════════════════════════════
export function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    contactsApi.list({ search, limit: 50 })
      .then(r => setContacts(r.data.contacts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600 }}>Contactos</h1>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{contacts.length} contactos</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" style={{ width: 200 }} placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn-secondary">Exportar CSV</button>
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface)' }}>
              {['Cliente','Canal','Score','Segmento','Compras','Última interacción','Tags'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid var(--border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: 'var(--text3)' }}>Cargando...</td></tr>
            ) : contacts.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>No hay contactos aún. Conectá tu Instagram para empezar a recibir leads.</td></tr>
            ) : contacts.map(c => (
              <tr key={c.id} style={{ cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.background='var(--surface2)')} onMouseLeave={e => (e.currentTarget.style.background='')}>
                <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar name={c.name} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{c.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>{c.instagram_handle ? `@${c.instagram_handle}` : '—'}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--border)' }}>
                  <span className={CH_CLASS[c.channel] || 'ch-ig'}>{CH_LABEL[c.channel] || 'IG'}</span>
                </td>
                <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--border)' }}>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 500, color: c.intent_score >= 80 ? 'var(--blue)' : c.intent_score >= 50 ? 'var(--amber)' : 'var(--text2)' }}>{c.intent_score}</span>
                </td>
                <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--border)' }}>
                  <span className={SEG_CLASS[c.segment] || 'seg-cold'}>{SEG_LABEL[c.segment]}</span>
                </td>
                <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 500, color: c.purchase_count > 0 ? 'var(--green)' : 'var(--text2)' }}>
                  {c.purchase_count} · ${c.total_spent}
                </td>
                <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text3)' }}>
                  {c.last_interaction ? new Date(c.last_interaction).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                </td>
                <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    {c.tags?.slice(0,3).map((t: string) => (
                      <span key={t} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'var(--blue-bg)', color: '#1D4ED8', fontWeight: 500 }}>{t}</span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
export function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', stock: '', description: '' });

  const load = () => {
    productsApi.list()
      .then(r => setProducts(r.data.products || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleCreate = async () => {
    if (!form.name || !form.price) return;
    try {
      await productsApi.create({ name: form.name, price: parseFloat(form.price), stock: parseInt(form.stock) || 0, description: form.description });
      setForm({ name: '', price: '', stock: '', description: '' });
      setShowForm(false);
      load();
    } catch {}
  };

  const updateStock = async (id: string, delta: number, current: number) => {
    const newStock = Math.max(0, current + delta);
    try {
      await productsApi.update(id, { stock: newStock });
      load();
    } catch {}
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600 }}>Stock y productos</h1>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{products.length} productos · {products.filter(p => p.stock === 0).length} sin stock</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary">Importar Excel</button>
          <button className="btn-primary" onClick={() => setShowForm(true)}>+ Agregar producto</button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Nuevo producto</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
            <input className="input" placeholder="Nombre del producto" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            <input className="input" placeholder="Precio ($)" type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
            <input className="input" placeholder="Stock inicial" type="number" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))} />
          </div>
          <input className="input" placeholder="Descripción (opcional)" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={{ marginBottom: 10 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={handleCreate}>Guardar producto</button>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {loading ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text3)', padding: 40 }}>Cargando...</div>
        ) : products.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text3)', padding: 40, fontSize: 12 }}>
            No hay productos aún. Agregá tu primer producto para que la IA pueda venderlos.
          </div>
        ) : products.map(p => (
          <div key={p.id} className="card" style={{ position: 'relative', padding: 16, borderColor: p.stock === 0 ? 'var(--red-b)' : p.stock <= (p.stock_min || 2) ? 'var(--amber-b)' : 'var(--border)' }}>
            <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: p.stock === 0 ? 'var(--red-bg)' : p.stock <= (p.stock_min||2) ? 'var(--amber-bg)' : 'var(--green-bg)', color: p.stock === 0 ? 'var(--red)' : p.stock <= (p.stock_min||2) ? 'var(--amber)' : 'var(--green)' }}>
              {p.stock === 0 ? 'Sin stock' : p.stock <= (p.stock_min||2) ? 'Stock bajo' : 'En stock'}
            </span>
            <div style={{ height: 64, background: 'var(--surface2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 12 }}>
              {p.name.toLowerCase().includes('iphone') || p.name.toLowerCase().includes('samsung') ? '📱' : '👟'}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>{p.name}</div>
            <div className="mono" style={{ fontSize: 15, color: 'var(--green)', marginBottom: 10 }}>${p.price}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: p.stock === 0 ? 'var(--red)' : p.stock <= (p.stock_min||2) ? 'var(--amber)' : 'var(--green)' }}>
                {p.stock === 0 ? '✕ Sin stock' : `● ${p.stock} unidades`}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => updateStock(p.id, -1, p.stock)} style={{ width: 20, height: 20, borderRadius: 4, background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>−</button>
                <button onClick={() => updateStock(p.id, 1, p.stock)} style={{ width: 20, height: 20, borderRadius: 4, background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>+</button>
              </div>
            </div>
            {p.wishlist_count > 0 && (
              <div style={{ fontSize: 10, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--purple)', display: 'inline-block' }} />
                {p.wishlist_count} en wishlist
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
export function TriggersPage() {
  const [triggers, setTriggers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ keyword: '', response: '' });

  const load = () => {
    triggersApi.list()
      .then(r => setTriggers(r.data.triggers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleCreate = async () => {
    if (!form.keyword || !form.response) return;
    try {
      await triggersApi.create(form.keyword, form.response);
      setForm({ keyword: '', response: '' });
      setShowForm(false);
      load();
    } catch {}
  };

  const handleToggle = async (id: string) => {
    try { await triggersApi.toggle(id); load(); } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este trigger?')) return;
    try { await triggersApi.delete(id); load(); } catch {}
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600 }}>Triggers de comentarios</h1>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Palabras clave que disparan DMs automáticos al instante</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Nuevo trigger</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Nuevo trigger</div>
          <input className="input" placeholder='Palabra clave (ej: NIKE)' value={form.keyword} onChange={e => setForm(p => ({ ...p, keyword: e.target.value.toUpperCase() }))} style={{ marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }} />
          <textarea className="input" placeholder="Mensaje automático que se envía cuando alguien comenta esta palabra..." value={form.response} onChange={e => setForm(p => ({ ...p, response: e.target.value }))} rows={3} style={{ resize: 'vertical', marginBottom: 10 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={handleCreate}>Guardar trigger</button>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>Cargando...</div>
        ) : triggers.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text3)', padding: 40, fontSize: 12 }}>
            No hay triggers aún.<br/>Creá tu primer trigger y empezá a capturar leads de tus posts.
          </div>
        ) : triggers.map(t => (
          <div key={t.id} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 14, opacity: t.active ? 1 : 0.5 }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 500, color: 'var(--text)', background: 'var(--surface2)', border: '1px solid var(--border)', padding: '5px 10px', borderRadius: 6, whiteSpace: 'nowrap', flexShrink: 0, letterSpacing: '0.05em' }}>
              {t.keyword}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 5 }}>Respuesta automática cuando alguien comenta</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, background: 'var(--surface2)', borderRadius: 6, padding: '8px 10px', marginBottom: 8 }}>"{t.response}"</div>
              <div style={{ display: 'flex', gap: 14 }}>
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>Activaciones: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{t.activations}</span></span>
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>Revenue: <span style={{ color: 'var(--green)', fontWeight: 600 }}>${t.revenue}</span></span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <button onClick={() => handleToggle(t.id)} style={{ width: 32, height: 18, borderRadius: 9, background: t.active ? 'var(--blue)' : 'var(--border2)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: 2, right: t.active ? 2 : undefined, left: !t.active ? 2 : undefined, width: 14, height: 14, background: '#fff', borderRadius: '50%', transition: 'all 0.2s' }} />
              </button>
              <span style={{ fontSize: 9, fontWeight: 600, color: t.active ? 'var(--blue)' : 'var(--text3)' }}>{t.active ? 'ON' : 'OFF'}</span>
              <button onClick={() => handleDelete(t.id)} style={{ fontSize: 10, color: 'var(--text3)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)', cursor: 'pointer' }}>×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
