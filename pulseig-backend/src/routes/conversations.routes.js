const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const metaService = require('../services/meta.service');
const router = express.Router();

// GET /api/conversations — lista con filtros
router.get('/', auth, async (req, res) => {
  const { status, segment, channel, limit = 50, offset = 0 } = req.query;

  let where = ['c.business_id = $1'];
  let params = [req.business.id];
  let idx = 2;

  if (status) { where.push(`c.status = $${idx++}`); params.push(status); }
  if (channel) { where.push(`c.channel = $${idx++}`); params.push(channel); }
  if (segment) { where.push(`co.segment = $${idx++}`); params.push(segment); }

  try {
    const result = await db.query(
      `SELECT c.*, co.name as contact_name, co.instagram_handle,
              co.intent_score, co.segment, co.tags, co.whatsapp,
              co.total_spent, co.purchase_count,
              m.content as last_message, m.created_at as last_message_at,
              m.sent_by_ai as last_by_ai
       FROM conversations c
       JOIN contacts co ON c.contact_id = co.id
       LEFT JOIN LATERAL (
         SELECT content, created_at, sent_by_ai
         FROM messages WHERE conversation_id = c.id
         ORDER BY created_at DESC LIMIT 1
       ) m ON true
       WHERE ${where.join(' AND ')}
       ORDER BY c.last_message_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM conversations c
       JOIN contacts co ON c.contact_id = co.id
       WHERE ${where.join(' AND ')}`,
      params
    );

    res.json({
      conversations: result.rows,
      total: parseInt(countResult.rows[0].count),
    });
  } catch (err) {
    console.error('[Conversations] List error:', err.message);
    res.status(500).json({ error: 'Error al obtener conversaciones' });
  }
});

// GET /api/conversations/:id — detalle con mensajes
router.get('/:id', auth, async (req, res) => {
  try {
    const convResult = await db.query(
      `SELECT c.*, co.* as contact,
              co.name as contact_name, co.instagram_id as contact_instagram_id,
              co.intent_score, co.segment, co.tags, co.whatsapp, co.email,
              co.total_spent, co.purchase_count, co.preferences, co.city, co.size
       FROM conversations c
       JOIN contacts co ON c.contact_id = co.id
       WHERE c.id = $1 AND c.business_id = $2`,
      [req.params.id, req.business.id]
    );

    if (convResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    const messagesResult = await db.query(
      `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );

    res.json({
      conversation: convResult.rows[0],
      messages: messagesResult.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener conversación' });
  }
});

// POST /api/conversations/:id/message — enviar mensaje manual
router.post('/:id/message', auth, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Contenido requerido' });

  try {
    const convResult = await db.query(
      `SELECT c.*, co.instagram_id as contact_ig, b.access_token
       FROM conversations c
       JOIN contacts co ON c.contact_id = co.id
       JOIN businesses b ON c.business_id = b.id
       WHERE c.id = $1 AND c.business_id = $2`,
      [req.params.id, req.business.id]
    );

    if (convResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    const conv = convResult.rows[0];

    // Guardar mensaje
    const msgResult = await db.query(
      `INSERT INTO messages (conversation_id, business_id, sender, content, sent_by_ai)
       VALUES ($1, $2, 'business', $3, false) RETURNING *`,
      [req.params.id, req.business.id, content]
    );

    // Actualizar timestamp
    await db.query(
      `UPDATE conversations SET last_message_at = NOW() WHERE id = $1`,
      [req.params.id]
    );

    // Enviar via Meta API (si hay token y ID)
    if (conv.contact_ig && conv.access_token) {
      await metaService.sendInstagramMessage(conv.contact_ig, content, conv.access_token);
    }

    res.json({ message: msgResult.rows[0] });
  } catch (err) {
    console.error('[Conversations] Send message error:', err.message);
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
});

// PATCH /api/conversations/:id/toggle-ai — activar/desactivar IA
router.patch('/:id/toggle-ai', auth, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE conversations SET ai_enabled = NOT ai_enabled
       WHERE id = $1 AND business_id = $2
       RETURNING id, ai_enabled`,
      [req.params.id, req.business.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al cambiar estado de IA' });
  }
});

// PATCH /api/conversations/:id/status
router.patch('/:id/status', auth, async (req, res) => {
  const { status } = req.body;
  const valid = ['open', 'ai_handling', 'waiting', 'closed'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Estado inválido' });

  try {
    const result = await db.query(
      `UPDATE conversations SET status = $1 WHERE id = $2 AND business_id = $3 RETURNING *`,
      [status, req.params.id, req.business.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

module.exports = router;
