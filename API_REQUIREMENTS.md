# HR Frontend API Requirements

This document lists the REST endpoints the HR frontend needs from the HR Contact Hub backend.

- **Default base URL:** `https://hr-backend-emp1.onrender.com/api/v1`
- **Auth:** authenticated endpoints require `Authorization: Bearer <access_token>`
- **Public intake:** `POST /public/contact` requires `X-Site-Key`
- **Success envelope:** `{ "data": ..., "meta"?: { "page", "limit", "total", "totalPages"? } }`
- **Error envelope:** `{ "error": { "code", "message", "fields"? } }`

## Implemented endpoints used by the frontend

### Auth

| Method | Endpoint | Request | Notes |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | `{ email, password }` | Returns `{ access_token, refresh_token, user }` |
| `POST` | `/auth/refresh` | `{ refresh_token }` | Returns `{ access_token, refresh_token?, user? }` |
| `POST` | `/auth/logout` | — | Revokes refresh token / signs out |
| `POST` | `/auth/forgot-password` | `{ email }` | Always returns generic success |
| `POST` | `/auth/reset-password` | `{ token, new_password }` | `new_password` min 8 chars |
| `GET` | `/auth/me` | — | Returns current backend user |

### Messages

| Method | Endpoint | Request / Query | Notes |
| --- | --- | --- | --- |
| `GET` | `/messages` | `website_id`, `status`, `category_id`, `assigned_to`, `from`, `to`, `q`, `page`, `limit` | `assigned_to=unassigned` is filtered client-side today |
| `GET` | `/messages/stats` | — | Implemented in backend; not currently used by frontend |
| `GET` | `/messages/:id` | — | Returns message detail with history |
| `PATCH` | `/messages/:id/assign` | `{ assigned_to }` | Staff ID or `null` |
| `POST` | `/messages/bulk-assign` | `{ message_ids: string[], assigned_to }` | Max 100 IDs |
| `PATCH` | `/messages/:id/status` | `{ status }` | e.g. `new`, `in_progress`, `resolved`, `closed` |
| `PATCH` | `/messages/:id/category` | `{ category_id }` | |
| `POST` | `/messages/:id/notes` | `{ note }` | Internal note |
| `POST` | `/messages/:id/responses` | `{ body, send_to_sender }` | Queues email when `send_to_sender=true` |
| `GET` | `/messages/:id/responses` | — | Implemented in backend |

### Staff

| Method | Endpoint | Request / Query | Notes |
| --- | --- | --- | --- |
| `GET` | `/staff` | `q`, `department`, `category_id`, `is_active` | Staff/responder profiles |
| `POST` | `/staff` | `{ name, email, phone?, department, category_ids }` | Creates staff profile |
| `GET` | `/staff/:id` | — | Staff detail |
| `PATCH` | `/staff/:id` | `{ name?, email?, phone?, department?, category_ids? }` | Profile update |
| `PATCH` | `/staff/:id/status` | `{ is_active }` | Activate/deactivate |

### Self-service responder endpoints

| Method | Endpoint | Notes |
| --- | --- | --- |
| `GET` | `/me/dashboard` | Responder dashboard summary |
| `GET` | `/me/messages` | Assigned messages for current user |
| `GET` | `/me/responses` | Response history for current user |
| `GET` | `/me/performance` | Implemented in backend |

### Monitoring

| Method | Endpoint | Request / Query | Notes |
| --- | --- | --- | --- |
| `GET` | `/monitoring/overview` | `from`, `to` | Dashboard stats |
| `GET` | `/monitoring/staff` | — | Per-staff performance |
| `GET` | `/monitoring/staff/:id` | — | Implemented in backend; not currently used by frontend |
| `POST` | `/monitoring/staff/:id/remind` | `{ message_id?, note? }` | Sends reminder |
| `GET` | `/monitoring/responses` | `from`, `to`, `website_id`, `staff_id`, `page`, `limit` | Response feed |
| `GET` | `/monitoring/overdue` | — | Overdue unanswered messages |
| `GET` | `/monitoring/export` | — | Implemented in backend; frontend currently exports client-side |

### Websites

| Method | Endpoint | Request | Notes |
| --- | --- | --- | --- |
| `GET` | `/websites` | — | Website list |
| `POST` | `/websites` | `{ name, domain }` | Returns raw `site_key` once |
| `PATCH` | `/websites/:id` | `{ rotate_key: true }` or profile fields | Key rotation returns raw `site_key` once |

### Categories

| Method | Endpoint | Request | Notes |
| --- | --- | --- | --- |
| `GET` | `/categories` | — | Category list |
| `POST` | `/categories` | `{ name, default_assignee_id? }` | |
| `PATCH` | `/categories/:id` | `{ name?, default_assignee_id? }` | |
| `DELETE` | `/categories/:id` | — | |

### Users / Admin

| Method | Endpoint | Request | Notes |
| --- | --- | --- | --- |
| `GET` | `/users` | `role`, `page`, `limit` | HR/Admin user management |
| `POST` | `/users` | `{ name, email, role }` | `role`: `super_admin`, `hr`, `staff` |
| `PATCH` | `/users/:id` | `{ name?, role? }` | |
| `PATCH` | `/users/:id/status` | `{ is_active }` | |
| `GET` | `/audit-logs` | `page`, `limit` | Super Admin only |

### Notifications

| Method | Endpoint | Notes |
| --- | --- | --- |
| `GET` | `/notifications` | `page`, `limit` |
| `PATCH` | `/notifications/:id/read` | Mark one notification read |

### Public contact intake

| Method | Endpoint | Request | Notes |
| --- | --- | --- | --- |
| `POST` | `/public/contact` | `{ name, email, phone?, subject, message, category?, website_url? }` | Requires `X-Site-Key`; `website_url` is honeypot |

## Missing endpoints required for full frontend parity

### 1. Non-public message sources

The unified inbox currently supports only public website messages in backend mode. To support internal and external requests, add one of:

- `POST /messages/internal-requests`
  - Body: `{ category_id, target_unit_id, assignee_id, subject, message }`
  - Returns: `{ message_id, status }`
- `POST /messages/external-requests`
  - Body: `{ category_id, organization_name, contact_name?, contact_email?, subject, message }`
  - Returns: `{ message_id, status }`

Or extend `POST /public/contact` with `source_type: "internal" | "external"` and the fields above.

### 2. Staff lifecycle and extended profile fields

The frontend staff screens expect fields and actions beyond the current backend staff schema.

- `PATCH /staff/:id` should accept extended fields:
  - `job_title`
  - `company_id`
  - `unit_id`
  - `work_location`
  - `date_of_birth`
  - `hire_date`
  - `employment_type`
  - `manager_id`
  - `access_scopes`
- `POST /staff/:id/transfer`
  - Body: `{ company_id, unit_id, work_location, department, job_title?, effective_date, reason }`
  - Returns: `{ staff, email_status, letter_text }`
- `POST /staff/:id/termination-requests`
  - Body: `{ reason }`
  - Returns: `StaffTerminationRequest`
- `GET /staff/termination-requests`
  - Query: `status`, `staff_id`, `page`, `limit`
- `POST /staff/termination-requests/:id/decision`
  - Body: `{ decision: "approved" | "rejected", note? }`
- `POST /staff/:id/promote`
  - Body: `{ new_job_title, effective_date, reason }`
  - Returns: updated staff/user

### 3. Category metadata

Categories currently support only `name` and `default_assignee_id`. If the admin UI should keep description/audience/routing metadata, extend category payloads with:

- `description`
- `audience`
- `keywords` or routing rules

### 4. Notification convenience endpoint

Optional but useful:

- `POST /notifications/read-all`

The frontend currently marks all notifications read by calling `PATCH /notifications/:id/read` for each unread item.

## Demo-only modules hidden in backend mode

These modules are intentionally hidden when `VITE_USE_MOCK_API=false`. If they should become live backend features, the backend needs the following endpoint families.

### Meetings & events

- `GET /meetings` — scoped to the current user
- `POST /meetings` — body: `{ kind, title, description, starts_at, ends_at, location?, audience, invitee_ids?, include_branch_managers?, higher_invite_reason? }`
  - Returns: `{ meeting, notified_user_ids }`
- `PATCH /meetings/:id/response` — body: `{ response: "accepted" | "declined" }`

### Recruitment & onboarding

- `GET /recruitment` — returns openings and applications
- `POST /recruitment/applications` — `{ opening_id, candidate_name, candidate_email }`
- `PATCH /recruitment/applications/:id/screening`
- `POST /recruitment/applications/:id/interviews` — `{ scheduled_at, interviewer }`
- `PATCH /recruitment/applications/:id/interviews/evaluation` — `{ rating, feedback }`
- `POST /recruitment/applications/:id/offers`
- `PATCH /recruitment/applications/:id/rejection` — `{ reason }`
- `PATCH /recruitment/applications/:id/offer-response` — `{ response: "accepted" | "declined" }`
- `PATCH /recruitment/applications/:id/onboarding-tasks/:taskId` — `{ is_complete }`

### Point of Sale

- `GET /pos/dashboard` — outlet-scoped dashboard for the actor
- `POST /pos/sales` — creates a sale and returns receipt data

### Web orders

- `GET /web-orders` — outlet-scoped web order dashboard
- Payment provider webhook, e.g. `POST /payments/webhooks/paystack`, if online orders must be verified server-side

### Logistics & fulfillment

- `GET /logistics/tasks` — fulfillment tasks scoped to the actor
- `POST /logistics/tasks/:id/fulfillment`
- `POST /logistics/tasks/:id/receipt` — returns `{ order, sale }`

### Payroll vouchers

The payroll page is currently local/demo-driven except for group approval. For a live backend it would need:

- `GET /payroll/periods`
- `POST /payroll/periods`
- `PATCH /payroll/periods/:id/submissions/:submissionId/unit-entries/:entryId`
- `POST /payroll/periods/:id/submissions/:submissionId/unit-entries/:entryId/submit`
- `POST /payroll/periods/:id/submissions/:submissionId/approve`
- `POST /payroll/periods/:id/group-approval`
- `GET /payroll/periods/:id/payslips` or equivalent payslip delivery status

### Group operations

The Group Operations page is currently local/demo-driven. For a live backend it would need:

- `GET /operations/entities`
- `GET /operations/work-items`
- `POST /operations/work-items`
- `PATCH /operations/work-items/:id`
