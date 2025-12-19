# SuperDoc Collaborative Editor

A real-time collaborative document editor using SuperDoc and Y.js with PostgreSQL persistence.

## Features

- Real-time collaboration with multiple users
- User presence (see who's editing)
- Document persistence in PostgreSQL
- WebSocket synchronization using Y.js

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────►│   Backend    │────►│  PostgreSQL  │
│ (Vue + Vite) │ WS  │  (Fastify)   │     │   Database   │
└──────────────┘     └──────────────┘     └──────────────┘
```

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL (local or Docker)

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   # Server
   cp server/.env.example server/.env
   # Edit server/.env with your PostgreSQL connection string

   # Client
   cp client/.env.example client/.env
   ```

3. **Start development servers:**
   ```bash
   npm run dev
   ```

   - Server: http://localhost:3050
   - Client: http://localhost:5173

4. **Test collaboration:**
   Open http://localhost:5173/doc/test-doc in multiple browser tabs

## Deployment to Render

### 1. Create PostgreSQL Database

1. Go to [render.com](https://render.com) → Dashboard
2. Click **New** → **PostgreSQL**
3. Configure:
   - Name: `superdoc-db`
   - Plan: Free (or Starter for production)
4. Copy the **Internal Database URL**

### 2. Deploy Backend (Web Service)

1. Click **New** → **Web Service**
2. Connect your GitHub repo
3. Configure:
   | Setting | Value |
   |---------|-------|
   | Name | `superdoc-backend` |
   | Root Directory | `server` |
   | Build Command | `npm install && npm run build` |
   | Start Command | `npm start` |

4. Add Environment Variables:
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | (Internal Database URL) |
   | `NODE_ENV` | `production` |
   | `FRONTEND_URL` | `https://superdoc-frontend.onrender.com` |

### 3. Deploy Frontend (Static Site)

1. Click **New** → **Static Site**
2. Connect same GitHub repo
3. Configure:
   | Setting | Value |
   |---------|-------|
   | Name | `superdoc-frontend` |
   | Root Directory | `client` |
   | Build Command | `npm install && npm run build` |
   | Publish Directory | `dist` |

4. Add Environment Variables:
   | Key | Value |
   |-----|-------|
   | `VITE_WS_URL` | `wss://superdoc-backend.onrender.com` |
   | `VITE_API_URL` | `https://superdoc-backend.onrender.com` |

## Usage

Share document URLs with your team:
```
https://your-frontend.onrender.com/doc/my-document-id
```

Each unique document ID creates a separate collaborative document.

## Project Structure

```
superdoc-collab/
├── server/
│   ├── index.ts          # Fastify server + WebSocket
│   ├── storage.ts        # PostgreSQL persistence
│   └── userGenerator.ts  # Random user names
├── client/
│   ├── src/
│   │   ├── DocumentEditor.vue  # Main editor component
│   │   └── router.js           # Vue Router config
│   └── public/
│       └── default.docx        # Default document template
└── package.json
```

## License

See SuperDoc repository for license information.
