const Anthropic = require('@anthropic-ai/sdk');

let anthropic = null;

// Si no hay API key, usamos modo simulado para desarrollo
const initClient = () => {
  if (process.env.ANTHROPIC_API_KEY && !anthropic) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
};

// ─── Respuestas simuladas para desarrollo sin API key ────────
const SIMULATED_RESPONSES = [
  '¡Hola! Gracias por escribirnos. ¿En qué te puedo ayudar hoy?',
  'Claro que sí, tenemos ese producto disponible. ¿Te cuento más detalles?',
  'Perfecto, te lo reservo ahora mismo. ¿Cómo preferís pagar: efectivo, transferencia o cuotas?',
  'Entiendo tu consulta. Déjame chequearlo y te respondo enseguida.',
  '¡Excelente elección! ¿Querés que te mande el link de pago ahora?',
];

const getSimulatedResponse = () =>
  SIMULATED_RESPONSES[Math.floor(Math.random() * SIMULATED_RESPONSES.length)];

// ─── Construir el system prompt para cada negocio ────────────
const buildSystemPrompt = (business, contact, products) => {
  const productList = products.length > 0
    ? products.map(p =>
        `- ${p.name}: $${p.price} (stock: ${p.stock > 0 ? p.stock + ' unidades' : 'SIN STOCK'})`
      ).join('\n')
    : 'No hay productos cargados aún.';

  const contactContext = contact
    ? `
INFORMACIÓN DEL CLIENTE:
- Nombre: ${contact.name || 'Desconocido'}
- Score de intención: ${contact.intent_score}/100
- Segmento: ${contact.segment}
- Compras anteriores: ${contact.purchase_count} por $${contact.total_spent}
- Tags: ${contact.tags?.join(', ') || 'ninguno'}
- Preferencias: ${JSON.stringify(contact.preferences || {})}
`
    : '';

  return `Sos el asistente de ventas de "${business.name}".

PERSONALIDAD Y TONO:
${business.ai_persona}

CATÁLOGO ACTUAL:
${productList}
${contactContext}

REGLAS IMPORTANTES:
1. Respondé siempre en el idioma del cliente (español argentino preferido).
2. Si preguntan por stock que no hay, ofrecé anotarlos en lista de espera.
3. Si el precio es la objeción, ofrecé cuotas con Mercado Pago.
4. Si mostraron interés alto (3+ preguntas), pedí el WhatsApp.
5. Nunca inventes precios ni productos que no están en el catálogo.
6. Cuando cerrés una venta, terminá el mensaje con [VENTA_CERRADA:monto].
7. Cuando el cliente da su WhatsApp, terminá con [WHATSAPP:numero].
8. Sé conciso — máximo 3 oraciones por mensaje.
9. Usá emojis con moderación (1-2 por mensaje máximo).`;
};

// ─── Función principal: generar respuesta ────────────────────
const generateResponse = async ({ business, contact, products, conversationHistory }) => {
  initClient();

  // Modo simulado si no hay API key
  if (!anthropic) {
    console.log('[AI] Modo simulado — sin API key de Anthropic');
    await new Promise(r => setTimeout(r, 800)); // simular latencia
    return {
      text: getSimulatedResponse(),
      simulated: true,
    };
  }

  try {
    const systemPrompt = buildSystemPrompt(business, contact, products);
    const messages = conversationHistory.map(m => ({
      role: m.sender === 'contact' ? 'user' : 'assistant',
      content: m.content,
    }));

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages,
    });

    const text = response.content[0].text;
    return { text, simulated: false };

  } catch (err) {
    console.error('[AI] Error calling Claude API:', err.message);
    return { text: getSimulatedResponse(), simulated: true, error: err.message };
  }
};

// ─── Generar mensaje de re-engagement ────────────────────────
const generateReengagementMessage = async ({ business, contact, lastProduct }) => {
  initClient();

  if (!anthropic) {
    return {
      text: `Hola ${contact.name || 'ahí'}! Hace tiempo que no hablamos. Tenemos novedades que te pueden interesar. ¿Te cuento?`,
      simulated: true,
    };
  }

  try {
    const prompt = `Generá un mensaje de re-engagement personalizado para este cliente de ${business.name}.

Cliente: ${contact.name || 'Cliente'}
Días sin contacto: ${contact.days_inactive || 30}
Tags/preferencias: ${contact.tags?.join(', ') || 'ninguna'}
Último producto consultado: ${lastProduct?.name || 'desconocido'}
Historial: ${contact.purchase_count} compras por $${contact.total_spent}

El mensaje debe:
- Ser casual y amigable, no de ventas agresivo
- Mencionar algo específico de su historial
- Tener máximo 2-3 oraciones
- Terminar con una pregunta abierta
- Sonar como si lo escribió una persona real`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    return { text: response.content[0].text, simulated: false };
  } catch (err) {
    return {
      text: `Hola ${contact.name}! Hace tiempo que no hablamos. Tenemos novedades en ${business.name} que te pueden interesar. ¿Te cuento?`,
      simulated: true,
    };
  }
};

// ─── Analizar conversación para insights ─────────────────────
const analyzeConversations = async ({ business, conversations }) => {
  initClient();

  if (!anthropic || conversations.length === 0) {
    return {
      insights: [
        { type: 'objection', text: 'Los clientes preguntan mucho por cuotas', priority: 'high' },
        { type: 'timing', text: 'Mayor actividad los sábados por la tarde', priority: 'medium' },
        { type: 'product', text: 'Nike es la línea más consultada', priority: 'high' },
      ],
      simulated: true,
    };
  }

  try {
    const sample = conversations.slice(0, 20).map(c =>
      c.messages?.map(m => `${m.sender}: ${m.content}`).join('\n')
    ).join('\n---\n');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `Analizá estas conversaciones de ventas de ${business.name} y devolvé un JSON con insights:

${sample}

Devolvé SOLO un JSON válido con este formato:
{
  "insights": [
    { "type": "objection|timing|product|opportunity", "text": "descripción", "priority": "high|medium|low" }
  ],
  "top_objection": "texto",
  "best_closing_message": "texto",
  "recommended_action": "texto"
}`,
      }],
    });

    const raw = response.content[0].text.replace(/```json|```/g, '').trim();
    return { ...JSON.parse(raw), simulated: false };
  } catch (err) {
    return {
      insights: [{ type: 'error', text: 'No se pudo analizar', priority: 'low' }],
      simulated: true,
    };
  }
};

// ─── Extraer datos del cliente de una conversación ───────────
const extractContactData = (messageText) => {
  const extracted = {};

  // WhatsApp
  const waMatch = messageText.match(/(?:\+54|54)?(?:\s?9)?\s?(?:11|[2-9]\d{2,3})\s?\d{4}[\s-]?\d{4}/);
  if (waMatch) extracted.whatsapp = waMatch[0].replace(/\s|-/g, '');

  // Email
  const emailMatch = messageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) extracted.email = emailMatch[0];

  // Talle/size
  const talleMatch = messageText.match(/talle\s?(\d{2}|[SMLX]{1,3})/i);
  if (talleMatch) extracted.size = talleMatch[1];

  return extracted;
};

// ─── Detectar intención de venta cerrada ─────────────────────
const detectSale = (aiResponse) => {
  const match = aiResponse.match(/\[VENTA_CERRADA:(\d+(?:\.\d+)?)\]/);
  if (match) return parseFloat(match[1]);
  return null;
};

// ─── Detectar WhatsApp compartido ────────────────────────────
const detectWhatsApp = (aiResponse) => {
  const match = aiResponse.match(/\[WHATSAPP:([^\]]+)\]/);
  if (match) return match[1];
  return null;
};

module.exports = {
  generateResponse,
  generateReengagementMessage,
  analyzeConversations,
  extractContactData,
  detectSale,
  detectWhatsApp,
};
