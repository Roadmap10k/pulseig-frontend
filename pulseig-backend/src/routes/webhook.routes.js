const express = require('express');
const db = require('../db');
const metaService = require('../services/meta.service');
const router = express.Router();

// GET /api/webhook/instagram — verificación de Meta
router.get('/instagram', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    console.log('[Webhook] Meta verificación exitosa');
    return res.status(200).send(challenge);
  }
  return res.status(403).json({ error: 'Verificación fallida' });
});

// POST /api/webhook/instagram — eventos de Meta
router.post('/instagram', async (req, res) => {
  // Responder rápido a Meta (tiene timeout de 20s)
  res.status(200).send('EVENT_RECEIVED');

  const body = req.body;
  if (body.object !== 'instagram' && body.object !== 'page') return;

  for (const entry of body.entry || []) {
    // ─── Mensajes directos ───────────────────────────────────
    for (const event of entry.messaging || []) {
      if (!event.message?.text) continue;

      const senderId = event.sender.id;
      const pageId = entry.id;
      const messageText = event.message.text;

      try {
        // Buscar el negocio por page_id o instagram_id
        const bizResult = await db.query(
          `SELECT id, access_token FROM businesses
           WHERE page_id = $1 OR instagram_id = $1 LIMIT 1`,
          [pageId]
        );

        if (bizResult.rows.length === 0) {
          console.warn(`[Webhook] No se encontró negocio para page_id: ${pageId}`);
          continue;
        }

        const business = bizResult.rows[0];
        const result = await metaService.processIncomingMessage(
          business.id, senderId, messageText, 'instagram'
        );

        // Enviar respuesta de la IA
        if (result.ai_response && business.access_token) {
          await metaService.sendInstagramMessage(
            senderId, result.ai_response, business.access_token
          );
        }

        console.log(`[Webhook] Mensaje procesado para contacto ${result.contact_id}`);

      } catch (err) {
        console.error('[Webhook] Error procesando mensaje:', err.message);
      }
    }

    // ─── Comentarios en posts ────────────────────────────────
    for (const change of entry.changes || []) {
      if (change.field !== 'comments') continue;

      const commentData = change.value;
      const commenterId = commentData.from?.id;
      const commentText = commentData.text || '';
      const postId = commentData.media?.id;
      const pageId = entry.id;

      try {
        const bizResult = await db.query(
          `SELECT id FROM businesses WHERE page_id = $1 OR instagram_id = $1 LIMIT 1`,
          [pageId]
        );
        if (bizResult.rows.length === 0) continue;

        const result = await metaService.processComment(
          bizResult.rows[0].id, commenterId, commentText, postId
        );

        if (result?.triggered) {
          console.log(`[Webhook] Trigger activado: "${result.keyword}"`);
        }
      } catch (err) {
        console.error('[Webhook] Error procesando comentario:', err.message);
      }
    }
  }
});

// POST /api/webhook/simulate — para testear sin Meta real
router.post('/simulate', async (req, res) => {
  const { business_id, sender_id, message } = req.body;

  if (!business_id || !sender_id || !message) {
    return res.status(400).json({ error: 'business_id, sender_id y message son requeridos' });
  }

  try {
    const result = await metaService.processIncomingMessage(
      business_id, sender_id, message, 'instagram'
    );
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
