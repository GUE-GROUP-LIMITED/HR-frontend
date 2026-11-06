# GUE HR — Unified Contact Hub & Staff Operations

> Enterprise multi-site contact aggregation, triage, staff routing, and response SLA monitoring dashboard inspired by modern B2B SaaS design standards.

---

## 🚀 Overview

**GUE HR** is the central nerve center for consolidating customer, partner, candidate, and developer contact requests submitted across GUE's four core web portals:
1. **GUE Global Corporate** (`corporate.gueholdings.com`)
2. **GUE Commerce & Shop** (`store.guehub.com`)
3. **GUE Careers Portal** (`careers.guegroup.org`)
4. **GUE Developer Portal** (`developers.guehq.io`)

Built strictly to the **HR Contact Hub Project Scope & API Specification**, ready for immediate REST API consumption at `/api/v1`.

---

## 🛠 Recommended & Implemented Tech Stack

| Category | Recommended & Utilized Library | Purpose |
| :--- | :--- | :--- |
| **Framework** | **React 19 + Vite 6** | Ultra-fast HMR, optimized production tree-shaking |
| **Language** | **TypeScript (Strict mode)** | Full end-to-end type safety matching PDF models |
| **UI Components** | **Tailwind CSS + Shadcn UI Primitives** | VertexLab sleek rounded card aesthetic (`rounded-3xl`, soft shadows, crisp borders) |
| **Icons** | **Lucide React** | Clean, consistent icons across status badges and toolbars |
| **Data Fetching** | **TanStack Query (React Query v5)** | Declarative queries, mutations, cache invalidation, and optimistic updates |
| **Micro-Animations**| **GSAP (GreenSock)** | Staggered card entrance reveals, gauge meter transitions, and counter animations |
| **Charts** | **Recharts** | Activity trend area charts, responsive SVG SLA gauge meter |
| **Routing** | **React Router DOM v7** | Client-side routing with role-based navigation and query string sync |
| **API Client** | **Axios + Unified REST Service** | Bearer JWT interceptors, query parameter serialization, and instant switch between Mock & Live REST API |
| **Delight** | **Canvas Confetti** | Visual celebration on ticket resolution |

---

## 👥 Roles & Permissions Matrix (PDF Section 3 & 8)

| Action | Super Admin | HR Team | Staff Responder |
| :--- | :---: | :---: | :---: |
| **View All Messages** | ✅ Yes | ✅ Yes | ❌ Own Only |
| **Assign Messages** | ✅ Yes | ✅ Yes | ❌ No |
| **Change Status** | ✅ Yes | ✅ Yes | ✅ Own Assigned Only |
| **View All Staff & Workload** | ✅ Yes | ✅ Yes | ❌ No |
| **Monitor Staff SLA & Responses** | ✅ Yes | ✅ Yes | ❌ No |
| **Personal Responder Desk** | ✅ Yes | ✅ Yes | ✅ Yes (Own Data) |
| **Respond to Messages** | ✅ Yes | ✅ Yes | ✅ Assigned Only |
| **Register / Deactivate Staff** | ✅ Yes | ✅ Yes | ❌ No |
| **Manage Websites & Rotate Keys**| ✅ Yes | ❌ No | ❌ No |
| **Manage Categories & Routing** | ✅ Yes | ✅ Optional | ❌ No |
| **View Security Audit Logs** | ✅ Yes | ❌ No | ❌ No |

> 💡 **Quick Persona Switcher**: Use the **"Role: [ROLE]"** pill in the top navigation bar to seamlessly test all views and permissions between Super Admin (**Lucas Graham**), HR Manager (**Elena Rostova**), and Staff Responders (**Chika Nwosu**, **Sarah Davis**, **Alex Chen**).

---

## 📡 Ready to Consume API Architecture

The application is structured with a modular service layer (`src/services/api.ts`).
To target your live backend:

1. In `.env`:
   ```bash
   VITE_USE_MOCK_API=false
   VITE_API_BASE_URL=https://your-api-domain.com/api/v1
   ```
2. The Axios client automatically adds `Authorization: Bearer <JWT>` to all dashboard requests and formats requests matching PDF Section 7:
   - `POST /public/contact` (Intake with `X-Site-Key`)
   - `GET /messages` & `GET /messages/:id`
   - `PATCH /messages/:id/assign`
   - `PATCH /messages/:id/status`
   - `POST /messages/:id/notes` & `POST /messages/:id/responses`
   - `POST /messages/bulk-assign`
   - `GET /staff` & `POST /staff`
   - `GET /me/dashboard`
   - `GET /monitoring/overview`, `GET /monitoring/staff`, `GET /monitoring/overdue`
   - `POST /monitoring/staff/:id/remind`
   - `GET /websites`, `POST /websites`, `PATCH /websites/:id` (rotate key)
   - `GET /categories`, `POST /categories`, `DELETE /categories/:id`
   - `GET /audit-logs`

---

## ⚡ Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build for production
npm run build
```

---

## 🧪 Interactive Public Intake Simulator
Click the **"Simulate Message"** card in the left sidebar or the **"Test Intake API"** button in the top navigation to submit simulated contact form messages from any of the 4 websites.
The intake system tests header validation (`X-Site-Key`), triggers category routing rules, creates real-time notifications, and renders them live in the Unified Inbox!
