import React, { useState, useEffect, useRef, useCallback } from 'react';
import { conversationsApi } from '../api';
import { useAuthStore } from '../store';

const SEG_CLASS: Record<string, string> = { hot: 'seg-hot', warm: 'seg-warm', cold: 'seg-cold', inactive: 'seg-inactive' };
const SEG_LABEL: Record<string, string> = { hot: 'HOT', warm: 'TIBIO', cold: 'FRÍO', inactive: 'INACTIVO' };
const CH_CLASS: Record<string, string> = { instagram: 'ch-ig', marketplace: 'ch-mp', whatsapp: 'ch-wa', messenger: 'ch-ms' };
const CH_LABEL: Record<string, string> = { instagram: 'Instagram', marketplace: 'Marketplace', whatsapp: 'WhatsApp', messenger: 'Messenger' };
const BAR_COLOR: Record<string, string> = { hot: '#2563EB', warm: '#D97706', cold: '#6B7280', inactive: '#D1D5DB' };

const Avatar = ({ name, style }: { name: string; style?: React.CSSProperties }) => {
  const initials = name?.slice(0, 2).toUpperCase() || '??';
  const colors = [['#EFF6FF','#1D4ED8'],['#F0FDF4','#166534'],['#F5F3FF','#5B21B6'],['#FDF2F8','#9D174D'],['#FFFBEB','#92400E']];
  const [bg, tc] = colors[name?.charCodeAt(0) % colors.length] || colors[0];
  return (
    <div className="avatar" style={{ background: bg, color: tc, ...style }}>
      {initials}
    </div>
  );
};

export default function InboxPage() {
  const { business } = useAuthStore();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [aiOn, setAiOn] = useState(true);
  const [filter, setFilter] = useState('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const params: any = {};
      if (filter === 'hot') params.segment = 'hot';
      if (filter === 'ai') params.status = 'ai_handling';
      const res = await conversationsApi.list(params);
      setConversations(res.data.conversations || []);
      if (!selectedId && res.data.conversations?.length > 0) {
        selectConversation(res.data.conversations[0].id);
      }
    } catch { /* use demo data */ } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectConversation = async (id: string) => {
    setSelectedId(id);
    try {
      const res = await conversationsApi.get(id);
      setSelectedConv(res.data.conversation);
      setMessages(res.data.messages || []);
      setAiOn(res.data.conversation.ai_enabled);
    } catch { setMessages([]); }
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedId || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    // Optimistic UI
    const optimistic = { id: 'opt_' + Date.now(), sender: 'business', content: text, created_at: new Date().toISOString(), sent_by_ai: false };
    setMessages(prev => [...prev, optimistic]);
    try {
      await conversationsApi.sendMessage(selectedId, text);
      // Reload messages to get AI response
      setTimeout(async () => {
        const res = await conversationsApi.get(selectedId);
        setMessages(res.data.messages || []);
        setSending(false);
      }, 1500);
    } catch {
      setSending(false);
    }
  };

  const toggleAI = async () => {
    if (!selectedId) return;
    try {
      const res = await conversationsApi.toggleAI(selectedId);
      setAiOn(res.data.ai_enabled);
    } catch { setAiOn(p => !p); }
  };

  const contact = selectedConv;

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

      {/* CONVERSATION LIST */}
      <div style={{ width: 280, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Conversaciones</span>
            <span className="seg-hot">12 nuevas</span>
          </div>
          <input className="input" placeholder="Buscar..." style={{ marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 4 }}>
            {[['all','Todos'],['hot','Hot'],['ai','IA']].map(([val, lbl]) => (
              <button key={val} onClick={() => setFilter(val)}
                style={{ flex: 1, padding: '4px', borderRadius: 5, fontSize: 10, fontWeight: 500, cursor: 'pointer', background: filter === val ? 'var(--accent)' : 'var(--surface)', color: filter === val ? '#fff' : 'var(--text3)', border: `1px solid ${filter === val ? 'var(--accent)' : 'var(--border)'}`, transition: 'all 0.1s' }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)' }}>Cargando...</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
              No hay conversaciones aún.<br/>Conectá tu Instagram para empezar.
            </div>
          ) : (
            conversations.map(conv => (
              <div key={conv.id}
                onClick={() => selectConversation(conv.id)}
                style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selectedId === conv.id ? 'var(--blue-bg)' : 'var(--surface)', borderLeft: selectedId === conv.id ? '2px solid var(--blue)' : '2px solid transparent', transition: 'background 0.1s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Avatar name={conv.contact_name} style={{ width: 28, height: 28, fontSize: 10 }} />
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.contact_name}</span>
                  <span style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0 }}>
                    {conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 5, paddingLeft: 36 }}>
                  {conv.last_message || 'Sin mensajes'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 36 }}>
                  <span className={CH_CLASS[conv.channel] || 'ch-ig'}>{CH_LABEL[conv.channel] || conv.channel}</span>
                  <div style={{ flex: 1, height: 2, background: 'var(--border)', borderRadius: 1, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${conv.intent_score || 0}%`, background: BAR_COLOR[conv.segment] || '#6B7280', borderRadius: 1 }} />
                  </div>
                  <span className="mono" style={{ fontSize: 10, color: BAR_COLOR[conv.segment] || 'var(--text3)', fontWeight: 600 }}>{conv.intent_score || 0}</span>
                  <span className={SEG_CLASS[conv.segment] || 'seg-cold'}>{SEG_LABEL[conv.segment] || conv.segment?.toUpperCase()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CHAT AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selectedConv ? (
          <>
            {/* Chat header */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', flexShrink: 0 }}>
              <Avatar name={contact?.contact_name} style={{ width: 34, height: 34, fontSize: 12 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {contact?.contact_name}
                  {contact?.instagram_handle && <span style={{ color: 'var(--text3)', fontWeight: 400 }}> · @{contact.instagram_handle}</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                  <span className={CH_CLASS[contact?.channel] || 'ch-ig'}>{CH_LABEL[contact?.channel] || contact?.channel}</span>
                  <span>·</span>
                  <span>score <strong style={{ color: 'var(--blue)' }}>{contact?.intent_score}/100</strong></span>
                </div>
              </div>
              <button
                onClick={toggleAI}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', cursor: 'pointer' }}>
                <div style={{ width: 30, height: 16, background: aiOn ? 'var(--blue)' : 'var(--border2)', borderRadius: 8, position: 'relative', transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', top: 2, left: aiOn ? 16 : 2, width: 12, height: 12, background: '#fff', borderRadius: '50%', transition: 'left 0.2s' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 500, color: aiOn ? 'var(--text2)' : 'var(--red)' }}>{aiOn ? 'IA activa' : 'IA pausada'}</span>
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.map(msg => (
                <div key={msg.id} style={{ maxWidth: '68%', alignSelf: msg.sender === 'contact' ? 'flex-start' : 'flex-end' }}>
                  <div style={{
                    padding: '9px 13px', borderRadius: 10, fontSize: 12, lineHeight: 1.6,
                    background: msg.sender === 'contact' ? 'var(--surface2)' : 'var(--accent)',
                    color: msg.sender === 'contact' ? 'var(--text)' : '#fff',
                    borderBottomLeftRadius: msg.sender === 'contact' ? 3 : 10,
                    borderBottomRightRadius: msg.sender !== 'contact' ? 3 : 10,
                  }}>
                    {msg.content}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, padding: '0 2px', justifyContent: msg.sender !== 'contact' ? 'flex-end' : 'flex-start' }}>
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                      {new Date(msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.sent_by_ai && <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--blue)', background: 'var(--blue-bg)', padding: '1px 5px', borderRadius: 3 }}>IA</span>}
                  </div>
                </div>
              ))}
              {sending && (
                <div style={{ alignSelf: 'flex-start', maxWidth: '68%' }}>
                  <div style={{ padding: '9px 13px', borderRadius: 10, background: 'var(--surface2)', fontSize: 12 }}>
                    <span style={{ color: 'var(--text3)' }}>● ● ●</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Mensaje manual... (Enter para enviar)"
                rows={1}
                style={{ flex: 1, padding: '9px 13px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontFamily: 'Inter, sans-serif', background: 'var(--surface2)', color: 'var(--text)', resize: 'none', maxHeight: 90, lineHeight: 1.5, outline: 'none' }}
              />
              <button onClick={sendMessage} disabled={!input.trim() || sending}
                style={{ width: 36, height: 36, background: input.trim() ? 'var(--accent)' : 'var(--border)', border: 'none', borderRadius: 8, cursor: input.trim() ? 'pointer' : 'default', color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.1s', flexShrink: 0 }}>
                ↑
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 32 }}>💬</div>
            <p style={{ fontSize: 13 }}>Seleccioná una conversación</p>
          </div>
        )}
      </div>

      {/* PROFILE PANEL */}
      {selectedConv && (
        <div style={{ width: 240, background: 'var(--surface)', borderLeft: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0 }}>
          {/* Score */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Score de intención</div>
            <div className="mono" style={{ fontSize: 36, color: 'var(--text)', lineHeight: 1 }}>{contact?.intent_score || 0}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
              {contact?.segment === 'hot' ? '🔥 compra inminente' : contact?.segment === 'warm' ? '🟡 interesado' : '🔵 explorando'}
            </div>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${contact?.intent_score || 0}%`, background: BAR_COLOR[contact?.segment] || '#6B7280', borderRadius: 2 }} />
            </div>
          </div>
          {/* Segment + Tags */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Segmento</div>
            <span className={SEG_CLASS[contact?.segment] || 'seg-cold'} style={{ fontSize: 11, padding: '3px 8px' }}>{SEG_LABEL[contact?.segment] || 'DESCONOCIDO'}</span>
            {contact?.tags?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                {contact.tags.map((tag: string) => (
                  <span key={tag} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'var(--blue-bg)', color: '#1D4ED8', fontWeight: 500 }}>{tag}</span>
                ))}
              </div>
            )}
          </div>
          {/* Contact data */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Datos</div>
            {[
              ['Instagram', contact?.instagram_handle ? `@${contact.instagram_handle}` : '—'],
              ['WhatsApp', contact?.whatsapp || '—'],
              ['Ciudad', contact?.city || '—'],
              ['Compras', `${contact?.purchase_count || 0} · $${contact?.total_spent || 0}`],
              ['Talle', contact?.size || '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>{k}</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: k === 'Compras' && contact?.purchase_count > 0 ? 'var(--green)' : 'var(--text)' }}>{v}</span>
              </div>
            ))}
          </div>
          {/* Channels */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Canal</div>
            <span className={CH_CLASS[contact?.channel] || 'ch-ig'}>{CH_LABEL[contact?.channel] || contact?.channel}</span>
          </div>
        </div>
      )}
    </div>
  );
}
