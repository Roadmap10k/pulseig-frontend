const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// ════════════════════════════════════════════════════════════
// CONTACTS
// ════════════════════════════════════════════════════════════
const contacts = express.Router();

contacts.get('/', auth, async (req, res) => {
  const { segment, search, limit = 50, offset = 0 } = req.query;
  let where = ['business_id = $1'];
  let params = [req.business.id];
  let idx = 2;

  if (segment) { where.push(`segment = $${idx++}`); params.push(segment); }
  if (search) {
    where.push(`(name ILIKE $${idx} OR instagram_handle ILIKE $${idx} OR whatsapp ILIKE $${idx})`);
    params.push(`%${search}%`); idx++;
  }

  try {
    const result = await db.query(
      `SELECT * FROM contacts WHERE ${where.join(' AND ')}
       ORDER BY intent_score DESC, last_interaction DESC
       LIMIT $${idx} OFFSET $${idx+1}`,
      [...params, limit, offset]
    );
    const count = await db.query(
      `SELECT COUNT(*) FROM contacts WHERE ${where.join(' AND ')}`, params
    );
    res.json({ contacts: result.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener contactos' });
  }
});

contacts.get('/:id', auth, async (req, res) => {
  try {
    const c = await db.query(
      `SELECT * FROM contacts WHERE id = $1 AND business_id = $2`,
      [req.params.id, req.business.id]
    );
    if (!c.rows[0]) return res.status(404).json({ error: 'No encontrado' });

    const sales = await db.query(
      `SELECT s.*, p.name as product_name FROM sales s
       LEFT JOIN products p ON s.product_id = p.id
       WHERE s.contact_id = $1 ORDER BY s.created_at DESC`,
      [req.params.id]
    );
    res.json({ contact: c.rows[0], sales: sales.rows });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener contacto' });
  }
});

contacts.patch('/:id', auth, async (req, res) => {
  const { name, whatsapp, email, city, size, tags, notes } = req.body;
  try {
    const result = await db.query(
      `UPDATE contacts SET
        name = COALESCE($1, name),
        whatsapp = COALESCE($2, whatsapp),
        email = COALESCE($3, email),
        city = COALESCE($4, city),
        size = COALESCE($5, size),
        tags = COALESCE($6, tags)
       WHERE id = $7 AND business_id = $8
       RETURNING *`,
      [name, whatsapp, email, city, size, tags, req.params.id, req.business.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar contacto' });
  }
});

// ════════════════════════════════════════════════════════════
// PRODUCTS
// ════════════════════════════════════════════════════════════
const products = express.Router();

products.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*,
        (SELECT COUNT(*) FROM wishlists WHERE product_id = p.id) as wishlist_count
       FROM products p WHERE business_id = $1 ORDER BY created_at DESC`,
      [req.business.id]
    );
    res.json({ products: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

products.post('/', auth, async (req, res) => {
  const { name, description, price, stock, stock_min, variants } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'Nombre y precio requeridos' });
  try {
    const result = await db.query(
      `INSERT INTO products (business_id, name, description, price, stock, stock_min, variants)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.business.id, name, description, price, stock || 0, stock_min || 2, variants || {}]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

products.patch('/:id', auth, async (req, res) => {
  const { name, price, stock, active } = req.body;
  try {
    const result = await db.query(
      `UPDATE products SET
        name = COALESCE($1, name),
        price = COALESCE($2, price),
        stock = COALESCE($3, stock),
        active = COALESCE($4, active)
       WHERE id = $5 AND business_id = $6
       RETURNING *`,
      [name, price, stock, active, req.params.id, req.business.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'No encontrado' });

    // Si el stock pasó de 0 a algo, notificar wishlist
    if (req.body.stock > 0) {
      const wl = await db.query(
        `SELECT w.*, c.instagram_id, c.name as contact_name
         FROM wishlists w JOIN contacts c ON w.contact_id = c.id
         WHERE w.product_id = $1 AND w.notified = false`,
        [req.params.id]
      );
      if (wl.rows.length > 0) {
        console.log(`[Stock] ${wl.rows.length} clientes en wishlist listos para notificar`);
        // Aquí iría el envío de mensajes automáticos
      }
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

products.delete('/:id', auth, async (req, res) => {
  try {
    await db.query(
      `UPDATE products SET active = false WHERE id = $1 AND business_id = $2`,
      [req.params.id, req.business.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

// ════════════════════════════════════════════════════════════
// TRIGGERS
// ════════════════════════════════════════════════════════════
const triggers = express.Router();

triggers.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM comment_triggers WHERE business_id = $1 ORDER BY activations DESC`,
      [req.business.id]
    );
    res.json({ triggers: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener triggers' });
  }
});

triggers.post('/', auth, async (req, res) => {
  const { keyword, response } = req.body;
  if (!keyword || !response) return res.status(400).json({ error: 'Keyword y response requeridos' });
  try {
    const result = await db.query(
      `INSERT INTO comment_triggers (business_id, keyword, response)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.business.id, keyword.toUpperCase(), response]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear trigger' });
  }
});

triggers.patch('/:id/toggle', auth, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE comment_triggers SET active = NOT active
       WHERE id = $1 AND business_id = $2 RETURNING *`,
      [req.params.id, req.business.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al cambiar estado' });
  }
});

triggers.delete('/:id', auth, async (req, res) => {
  try {
    await db.query(
      `DELETE FROM comment_triggers WHERE id = $1 AND business_id = $2`,
      [req.params.id, req.business.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar trigger' });
  }
});

// ════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════
const dashboard = express.Router();

dashboard.get('/metrics', auth, async (req, res) => {
  const bizId = req.business.id;
  const { period = '30' } = req.query;

  try {
    const [revenue, contacts, conversations, aiSales, triggers_data, topContent] =
      await Promise.all([
        // Revenue del período
        db.query(
          `SELECT COALESCE(SUM(amount), 0) as total,
                  COUNT(*) as count,
                  SUM(CASE WHEN closed_by_ai THEN amount ELSE 0 END) as ai_revenue,
                  COUNT(CASE WHEN closed_by_ai THEN 1 END) as ai_count
           FROM sales WHERE business_id = $1 AND created_at > NOW() - INTERVAL '${period} days'`,
          [bizId]
        ),
        // Contactos por segmento
        db.query(
          `SELECT segment, COUNT(*) as count
           FROM contacts WHERE business_id = $1 GROUP BY segment`,
          [bizId]
        ),
        // Conversaciones del período
        db.query(
          `SELECT COUNT(*) as total,
                  COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed,
                  COUNT(CASE WHEN ai_enabled THEN 1 END) as ai_handled
           FROM conversations WHERE business_id = $1
           AND created_at > NOW() - INTERVAL '${period} days'`,
          [bizId]
        ),
        // Tasa de cierre IA
        db.query(
          `SELECT
            COUNT(*) as total_conversations,
            COUNT(CASE WHEN EXISTS(
              SELECT 1 FROM sales s WHERE s.conversation_id = c.id AND s.closed_by_ai = true
            ) THEN 1 END) as ai_closed
           FROM conversations c WHERE c.business_id = $1
           AND c.created_at > NOW() - INTERVAL '${period} days'`,
          [bizId]
        ),
        // Stats de triggers
        db.query(
          `SELECT SUM(activations) as total_activations,
                  SUM(conversions) as total_conversions,
                  SUM(revenue) as total_revenue
           FROM comment_triggers WHERE business_id = $1`,
          [bizId]
        ),
        // Top productos por revenue
        db.query(
          `SELECT p.name, COUNT(s.id) as sales_count, SUM(s.amount) as revenue
           FROM sales s JOIN products p ON s.product_id = p.id
           WHERE s.business_id = $1 AND s.created_at > NOW() - INTERVAL '${period} days'
           GROUP BY p.name ORDER BY revenue DESC LIMIT 5`,
          [bizId]
        ),
      ]);

    const totalRevenue = parseFloat(revenue.rows[0].total);
    const aiRevenue = parseFloat(revenue.rows[0].ai_revenue);
    const totalConv = parseInt(conversations.rows[0].total);
    const aiClosed = parseInt(aiSales.rows[0].ai_closed);
    const closeRate = totalConv > 0 ? Math.round((aiClosed / totalConv) * 100) : 0;
    const investment = 1000;
    const roi = totalRevenue > 0 ? (totalRevenue / investment).toFixed(1) : '0.0';

    const segMap = {};
    contacts.rows.forEach(r => { segMap[r.segment] = parseInt(r.count); });

    res.json({
      period: parseInt(period),
      revenue: {
        total: totalRevenue,
        ai_revenue: aiRevenue,
        sales_count: parseInt(revenue.rows[0].count),
        ai_sales_count: parseInt(revenue.rows[0].ai_count),
      },
      roi: {
        multiplier: parseFloat(roi),
        investment,
        net_profit: totalRevenue - investment,
      },
      contacts: {
        hot: segMap.hot || 0,
        warm: segMap.warm || 0,
        cold: segMap.cold || 0,
        inactive: segMap.inactive || 0,
        total: Object.values(segMap).reduce((a, b) => a + b, 0),
      },
      conversations: {
        total: totalConv,
        closed: parseInt(conversations.rows[0].closed),
        ai_handled: parseInt(conversations.rows[0].ai_handled),
        close_rate: closeRate,
      },
      triggers: {
        activations: parseInt(triggers_data.rows[0].total_activations) || 0,
        revenue: parseFloat(triggers_data.rows[0].total_revenue) || 0,
      },
      top_products: topContent.rows,
    });
  } catch (err) {
    console.error('[Dashboard] Metrics error:', err.message);
    res.status(500).json({ error: 'Error al obtener métricas' });
  }
});

module.exports = { contacts, products, triggers, dashboard };
