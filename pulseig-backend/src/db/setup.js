require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./index');

async function setup() {
  try {
    console.log('🔧 Creando tablas en la base de datos...');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await db.query(schema);
    console.log('✅ Schema creado correctamente');

    // Datos de demo para testear
    console.log('📦 Insertando datos de demo...');

    const biz = await db.query(
      `INSERT INTO businesses (name, email, password_hash, ai_persona, plan)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [
        'Zapatería Urbana',
        'demo@pulseig.com',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGnifdaByVPPkYfXHHBRZvJNv1K', // demo123
        'Sos Martín, el vendedor de Zapatería Urbana. Sos amigable, usás lenguaje argentino informal, sabés todo sobre zapatillas y cerrás ventas con facilidad. Ofrecés cuotas cuando hay dudas por precio.',
        'pro',
      ]
    );

    const bizId = biz.rows[0].id;
    console.log(`✅ Negocio demo creado (ID: ${bizId})`);

    // Productos
    const productData = [
      ['Nike Air Max 42 Negro', 'Zapatillas Nike Air Max talle 42 color negro', 120, 3],
      ['Nike Air Max 42 Blanco', 'Zapatillas Nike Air Max talle 42 color blanco', 115, 1],
      ['iPhone 14 Pro 128GB Negro', 'Smartphone Apple iPhone 14 Pro 128GB color negro', 850, 0],
      ['iPhone 14 Pro 256GB Blanco', 'Smartphone Apple iPhone 14 Pro 256GB color blanco', 920, 2],
      ['Adidas Samba 41 Negro', 'Zapatillas Adidas Samba talle 41 color negro', 98, 6],
      ['Samsung Galaxy S24', 'Smartphone Samsung Galaxy S24 256GB', 720, 2],
    ];

    for (const [name, desc, price, stock] of productData) {
      await db.query(
        `INSERT INTO products (business_id, name, description, price, stock)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
        [bizId, name, desc, price, stock]
      );
    }
    console.log('✅ Productos de demo creados');

    // Triggers
    const triggerData = [
      ['NIKE', '¡Hola! Vi que te interesó la línea Nike 👟 Te mando el catálogo completo con todos los modelos y precios ahora mismo.'],
      ['PRECIO', '¡Hola! Te paso los precios actualizados 💰 Tenemos opciones desde $98 hasta $920. ¿Qué producto te interesa más?'],
      ['IPHONE', '¡Hola! Los iPhone están disponibles 📱 Tenemos el 14 Pro con garantía oficial y hasta 12 cuotas. ¿Te mando los detalles?'],
      ['INFO', '¡Hola! Con gusto te ayudo. ¿Qué producto estás buscando? Tenemos Nike, iPhone y más con envío a todo el país 🚀'],
    ];

    for (const [keyword, response] of triggerData) {
      await db.query(
        `INSERT INTO comment_triggers (business_id, keyword, response)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [bizId, keyword, response]
      );
    }
    console.log('✅ Triggers de demo creados');

    // Contactos de demo
    const contactData = [
      ['Marcos García', 'marcosok92', 87, 'hot', ['fan Nike', 'prefiere cuotas', 'comprador frecuente'], 340, 3],
      ['Laura Sánchez', null, 64, 'warm', ['sensible al precio'], 95, 1],
      ['Pedro Ruiz', null, 71, 'warm', ['fan iPhone', 'prefiere cuotas'], 180, 2],
      ['Juan Méndez', 'juanm_ok', 92, 'hot', ['fan iPhone', 'comprador nuevo'], 0, 0],
      ['Ana Torres', 'anatorres', 38, 'cold', ['VIP inactiva', 'fan Nike'], 620, 5],
    ];

    for (const [name, ig, score, seg, tags, spent, purchases] of contactData) {
      await db.query(
        `INSERT INTO contacts (business_id, name, instagram_id, intent_score, segment, tags, total_spent, purchase_count, last_interaction)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() - INTERVAL '${Math.floor(Math.random()*5)} hours')
         ON CONFLICT DO NOTHING`,
        [bizId, name, ig || `ig_${Date.now()}_${Math.random()}`, score, seg, tags, spent, purchases]
      );
    }
    console.log('✅ Contactos de demo creados');

    console.log(`
╔══════════════════════════════════════════╗
║      Setup completado exitosamente!      ║
╠══════════════════════════════════════════╣
║  Email:     demo@pulseig.com             ║
║  Password:  demo123                      ║
║  Negocio:   Zapatería Urbana             ║
╚══════════════════════════════════════════╝
    `);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error en setup:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

setup();
