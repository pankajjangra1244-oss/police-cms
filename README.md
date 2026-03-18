# 🚔 Police Case Management System

An AI-powered, web-based case management system for police departments to handle complaints, investigations, and analytics efficiently.

## 🛠️ Prerequisites

Install these before running the project:

1. **Node.js v18+** — [Download](https://nodejs.org/)
2. **PostgreSQL 14+** — [Download](https://www.postgresql.org/download/)

---

## ⚡ Quick Start

### Step 1 — Set up the Database

Open **pgAdmin** or **psql** and run:

```sql
CREATE DATABASE police_cms;
```

Then connect to `police_cms` and run the schema:

```bash
psql -U postgres -d police_cms -f "d:\case management\backend\src\db\schema.sql"
```

Or paste the contents of `backend/src/db/schema.sql` into pgAdmin's query tool.

---

### Step 2 — Configure Backend Environment

Edit `backend/.env` with your PostgreSQL credentials:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/police_cms
JWT_SECRET=PoliceSecureKey2025!ChangeThis
NODE_ENV=development
```

---

### Step 3 — Install & Run Backend

```bash
cd "d:\case management\backend"
npm install
npm run dev
```

Backend runs at: **http://localhost:5000**

---

### Step 4 — Install & Run Frontend

```bash
cd "d:\case management\frontend"
npm install
npm run dev
```

Frontend runs at: **http://localhost:3000**

---

## 🔑 Default Login Credentials

| Role    | Badge Number | Password    |
|---------|-------------|-------------|
| Admin   | ADMIN001    | Admin@123   |
| Officer | OFF001      | Officer@123 |

> ⚠️ **Change passwords immediately in production!**

---

## 📱 Features

### 🗂️ Complaint Management
- Register complaints with structured fields
- Voice-to-text input (Web Speech API — Chrome/Edge required)
- OCR document scanning (Tesseract.js — no server needed)
- AI NLP autofill — extracts name, phone, date, location, type
- Status tracking: Pending → Investigating → Resolved
- Priority levels: Critical, High, Medium, Low

### 📎 Evidence Management
- Drag-and-drop file upload
- Supports: Images, Videos, Audio, PDF
- Linked to specific complaints

### 📊 Analytics Dashboard
- Monthly crime trend (line chart)
- Crime type breakdown (horizontal bar chart)
- Status distribution (pie chart)
- **Live hotspot map** (Leaflet.js — color intensity = crime density)
- AI patrol recommendations

### 🔐 Authentication
- JWT-based login (24h token)
- Role-based access: Admin (all data) / Officer (own cases)
- Secure logout

---

## 🏗️ Project Structure

```
d:\case management\
├── backend/
│   ├── src/
│   │   ├── routes/       (auth, complaints, uploads, analytics, ai)
│   │   ├── middleware/   (JWT auth)
│   │   ├── db/           (pool.js, schema.sql)
│   │   └── index.js
│   ├── uploads/          (auto-created on first upload)
│   └── package.json
└── frontend/
    ├── app/
    │   ├── login/        (Login page)
    │   └── (app)/
    │       ├── dashboard/
    │       ├── complaints/
    │       ├── evidence/
    │       ├── analytics/
    │       └── profile/
    ├── components/
    │   ├── Sidebar.tsx
    │   └── HotspotMap.tsx
    └── lib/
        └── api.ts        (Axios API client)
```

---

## 🚀 Deployment

### Frontend → Vercel
```bash
cd frontend
npm run build
# Connect GitHub repo to Vercel, set NEXT_PUBLIC_API_URL env var
```

### Backend → Render/Railway
- Set `DATABASE_URL` to your hosted PostgreSQL (Supabase/Neon)
- Set `JWT_SECRET` to a strong secret
- Set `NODE_ENV=production`

---

## 🤖 AI Features (No API Key Required)

| Feature | Technology | Notes |
|---------|-----------|-------|
| Voice Input | Web Speech API | Chrome/Edge only |
| OCR Scanning | Tesseract.js | Runs in browser |
| NLP Extraction | Custom regex NLP | Backend `/api/ai/extract` |
| Patrol Insights | Query-based AI | Backend `/api/analytics/ai-insights` |

---

## 📡 API Endpoints

```
POST /api/auth/login          — Login
GET  /api/auth/me             — Current user
GET  /api/complaints          — List (filter, search, paginate)
POST /api/complaints          — Create
PUT  /api/complaints/:id      — Update status/details
POST /api/uploads/:id         — Upload evidence files
GET  /api/analytics/summary   — Stats overview
GET  /api/analytics/hotspots  — Map data
GET  /api/analytics/ai-insights — AI patrol recommendations
POST /api/ai/extract          — NLP text extraction
```
