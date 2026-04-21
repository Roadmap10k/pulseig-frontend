# PulseIG — Guía Completa de Instalación y Configuración

## ¿Qué es esto?

PulseIG es un CRM de ventas con IA para negocios que venden por Instagram, Facebook Marketplace y WhatsApp.

Este repositorio contiene:
- **pulseig-backend** → API en Node.js + PostgreSQL
- **pulseig-frontend** → Dashboard en React + TypeScript

---

## Arquitectura

```
[Instagram / Meta]
       │
       │ Webhooks
       ▼
[Backend Node.js :3001]
  ├── Express API REST
  ├── Claude API (IA de ventas)
  ├── PostgreSQL (datos)
  └── Sistema de scoring

[Frontend React :3000]
  ├── Bandeja unificada
  ├── CRM de contactos
  ├── Stock + wishlist
  ├── Triggers de comentarios
  └── Dashboard de ROI
```

---

## PASO 1 — Cuentas que necesitás crear

### 1A. Anthropic (Claude API) — LA IA
1. Entrá a https://console.anthropic.com
2. Creá una cuenta
3. Ir a "API Keys" → "Create Key"
4. Guardá la key (empieza con `sk-ant-...`)
5. Costo: ~$5-20/mes con volumen normal de MVP

### 1B. PostgreSQL — La base de datos
**Opción fácil (cloud gratis):**
1. Entrá a https://railway.app
2. Creá cuenta con GitHub
3. "New Project" → "Database" → "PostgreSQL"
4. Copiá el `DATABASE_URL` que te da Railway

**Opción local (para desarrollar):**
```bash
# Mac
brew install postgresql
brew services start postgresql
createdb pulseig

# Ubuntu/Linux
sudo apt install postgresql
sudo -u postgres createdb pulseig

# Windows
# Descargar instalador de https://www.postgresql.org/download/windows/
```

### 1C. Meta Developer App — Para Instagram real
*(Podés saltear esto para las primeras pruebas — el sistema funciona en modo simulado)*

1. Ir a https://developers.facebook.com
2. "Mis Apps" → "Crear App"
3. Tipo: "Business"
4. Agregar producto: "Instagram Graph API"
5. Necesitás una Página de Facebook conectada a una cuenta de Instagram Business
6. Obtener: `META_APP_ID`, `META_APP_SECRET`

---

## PASO 2 — Configurar el Backend

### 2A. Instalar dependencias
```bash
cd pulseig-backend
npm install
```

### 2B. Configurar variables de entorno
```bash
cp .env.example .env
```

Abrí el archivo `.env` y completá:

```env
# BASE DE DATOS (obligatorio)
DATABASE_URL=postgresql://postgres:password@localhost:5432/pulseig

# IA — Claude API (sin esto funciona en modo simulado)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx

# META (opcional para las primeras pruebas)
META_APP_ID=123456789
META_APP_SECRET=abc123
META_WEBHOOK_VERIFY_TOKEN=pulseig_webhook_secret_2026

# AUTH (cambiar en producción)
JWT_SECRET=pulseig_jwt_secret_cambiame

# SERVER
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 2C. Crear tablas y datos de demo
```bash
npm run setup-db
```

Esto crea todas las tablas y carga datos de demo:
- Email: `demo@pulseig.com`
- Password: `demo123`
- Negocio: Zapatería Urbana (con 6 productos, 5 contactos, 4 triggers)

### 2D. Arrancar el backend
```bash
npm run dev    # desarrollo (se reinicia automáticamente)
# o
npm start      # producción
```

Deberías ver:
```
╔══════════════════════════════════════════╗
║         PulseIG API v1.0.0               ║
╠══════════════════════════════════════════╣
║  Puerto:   3001                          ║
║  Modo:     LIVE (Claude API)             ║
║  DB:       PostgreSQL                    ║
╚══════════════════════════════════════════╝
```

Si no tenés API key de Anthropic, dice `SIMULADO` — funciona igual pero la IA responde mensajes genéricos.

---

## PASO 3 — Configurar el Frontend

### 3A. Instalar dependencias
```bash
cd pulseig-frontend
npm install
```

### 3B. Configurar la URL del backend
```bash
# El archivo .env ya está creado con el valor correcto para desarrollo local
# Si tu backend está en otro servidor, cambiar REACT_APP_API_URL
cat .env
# REACT_APP_API_URL=http://localhost:3001/api
```

### 3C. Arrancar el frontend
```bash
npm start
```

Abre automáticamente http://localhost:3000

### 3D. Ingresar al dashboard
- Email: `demo@pulseig.com`
- Password: `demo123`

---

## PASO 4 — Testear sin Instagram real

El sistema tiene un endpoint para simular mensajes entrantes:

```bash
# Primero obtener el business_id logueándote:
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@pulseig.com","password":"demo123"}'

# Guardar el token y el business.id de la respuesta
# Luego simular un mensaje:

curl -X POST http://localhost:3001/api/webhook/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "business_id": "EL_ID_QUE_TE_DIO_EL_LOGIN",
    "sender_id": "cliente_test_001",
    "message": "Hola! tienen Nike Air Max en talle 42?"
  }'
```

El sistema va a:
1. Crear el contacto automáticamente
2. Procesar el mensaje
3. Generar una respuesta con IA (o simulada)
4. Guardar todo en la base de datos
5. Mostrarlo en el dashboard

---

## PASO 5 — Conectar Instagram real

Una vez que tengas la Meta Developer App configurada:

### 5A. Registrar el webhook en Meta
En tu app de Meta → Instagram → Webhooks:
- Callback URL: `https://TU_DOMINIO/api/webhook/instagram`
- Verify Token: el valor de `META_WEBHOOK_VERIFY_TOKEN` en tu `.env`
- Suscribir a: `messages`, `comments`, `mentions`

### 5B. Conectar la cuenta del negocio
```bash
curl -X PATCH http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer TU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instagram_id": "EL_IG_USER_ID",
    "page_id": "EL_PAGE_ID",
    "access_token": "EL_ACCESS_TOKEN_DE_META"
  }'
```

Para obtener estos valores, usar el Graph API Explorer en developers.facebook.com.

---

## PASO 6 — Deploy en producción (Railway)

### Backend
1. Ir a https://railway.app
2. "New Project" → "Deploy from GitHub"
3. Conectar tu repositorio
4. Railway detecta Node.js automáticamente
5. Agregar PostgreSQL: "New" → "Database" → "PostgreSQL"
6. Configurar variables de entorno en Railway (las mismas del `.env`)
7. Railway genera una URL pública: `https://pulseig-backend.up.railway.app`

### Frontend
1. En el mismo proyecto de Railway: "New" → "GitHub Repo" → tu frontend
2. O usar Vercel: https://vercel.com → "Import Project"
3. Cambiar `REACT_APP_API_URL` a la URL del backend en Railway

---

## Estructura de archivos

```
pulseig-backend/
├── src/
│   ├── server.js              ← Punto de entrada
│   ├── db/
│   │   ├── index.js           ← Conexión PostgreSQL
│   │   ├── schema.sql         ← Todas las tablas
│   │   └── setup.js           ← Setup + datos de demo
│   ├── services/
│   │   ├── ai.service.js      ← Claude API + simulación
│   │   ├── score.service.js   ← Sistema de scoring
│   │   └── meta.service.js    ← Webhooks de Instagram
│   ├── routes/
│   │   ├── auth.routes.js     ← Login / registro
│   │   ├── webhook.routes.js  ← Eventos de Meta
│   │   ├── conversations.routes.js
│   │   └── resources.routes.js ← Contactos, productos, triggers, dashboard
│   └── middleware/
│       └── auth.js            ← JWT middleware
├── .env.example
└── README.md

pulseig-frontend/
├── src/
│   ├── App.tsx                ← Router principal
│   ├── api/index.ts           ← Cliente HTTP (axios)
│   ├── store/index.ts         ← Estado global (Zustand)
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── InboxPage.tsx      ← Bandeja de conversaciones
│   │   ├── DashboardPage.tsx  ← ROI Dashboard
│   │   └── ResourcePages.tsx  ← Contactos, Stock, Triggers
│   └── components/
│       └── layout/Layout.tsx  ← Topbar + Sidebar
└── .env
```

---

## Costos operativos estimados

| Servicio | Plan | Costo |
|---|---|---|
| Railway (backend + DB) | Starter | $5/mes |
| Anthropic Claude API | Por uso | $10-50/mes |
| Vercel (frontend) | Free | $0 |
| **Total** | | **$15-55/mes** |

Con 5 clientes pagando $300/mes = **$1,500/mes de ingresos**.
Costo operativo: **$55/mes máximo**.
**Margen: 96%.**

---

## Próximos pasos para V2

- [ ] Integración con Tiendanube (API oficial disponible)
- [ ] WhatsApp Business API
- [ ] Pixel de rastreo web propio
- [ ] Sistema de campañas de re-engagement con aprobación por WhatsApp
- [ ] App mobile (React Native con el mismo backend)
- [ ] Multi-cuenta (un negocio, varias cuentas de Instagram)

---

## Soporte

Si hay algún error en el setup, los pasos más comunes a revisar:
1. PostgreSQL corriendo y accesible con la DATABASE_URL
2. Node.js versión 18 o superior (`node --version`)
3. Puerto 3001 libre en tu máquina
4. Variables de entorno guardadas correctamente en el `.env`
