# HR Contact Hub API

REST API backend for the HR Contact Hub project.

## Requirements

- Node.js 20 or newer
- A Firebase project with Cloud Firestore and Firebase Authentication enabled
- A Firebase service account JSON value
- A Firebase Web API key for the Authentication REST endpoints
- SMTP server credentials and a sender address accepted by that server for outbound responses

Copy `.env.example` to `.env` and set `SERVICE_ACCOUNT_DATA` to the complete service account JSON on one line. The Firebase project ID is read from that JSON's `project_id`; do not set a separate project ID or a service-account file path. Keep the private key secret and do not commit `.env` or real service account data.

Run the API with `npm start`; run checks with `npm test`.

To exercise public contact intake in a real browser, set `.env` to a development Firebase project, then run `npm run test:browser-intake`. Open the printed local URL; the browser test form submits automatically. The script verifies the normalized Firestore record and removes the uniquely marked test message, event, audit entry, notification, queued email, and temporary website. It suppresses background workers for this run. The script waits up to two minutes for the browser submission.

## Data models

`schemas/data.js` defines JSDoc model types, JSON Schema definitions, and runtime constructors for User, Website, Category, StaffCategory, Message, MessageResponse, MessageNote, MessageEvent, AuditLog, Notification, and EmailOutbox. Constructors require all schema-required fields by default. To create a placeholder instance for serialization, explicitly pass `{ disableRequired: true }`; missing or undefined values normalize to typed empty values. Constructors reject malformed non-empty values and unknown fields, and freeze created instances. Use `toFirestore()` for storage-ready plain data and `toJSON()` for serializable, secret-filtered output. Website records store only a hash of the site key.

## Current API

- `GET /health`
- `POST /api/v1/public/contact` — requires `X-Site-Key`; rate-limited; supports an optional `website_url` honeypot field.
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `GET /api/v1/auth/me`
- `GET /api/v1/messages`
- `GET /api/v1/messages/:id`
- `GET /api/v1/messages/stats`
- `POST /api/v1/messages/bulk-assign`
- `PATCH /api/v1/messages/:id/assign`
- `PATCH /api/v1/messages/:id/status`
- `PATCH /api/v1/messages/:id/category`
- `POST /api/v1/messages/:id/notes`
- `POST /api/v1/messages/:id/responses`
- `GET /api/v1/messages/:id/responses`
- `GET|POST /api/v1/staff`
- `GET|PATCH /api/v1/staff/:id`
- `PATCH /api/v1/staff/:id/status`
- `GET|POST /api/v1/users`
- `PATCH /api/v1/users/:id`
- `PATCH /api/v1/users/:id/status`
- `GET|POST /api/v1/websites`
- `PATCH /api/v1/websites/:id`
- `GET|POST /api/v1/categories`
- `PATCH|DELETE /api/v1/categories/:id`
- `GET /api/v1/me/dashboard`
- `GET /api/v1/me/messages`
- `GET /api/v1/me/responses`
- `GET /api/v1/me/performance`
- `GET /api/v1/monitoring/overview`
- `GET /api/v1/monitoring/staff`
- `GET /api/v1/monitoring/staff/:id`
- `POST /api/v1/monitoring/staff/:id/remind`
- `GET /api/v1/monitoring/responses`
- `GET /api/v1/monitoring/overdue`
- `GET /api/v1/monitoring/export`
- `GET /api/v1/audit-logs`
- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/:id/read`

The public intake accepts `name`, `email`, `subject`, and `message`, plus optional `phone` and `category`. `category` must match an active category's name or document ID and is stored as `category_id`. A successful submission is written to Firestore before returning `201` with the message ID. Invalid fields or categories return `422`; invalid site keys return `401`; the per-IP limiter allows 20 requests per 15 minutes. A non-empty `website_url` honeypot receives an accepted-shaped response without storing a message.

Authentication routes in Section 7.2 are implemented: login, refresh, logout, forgot/reset password, and current-user profile. Set `FIREBASE_API_KEY` for the Firebase Authentication REST API. Login and refresh require an active Firestore profile at `users/{uid}` with a supported role. Authenticated endpoints require `Authorization: Bearer <Firebase ID token>`; revoked tokens are rejected. Forgot-password always returns a generic success message for a validly formatted email, including when no account matches. Logout uses Firebase's user-level refresh-token revocation, which signs out all sessions for that user, not only the current device. Password reset requires at least 8 characters.

Message routes in Section 7.3 support filtering, pagination, search, date ranges, detail history, assignment, status/category updates, notes, responses, bulk assignment, and counts by website, status, category, and unassigned messages. `super_admin` and `hr` can manage assignments and access all messages; staff can access only messages assigned to their Firebase UID. Bulk assignment accepts up to 100 message IDs and only active staff users can be assignees. For outbound email, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_REQUIRE_TLS`, `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM`. Port 587 with `SMTP_SECURE=false` and `SMTP_REQUIRE_TLS=true` uses STARTTLS; port 465 normally uses `SMTP_SECURE=true`. SMTP authentication is optional, but if used both username and password are required.

Emails are written to the Firestore `email_outbox` collection in the same transaction as the action that triggered them. The background worker retries transient failures with backoff and marks an item failed after eight attempts; email delivery state is separate from the API response. A response created with `send_to_sender: true` returns `email_queued: true` and `sent_to_sender: false`; the latter changes to true after SMTP delivery succeeds. Staff invitations are Firebase password-reset links queued through SMTP. Public intake queues email and in-app notifications for active HR and Super Admin users, while assignments and overdue reminders notify the assigned staff member.

The staff APIs support category membership, activation/deactivation, profile and workload views, invitation emails, personal dashboards, assigned-message filters, response history, and performance summaries. HR and Super Admin monitoring includes totals, per-staff performance, response feed, overdue messages, manual reminders, and CSV export. Super Admins manage HR/Admin users and websites; HR and Super Admins manage staff and categories; only Super Admins can read audit logs. Website creation and key rotation return the raw site key once; only its SHA-256 hash is stored.

`MESSAGE_RESPONSE_SLA_HOURS` sets the initial response deadline (default `24` hours). `REMINDER_REPEAT_HOURS` controls how often an overdue unanswered assignment can generate another reminder (default `24` hours). The reminder worker checks every 15 minutes. In-app notifications are stored in the `notifications` collection and are visible only to their recipient.

Each authenticated user needs a Firestore document at `users/{uid}` with a `role` of `super_admin`, `hr`, or `staff`; `is_active: false` disables access. New contact messages store tokenized `search_terms` for Firestore `array-contains-any` search. Older messages need those terms backfilled before they can be found with `q`; Firestore may require composite indexes for combinations of filters and ordering.

The email outbox worker requires the two composite indexes declared in `firestore.indexes.json`. Deploy them to the selected Firebase project with `firebase deploy --only firestore:indexes --project <project-id>` (use the `project_id` from `SERVICE_ACCOUNT_DATA`). Firestore can take several minutes to finish building indexes before those worker queries succeed.

When `NODE_ENV=production`, the server pings `https://hr-backend-emp1.onrender.com/health` every five minutes. This is disabled in development and tests; configure `NODE_ENV=production` in the Render service environment.

Register sites in `websites/{websiteId}` with `name`, `domain`, `is_active: true`, and `site_key_hash`. The hash is lowercase SHA-256 hex of the raw site key; store only the hash and provide the raw key to that site's trusted server. Intake messages are written to `messages` with status `new`.

Set `ALLOWED_ORIGINS` to every browser client origin, including the internal HR front end, and `INTAKE_ALLOWED_ORIGINS` to the four website origins. Requests without an `Origin` header are allowed for server-to-server intake integrations; the site key remains required. CORS is a browser control and does not replace site-key validation.

## Deployment notes

New contact messages store tokenized `search_terms` for Firestore `array-contains-any` search. Older messages need those terms backfilled before they can be found with `q`; Firestore may require composite indexes for combinations of filters and ordering. The API does not include the front-end screens listed in the scope document. Configure Firestore indexes and a production scheduler/monitoring strategy appropriate to the deployment; the included background workers run within the API process and persist queued email work in Firestore.
