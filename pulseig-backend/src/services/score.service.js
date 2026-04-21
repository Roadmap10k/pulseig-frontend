const db = require('../db');

// ─── Tabla de puntos por evento ──────────────────────────────
const SCORE_RULES = {
  dm_received:          10,
  story_reply:          15,
  comment_on_post:      12,
  keyword_trigger:      20,
  price_asked:          25,
  product_link_clicked: 20,
  cart_visited:         30,
  cart_abandoned:       35,
  purchase_completed:   50,
  whatsapp_shared:      30,
  email_shared:         20,
  days_inactive_7:     -10,
  days_inactive_30:    -25,
};

const SEGMENTS = [
  { min: 80, max: 100, name: 'hot' },
  { min: 50, max: 79,  name: 'warm' },
  { min: 20, max: 49,  name: 'cold' },
  { min: 0,  max: 19,  name: 'inactive' },
];

const getSegment = (score) => {
  const s = SEGMENTS.find(s => score >= s.min && score <= s.max);
  return s ? s.name : 'inactive';
};

const updateScore = async (contactId, businessId, eventType, metadata = {}) => {
  const points = SCORE_RULES[eventType] || 0;
  if (points === 0) return null;

  try {
    // Registrar el evento
    await db.query(
      `INSERT INTO score_events (business_id, contact_id, event_type, points, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [businessId, contactId, eventType, points, metadata]
    );

    // Actualizar score del contacto (clamp 0-100)
    const result = await db.query(
      `UPDATE contacts
       SET intent_score = GREATEST(0, LEAST(100, intent_score + $1)),
           last_interaction = NOW()
       WHERE id = $2
       RETURNING intent_score`,
      [points, contactId]
    );

    if (result.rows.length === 0) return null;

    const newScore = result.rows[0].intent_score;
    const segment = getSegment(newScore);

    // Actualizar segmento
    await db.query(
      `UPDATE contacts SET segment = $1 WHERE id = $2`,
      [segment, contactId]
    );

    return { score: newScore, segment, points, event: eventType };
  } catch (err) {
    console.error('[Score] Error updating score:', err.message);
    return null;
  }
};

const detectIntentEvents = (messageText) => {
  const events = [];
  const text = messageText.toLowerCase();

  if (text.includes('precio') || text.includes('cuanto') || text.includes('cuánto') || text.includes('vale') || text.includes('cuesta')) {
    events.push('price_asked');
  }
  if (text.includes('whatsapp') || text.includes('wp') || text.includes('wasap')) {
    events.push('whatsapp_shared');
  }

  return events;
};

module.exports = { updateScore, getSegment, detectIntentEvents, SCORE_RULES };
