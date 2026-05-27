# Zest — Food Delivery Frontend (Member 6)

Vite + React + TypeScript frontend for the food delivery app.
Aurora aesthetic: soft blue / pink / purple glassmorphism theme.

## Quick Start

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
# → http://localhost:5173
```

Use the **"Continue with Demo"** button on the login page to skip auth.

---

## Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/login` | Login | JWT auth, demo shortcut |
| `/register` | Register | Customer or restaurant role |
| `/dashboard` | Dashboard | Stats, recent orders, quick picks |
| `/restaurants` | Browse | Search, filter, sort restaurants |
| `/restaurants/:id` | Detail | Menu + cart + checkout |
| `/orders` | History | All orders with status filter |
| `/track/:orderId` | Live Tracking | WebSocket progress + SSE audit log |

---

## Architecture

```
src/
├── context/
│   ├── AuthContext.tsx      ← JWT auth (Member 1 integration)
│   └── ToastContext.tsx     ← Global toast notifications
├── hooks/
│   ├── useWebSocket.ts      ← Live order updates (Member 4 integration)
│   └── useSSE.ts            ← Audit log stream (Member 5 integration)
├── services/
│   └── graphql.ts           ← GraphQL queries (Member 2 integration)
├── pages/
│   ├── AuthPages.tsx        ← Login + Register
│   ├── DashboardPage.tsx
│   ├── RestaurantsPage.tsx
│   ├── RestaurantDetailPage.tsx
│   ├── OrderHistoryPage.tsx
│   └── OrderTrackingPage.tsx
├── components/
│   └── Sidebar.tsx
├── App.tsx                  ← Router + protected routes
└── index.css                ← Aurora design system
```

---

## Integration Guide

All mock flags are in `.env.local`. Switch `VITE_USE_MOCK=false` and set the real URLs when each member's backend is ready.

### Member 1 (Auth)
`AuthContext.tsx` calls `POST /auth/login` and `POST /auth/register`.
Update `VITE_API_URL` to point to their server.

### Member 2 (CRUD / GraphQL)
`graphql.ts` has ready-made queries for restaurants, menus, orders.
Update `VITE_GRAPHQL_URL`.

### Member 4 (WebSocket)
`useWebSocket.ts` — set `useMock: false` in `OrderTrackingPage.tsx` and update `VITE_WS_URL`.
Expected event format:
```json
{ "orderId": "...", "status": "preparing", "message": "...", "timestamp": "..." }
```

### Member 5 (SSE / Audit)
`useSSE.ts` — set `useMock: false` and update `VITE_SSE_URL`.
Expected SSE data format:
```json
{ "id": "...", "orderId": "...", "action": "ORDER_CREATED", "actor": "...", "actorRole": "system", "details": "...", "timestamp": "..." }
```

---

## Build for Production

```bash
npm run build
# Output in dist/
npm run preview  # preview the build locally
```

For deployment: serve the `dist/` folder from any static host (Vercel, Netlify, nginx).
