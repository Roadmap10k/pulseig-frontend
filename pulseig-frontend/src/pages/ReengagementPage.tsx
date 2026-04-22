/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { campaignsApi } from '../api';

function Avatar({ name, size=38 }: { name: string; size?: number }) {
  const ini = name?.slice(0,2).toUpperCase() || '??';
  const cols = [['#EFF6FF','#1D4ED8'],['#F0FDF4','#166534'],['#F5F3FF','#5B21B6'],['#FDF2F8','#9D174D'],['#FFFBEB','#92400E']];
  const [bg, tc] = cols[name?.charCodeAt(0) % cols.length] || cols[0];
  return <div style={{ width:size, height:size, borderRadius:'50%', background:bg, color:tc, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.38, fontWeight:600, flexShrink:0 }}>{ini}</div>;
}

const SEG_CLASS: Record<string,string> = { hot:'seg-hot', warm:'seg-warm', cold:'seg-cold', inactive:'seg-inactive' };

export default function ReengagementPage() {
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMsg, setEditMsg] = useState('');
  const [sendingAll, setSendingAll] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await campaignsApi.getReengagement(days);
      setCampaign(res.data);
    } catch { setCampaign({ messages: [], total: 0 }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [days]);

  const handleSend = async (contactId: string, message: string) => {
    setSending(contactId);
    try {
      await campaignsApi.sendReengagement(contactId, message);
      setSent(prev => new Set([...prev, contactId]));
    } catch {}
    setSending(null);
  };

  const handleSendAll = async () => {
    if (!campaign?.messages?.length) return;
    setSendingAll(true);
    const pending = campaign.messages.filter((m: any) => !sent.has(m.contact_id));
    try {
      await campaignsApi.sendAllReengagement(pending.map((m: any) => ({ contact_id: m.contact_id, message: m.suggested_message })));
      setSent(new Set(campaign.messages.map((m: any) => m.contact_id)));
    } catch {}
    setSendingAll(false);
  };

  const pendingCount = campaign?.messages?.filter((m: any) => !sent.has(m.contact_id)).length || 0;

  return (
    <div style={{ flex:1, overflowY:'auto', padding:24 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:15, fontWeight:600 }}>Re-engagement</h1>
          <p style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>Clientes inactivos con mensajes personalizados por IA listos para enviar</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <select value={days} onChange={e => setDays(parseInt(e.target.value))}
            style={{ padding:'6px 10px', border:'1px solid var(--border)', borderRadius:'var(--r)', fontSize:12, background:'var(--surface)', color:'var(--text)', cursor:'pointer' }}>
            <option value={15}>15 días</option>
            <option value={30}>30 días</option>
            <option value={60}>60 días</option>
            <option value={90}>90 días</option>
          </select>
          {pendingCount > 0 && (
            <button className="btn-primary" onClick={handleSendAll} disabled={sendingAll}>
              {sendingAll ? 'Enviando...' : `Enviar todos (${pendingCount})`}
            </button>
          )}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
        <div className="card" style={{ padding:'12px 16px' }}>
          <div style={{ fontSize:10, color:'var(--text3)', marginBottom:4 }}>Clientes a contactar</div>
          <div style={{ fontSize:28, fontWeight:300, fontFamily:'JetBrains Mono,monospace' }}>{campaign?.total || 0}</div>
        </div>
        <div className="card" style={{ padding:'12px 16px' }}>
          <div style={{ fontSize:10, color:'var(--text3)', marginBottom:4 }}>Enviados</div>
          <div style={{ fontSize:28, fontWeight:300, fontFamily:'JetBrains Mono,monospace', color:'var(--green)' }}>{sent.size}</div>
        </div>
        <div className="card" style={{ padding:'12px 16px' }}>
          <div style={{ fontSize:10, color:'var(--text3)', marginBottom:4 }}>Pendientes</div>
          <div style={{ fontSize:28, fontWeight:300, fontFamily:'JetBrains Mono,monospace', color:'var(--amber)' }}>{pendingCount}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', color:'var(--text3)', padding:60 }}>Generando mensajes con IA...</div>
      ) : !campaign?.messages?.length ? (
        <div className="card" style={{ textAlign:'center', color:'var(--text3)', padding:48 }}>
          <div style={{ fontSize:32, marginBottom:12 }}>🎉</div>
          <div style={{ fontSize:14, fontWeight:500, marginBottom:6 }}>¡No hay clientes inactivos!</div>
          <div style={{ fontSize:12 }}>Todos compraron en los últimos {days} días.</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {campaign.messages.map((item: any) => (
            <div key={item.contact_id} className="card" style={{ opacity: sent.has(item.contact_id) ? 0.6 : 1 }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                <Avatar name={item.contact_name} />
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <span style={{ fontSize:13, fontWeight:600 }}>{item.contact_name}</span>
                    {item.contact_instagram && <span style={{ fontSize:10, color:'var(--text3)' }}>@{item.contact_instagram}</span>}
                    <span className={SEG_CLASS[item.segment] || 'seg-cold'}>{item.segment?.toUpperCase()}</span>
                    <span style={{ fontSize:10, color:'var(--text3)', marginLeft:'auto' }}>
                      {item.days_inactive} días inactivo · {item.purchase_count} compras · ${item.total_spent}
                    </span>
                  </div>
                  {item.tags?.length > 0 && (
                    <div style={{ display:'flex', gap:4, marginBottom:8, flexWrap:'wrap' }}>
                      {item.tags.map((t: string) => (
                        <span key={t} style={{ fontSize:9, padding:'1px 6px', borderRadius:4, background:'var(--blue-bg)', color:'#1D4ED8', fontWeight:500 }}>{t}</span>
                      ))}
                    </div>
                  )}
                  {editingId === item.contact_id ? (
                    <div>
                      <textarea value={editMsg} onChange={e => setEditMsg(e.target.value)}
                        style={{ width:'100%', padding:'8px 10px', border:'1px solid var(--border)', borderRadius:6, fontSize:12, fontFamily:'Inter,sans-serif', background:'var(--surface2)', color:'var(--text)', resize:'vertical', minHeight:80, outline:'none', marginBottom:8 }} />
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="btn-primary" style={{ fontSize:11, padding:'5px 12px' }}
                          onClick={() => { handleSend(item.contact_id, editMsg); setEditingId(null); }}>
                          Enviar
                        </button>
                        <button className="btn-secondary" style={{ fontSize:11, padding:'5px 12px' }} onClick={() => setEditingId(null)}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px', fontSize:12, color:'var(--text2)', lineHeight:1.6 }}>
                      <div style={{ fontSize:9, fontWeight:600, color:'var(--blue)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4 }}>✦ Mensaje generado por IA</div>
                      {item.suggested_message}
                    </div>
                  )}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
                  {sent.has(item.contact_id) ? (
                    <span style={{ fontSize:11, fontWeight:600, color:'var(--green)' }}>✓ Enviado</span>
                  ) : (
                    <>
                      <button className="btn-primary" style={{ fontSize:11, padding:'6px 14px' }}
                        onClick={() => handleSend(item.contact_id, item.suggested_message)}
                        disabled={sending === item.contact_id}>
                        {sending === item.contact_id ? '...' : 'Enviar →'}
                      </button>
                      <button className="btn-secondary" style={{ fontSize:11, padding:'5px 14px' }}
                        onClick={() => { setEditingId(item.contact_id); setEditMsg(item.suggested_message); }}>
                        Editar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
