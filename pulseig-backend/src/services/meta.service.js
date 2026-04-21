const axios = require('axios');
const db = require('../db');
const aiService = require('./ai.service');
const scoreService = require('./score.service');
const { v4: uuidv4 } = require('uuid');

const GRAPH_API = 'https://graph.facebook.com/v18.0';

// ─── Enviar mensaje via Instagram Graph API ──────────────────
const sendInstagramMessage = async (recipientId, message, accessToken) => {
  if (!accessToken || process.env.NODE_ENV === 'development') {
    console.log(`[Meta] SIMULADO → enviando a ${recipientId}: "${message.substring(0, 60)}..."`);
    return { simulated: true, message_id: `sim_${uuidv4()}` };
  }

  try {
    const res = await axios.post(
      `${GRAPH_API}/me/messages`,
      { recipient: { id: recipientId }, message: { text: message } },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return { simulated: false, message_id: res.data.message_id };
  } catch (err) {
    console.error('[Meta] Error sending message:', err.response?.data || err.message);
    throw err;
  }
};

// ─── Procesar mensaje entrante de Instagram ──────────────────
const processIncomingMessage = async (businessId, senderId, messageText, channel = 'instagram') => {
  try {
    // 1. Buscar o crear contacto
    let contactResult = await db.query(
      `SELECT * FROM contacts WHERE business_id = $1 AND instagram_id = $2`,
      [businessId, senderId]
    );

    let contact;
    if (contactResult.rows.length === 0) {
      const newContact = await db.query(
        `INSERT INTO contacts (business_id, instagram_id, name, segment, intent_score, last_interaction)
         VALUES ($1, $2, $3, 'cold', 10, NOW())
         RETURNING *`,
        [businessId, senderId, `Usuario ${senderId.slice(-4)}`]
      );
      contact = newContact.rows[0];
      console.log(`[Webhook] Nuevo contacto creado: ${contact.id}`);
    } else {
      contact = contactResult.rows[0];
    }

    // 2. Buscar o crear conversación activa
    let convResult = await db.query(
      `SELECT * FROM conversations
       WHERE business_id = $1 AND contact_id = $2 AND status != 'closed'
       ORDER BY created_at DESC LIMIT 1`,
      [businessId, contact.id]
    );

    let conversation;
    if (convResult.rows.length === 0) {
      const newConv = await db.query(
        `INSERT INTO conversations (business_id, contact_id, channel, status, ai_enabled)
         VALUES ($1, $2, $3, 'ai_handling', true)
         RETURNING *`,
        [businessId, contact.id, channel]
      );
      conversation = newConv.rows[0];
    } else {
      conversation = convResult.rows[0];
    }

    // 3. Guardar mensaje del contacto
    await db.query(
      `INSERT INTO messages (conversation_id, business_id, sender, content, sent_by_ai)
       VALUES ($1, $2, 'contact', $3, false)`,
      [conversation.id, businessId, messageText]
    );

    // 4. Actualizar score
    await scoreService.updateScore(contact.id, businessId, 'dm_received');
    const intentEvents = scoreService.detectIntentEvents(messageText);
    for (const event of intentEvents) {
      await scoreService.updateScore(contact.id, businessId, event, { message: messageText });
    }

    // 5. Extraer datos del cliente del mensaje
    const extracted = aiService.extractContactData(messageText);
    if (Object.keys(extracted).length > 0) {
      const updateFields = Object.entries(extracted)
        .map(([k, v], i) => `${k} = $${i + 2}`)
        .join(', ');
      const values = [contact.id, ...Object.values(extracted)];
      if (updateFields) {
        await db.query(
          `UPDATE contacts SET ${updateFields} WHERE id = $1`,
          values
        );
      }
    }

    // 6. Si la IA está activa, generar y enviar respuesta
    if (conversation.ai_enabled) {
      // Obtener historial de conversación
      const historyResult = await db.query(
        `SELECT sender, content FROM messages
         WHERE conversation_id = $1
         ORDER BY created_at ASC LIMIT 20`,
        [conversation.id]
      );

      // Obtener productos del negocio
      const productsResult = await db.query(
        `SELECT name, price, stock FROM products WHERE business_id = $1 AND active = true`,
        [businessId]
      );

      // Obtener datos del negocio
      const bizResult = await db.query(
        `SELECT name, ai_persona FROM businesses WHERE id = $1`,
        [businessId]
      );

      const aiResult = await aiService.generateResponse({
        business: bizResult.rows[0],
        contact,
        products: productsResult.rows,
        conversationHistory: historyResult.rows,
      });

      // Limpiar tags especiales del texto
      const cleanText = aiResult.text
        .replace(/\[VENTA_CERRADA:\d+(?:\.\d+)?\]/g, '')
        .replace(/\[WHATSAPP:[^\]]+\]/g, '')
        .trim();

      // Guardar respuesta de la IA
      await db.query(
        `INSERT INTO messages (conversation_id, business_id, sender, content, sent_by_ai)
         VALUES ($1, $2, 'ai', $3, true)`,
        [conversation.id, businessId, cleanText]
      );

      // Actualizar timestamp de conversación
      await db.query(
        `UPDATE conversations SET last_message_at = NOW() WHERE id = $1`,
        [conversation.id]
      );

      // Detectar venta cerrada
      const saleAmount = aiService.detectSale(aiResult.text);
      if (saleAmount) {
        await db.query(
          `INSERT INTO sales (business_id, contact_id, conversation_id, amount, channel, closed_by_ai)
           VALUES ($1, $2, $3, $4, $5, true)`,
          [businessId, contact.id, conversation.id, saleAmount, channel]
        );
        await db.query(
          `UPDATE contacts SET total_spent = total_spent + $1, purchase_count = purchase_count + 1 WHERE id = $2`,
          [saleAmount, contact.id]
        );
        await scoreService.updateScore(contact.id, businessId, 'purchase_completed');
        console.log(`[Webhook] ¡Venta cerrada por IA! $${saleAmount}`);
      }

      // Detectar WhatsApp compartido
      const wa = aiService.detectWhatsApp(aiResult.text);
      if (wa) {
        await db.query(
          `UPDATE contacts SET whatsapp = $1 WHERE id = $2`,
          [wa, contact.id]
        );
        await scoreService.updateScore(contact.id, businessId, 'whatsapp_shared');
      }

      return {
        contact_id: contact.id,
        conversation_id: conversation.id,
        ai_response: cleanText,
        simulated: aiResult.simulated,
      };
    }

    return {
      contact_id: contact.id,
      conversation_id: conversation.id,
      ai_response: null,
    };

  } catch (err) {
    console.error('[Webhook] Error processing message:', err);
    throw err;
  }
};

// ─── Procesar comentario en post ─────────────────────────────
const processComment = async (businessId, commenterId, commentText, postId) => {
  try {
    const triggersResult = await db.query(
      `SELECT * FROM comment_triggers WHERE business_id = $1 AND active = true`,
      [businessId]
    );

    const matched = triggersResult.rows.find(t =>
      commentText.toUpperCase().includes(t.keyword.toUpperCase())
    );

    if (!matched) return null;

    // Incrementar contador de activaciones
    await db.query(
      `UPDATE comment_triggers SET activations = activations + 1 WHERE id = $1`,
      [matched.id]
    );

    // Crear contacto si no existe
    let contactResult = await db.query(
      `SELECT id FROM contacts WHERE business_id = $1 AND instagram_id = $2`,
      [businessId, commenterId]
    );

    let contactId;
    if (contactResult.rows.length === 0) {
      const newContact = await db.query(
        `INSERT INTO contacts (business_id, instagram_id, segment, intent_score, tags)
         VALUES ($1, $2, 'warm', 20, $3)
         RETURNING id`,
        [businessId, commenterId, [`trigger_${matched.keyword.toLowerCase()}`]]
      );
      contactId = newContact.rows[0].id;
    } else {
      contactId = contactResult.rows[0].id;
    }

    // Actualizar score
    await scoreService.updateScore(contactId, businessId, 'keyword_trigger', {
      keyword: matched.keyword,
      post_id: postId,
    });

    console.log(`[Trigger] Match "${matched.keyword}" → enviando DM a ${commenterId}`);

    return {
      triggered: true,
      keyword: matched.keyword,
      response: matched.response,
      contact_id: contactId,
    };

  } catch (err) {
    console.error('[Trigger] Error processing comment:', err);
    throw err;
  }
};

module.exports = {
  sendInstagramMessage,
  processIncomingMessage,
  processComment,
};
