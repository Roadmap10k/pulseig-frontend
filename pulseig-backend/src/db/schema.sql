-- ═══════════════════════════════════════════
-- PULSEIG — SCHEMA COMPLETO
-- ═══════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── NEGOCIOS (clientes de PulseIG) ─────────────────────────
CREATE TABLE IF NOT EXISTS businesses (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              VARCHAR(255) NOT NULL,
  email             VARCHAR(255) UNIQUE NOT NULL,
  password_hash     TEXT NOT NULL,
  instagram_id      VARCHAR(100) UNIQUE,
  instagram_handle  VARCHAR(100),
  page_id           VARCHAR(100),
  access_token      TEXT,
  ai_persona        TEXT DEFAULT 'Sos un vendedor amigable y profesional. Respondés de forma clara, concisa y siempre orientado a cerrar la venta.',
  plan              VARCHAR(20) DEFAULT 'starter' CHECK (plan IN ('starter','growth','pro')),
  active            BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CONTACTOS (clientes del negocio) ───────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id       UUID REFERENCES businesses(id) ON DELETE CASCADE,
  instagram_id      VARCHAR(100),
  instagram_handle  VARCHAR(100),
  messenger_id      VARCHAR(100),
  whatsapp          VARCHAR(30),
  email             VARCHAR(255),
  name              VARCHAR(255),
  birthday          DATE,
  city              VARCHAR(100),
  size              VARCHAR(20),
  intent_score      INTEGER DEFAULT 0 CHECK (intent_score >= 0 AND intent_score <= 100),
  segment           VARCHAR(20) DEFAULT 'cold' CHECK (segment IN ('hot','warm','cold','inactive')),
  tags              TEXT[] DEFAULT '{}',
  preferences       JSONB DEFAULT '{}',
  total_spent       DECIMAL(10,2) DEFAULT 0,
  purchase_count    INTEGER DEFAULT 0,
  last_interaction  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, instagram_id),
  UNIQUE(business_id, messenger_id)
);

-- ─── CONVERSACIONES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id       UUID REFERENCES businesses(id) ON DELETE CASCADE,
  contact_id        UUID REFERENCES contacts(id) ON DELETE CASCADE,
  channel           VARCHAR(20) NOT NULL CHECK (channel IN ('instagram','marketplace','messenger','whatsapp')),
  status            VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','ai_handling','waiting','closed')),
  ai_enabled        BOOLEAN DEFAULT true,
  last_message_at   TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MENSAJES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id   UUID REFERENCES conversations(id) ON DELETE CASCADE,
  business_id       UUID REFERENCES businesses(id) ON DELETE CASCADE,
  sender            VARCHAR(20) NOT NULL CHECK (sender IN ('contact','business','ai')),
  content           TEXT NOT NULL,
  meta_message_id   VARCHAR(200),
  sent_by_ai        BOOLEAN DEFAULT false,
  read              BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PRODUCTOS / STOCK ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id       UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name              VARCHAR(255) NOT NULL,
  description       TEXT,
  price             DECIMAL(10,2) NOT NULL,
  stock             INTEGER DEFAULT 0,
  stock_min         INTEGER DEFAULT 2,
  variants          JSONB DEFAULT '{}',
  images            TEXT[] DEFAULT '{}',
  active            BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── WISHLIST ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlists (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id       UUID REFERENCES businesses(id) ON DELETE CASCADE,
  contact_id        UUID REFERENCES contacts(id) ON DELETE CASCADE,
  product_id        UUID REFERENCES products(id) ON DELETE CASCADE,
  notified          BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, product_id)
);

-- ─── VENTAS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id       UUID REFERENCES businesses(id) ON DELETE CASCADE,
  contact_id        UUID REFERENCES contacts(id),
  product_id        UUID REFERENCES products(id),
  conversation_id   UUID REFERENCES conversations(id),
  amount            DECIMAL(10,2) NOT NULL,
  channel           VARCHAR(20),
  closed_by_ai      BOOLEAN DEFAULT false,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TRIGGERS DE COMENTARIOS ────────────────────────────────
CREATE TABLE IF NOT EXISTS comment_triggers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id       UUID REFERENCES businesses(id) ON DELETE CASCADE,
  keyword           VARCHAR(100) NOT NULL,
  response          TEXT NOT NULL,
  active            BOOLEAN DEFAULT true,
  activations       INTEGER DEFAULT 0,
  conversions       INTEGER DEFAULT 0,
  revenue           DECIMAL(10,2) DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── EVENTOS DE SCORE ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS score_events (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id       UUID REFERENCES businesses(id) ON DELETE CASCADE,
  contact_id        UUID REFERENCES contacts(id) ON DELETE CASCADE,
  event_type        VARCHAR(50) NOT NULL,
  points            INTEGER NOT NULL,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ÍNDICES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_contacts_business     ON contacts(business_id);
CREATE INDEX IF NOT EXISTS idx_contacts_score        ON contacts(intent_score DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_segment      ON contacts(segment);
CREATE INDEX IF NOT EXISTS idx_conversations_biz     ON conversations(business_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status  ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_messages_conv         ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created      ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_business     ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_business        ON sales(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_created         ON sales(created_at DESC);

-- ─── FUNCIÓN: actualizar updated_at automáticamente ─────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_businesses_updated BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_contacts_updated BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
