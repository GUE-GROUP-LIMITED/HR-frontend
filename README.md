# GUE Group — Contact Hub & Operations Demo

> Multi-site contact aggregation and additive operations demos for GUE Group's subsidiaries.

---

## 🚀 Overview

The app preserves the existing contact-management workflow and adds local-only demos for group operations and payroll vouchers. Contact requests submitted across GUE Group's ten web properties can be consolidated in the existing hub:
1. **GUE Group Limited** (`www.guegroup.com`)
2. **GUE Cyber Limited** (`cyber.guegroup.com`)
3. **GUE Educational Limited** (`edu.guegroup.com`)
4. **GUE Educational Skills Training Centre** (`stc.edu.guegroup.com`)
5. **GUE Engineering Limited** (`eng.guegroup.com`)
6. **GUE Smart Farming Limited** (`farm.guegroup.com`)
7. **GUE Industrial Parks Ltd** (`ind.guegroup.com`)
8. **GUE Mobility Limited** (`mobility.guegroup.com`)
9. **Guemoni Limited** (`moni.guegroup.com`)
10. **GUE Realty Limited** (`realty.guegroup.com`)

The GUE Educational Skills Training Centre is modeled as an operating unit of GUE Educational Limited, not as a separate legal subsidiary. The in-development CBT Examination Centre is assigned to GUE Educational Limited.

## Group Operations Demo

The **Group Operations** page provides synthetic work-queue examples for cyber and IT services, education, engineering, farming, manufacturing, mobility, financial inclusion, and realty. Status changes and new work items are held in page memory and reset on reload.

The **Staff Management** directory includes the employee names, job descriptions, and departments from the supplied workbook as development data. Its department filter retains existing roster labels and offers shared functions plus areas relevant to the group's subsidiaries, including Operations, Administration, Finance, Agency Banking, Marketing, Training, IT & Cybersecurity, Engineering, Education, Agriculture, Mobility, Real Estate, and Industrial Parks. These records are read-only references in the demo; payroll account numbers and signatures are replaced with placeholders.

### Contact topics and internal requests

The Inbox supports public website inquiries and staff-only internal requests. Categories can be configured for public, internal, or both audiences, and each category can name a default staff responder. Internal requests can be routed across companies, branches, and operating units to an active staff member assigned to the selected destination. The Inbox includes source filtering and shows the requesting unit, destination, and topic in the message details.

The mock API persists internal requests alongside inbox messages. For backend integration, implement `POST /internal-requests` with `{ category_id, target_unit_id, assignee_id, subject, message }`, returning `{ message_id, status }`. `GET /messages` accepts `source_type=public|internal`; internal message responses include `source_type`, `source_unit_id`, `source_unit_name`, `target_unit_id`, and `target_unit_name`. The backend should validate category audience, destination membership, active staff status, and the requester's authorization.

Staff can also create external organization follow-up records, for example a Guemoni agent recording a UBA terminal fault or BVN/NIN enrolment issue. UBA and custom organization names are supported. This is tracking-only: the demo does not email or contact the organization. Staff can update the record status and use internal notes to track follow-up. The requester and managers whose access scope covers the originating company, unit, and location can view the record; mock inbox and detail reads enforce this scope.

For backend integration, implement `POST /external-requests` with `{ category_id, organization_name, contact_name?, contact_email?, subject, message }`, returning `{ message_id, status }`. Derive the requester and source scope from the authenticated user rather than trusting client-supplied identity. `GET /messages?source_type=external` and `GET /messages/:id` must enforce requester-or-scoped-manager access on the server. External message responses include `requester_id`, `source_company_id`, `source_unit_id`, `source_work_location`, and `external_organization`.

The **Payroll** page retains the workbook's October payroll rows as reference data and creates a current-month draft from the current roster with zeroed pay fields for entry. Current staff records include company and employee work locations, which are also included in payroll CSV exports. Account numbers are replaced with `0000000000`; bank and signature fields use demo placeholders, and no signature marks are imported.

Staff with unit-scoped payroll-entry permission can update payroll fields and submit a draft. The approval flow is **payroll entry → West Africa Schools unit head → subsidiary head → group head**. Staff assigned Billing & Invoices and Technical & Customer Support duties can enter payroll only for their permitted unit; these duty labels do not grant approval or export rights. The subsidiary submission appears in the central preview before final group approval. Demo personas include unit-scoped payroll-entry staff, assigned company and branch managers, and the GMD. Approved company payrolls can be downloaded as CSV or shared through the browser's share/clipboard feature. Workflow changes are held in page memory and reset on reload.

Payslips are released only after final group approval, rather than at an earlier unit or company approval stage. The mock frontend marks the delivery as simulated; it does not send email or initiate payment. In production, `POST /payroll/periods/:id/group-approval` must authenticate and authorize the GMD, finalize and audit the approved payroll, generate one payslip per staff member, and send it to the staff member's verified email address. Return the approved period with `payslipDelivery: { status: "sent", recipientCount, sentAt }`. The endpoint should be idempotent and report delivery status/counts so retries cannot email duplicate payslips. Do not send payslips or include account details in client-side email requests.

### Meetings and workforce lifecycle

The **Meetings & Events** page lets branch managers and higher line-management roles notify their scoped team. The GMD can also invite company managers and head-office staff, optionally including branch managers, or announce to all active staff. Inviting an officer with a higher role requires a reason; the officer receives an accept/decline request. Staff-specific notifications are scoped to the recipient.

Managers can edit lower-ranked staff profiles within their scope, transfer staff, and record promotions; peers and higher-ranked staff are not editable through manager actions. HR alone can update birth and hire dates. Termination requests require HR review followed by an executive approval; staff access is deactivated only after final approval. Transfer and termination letter email is simulated in this demo. Birthday, hire-anniversary, and promotion notifications are generated by the mock notification flow; production should run date-based celebrations from a backend scheduler.

For backend integration, implement authenticated, server-authorized endpoints for `PATCH /staff/:id` (profile fields only), `POST /staff/:id/transfer` (employment-scope changes), `POST /staff/:id/promotions`, `POST /staff/:id/termination-requests`, `GET /staff-termination-requests`, and `PATCH /staff-termination-requests/:id/approval`. `POST /staff/:id/transfer` should generate and email the transfer letter; final termination approval must revoke active sessions immediately and send the termination notice. Meetings use `GET /meetings`, `POST /meetings`, and `PATCH /meetings/:id/response`; enforce role, scope, higher-rank reason, and invitee identity on the server. `GET /notifications` and notification read endpoints must filter by the authenticated user. Never rely on frontend role checks as authorization.

### Recruitment, onboarding, and business workflow adoption

The **Recruitment & Onboarding** demo follows a gated applicant lifecycle: application → screening → scheduled interview → recorded evaluation → offer awaiting the candidate's response → hired or closed. An offer cannot be issued until the interview evaluation has a 1–5 rating and written feedback. Early-stage closure requires a reason; a pending offer is closed by recording the candidate's decline. Recording offer acceptance starts a checklist whose tasks have named functional owners (HR, hiring manager, IT, or the new employee). The job openings and applications are fictional seed data and browser storage only; do not enter real applicant information. This demo does not email offers, create production employee accounts, collect CVs or identity documents, or perform background checks.

The workflow is informed by the Frappe HRMS recruitment and onboarding pattern: [Job Applicant](https://docs.frappe.io/hr/job-applicant), [Interview](https://docs.frappe.io/hr/interview), and [Employee Onboarding](https://docs.frappe.io/hr/employee-onboarding). The app is adopting workflow conventions, not embedding or redistributing Frappe code. For production, the backend must enforce HR authorization, retain a server-side audit trail, apply a defined candidate-data retention policy, and create the employee/onboarding records transactionally after offer acceptance. Implement `GET /recruitment`, `POST /recruitment/applications`, `PATCH /recruitment/applications/:id/screening`, `POST /recruitment/applications/:id/interviews`, `PATCH /recruitment/applications/:id/interviews/evaluation`, `POST /recruitment/applications/:id/offers`, `PATCH /recruitment/applications/:id/rejection`, `PATCH /recruitment/applications/:id/offer-response`, and `PATCH /recruitment/applications/:id/onboarding-tasks/:taskId`. Derive the actor from the authenticated session; never trust a client-supplied role or user ID.

The implementation is phased while keeping the end-to-end target visible:

1. **People operations (current phase):** staff lifecycle, scoped approvals, payroll preparation/approval, recruitment, and onboarding. Nigerian payroll calculations and statutory obligations still require validation by qualified local professionals before production.
2. **Finance, sales, customer work, and POS:** use controlled requisition/purchase/invoice/payment/reconciliation steps; lead qualification → opportunity → quote/order → invoice; and POS shift opening → sales/receipt → settlement and close. Segregate request, approval, and payment duties. Agency-banking issues remain support tracking only; this app must not initiate or replace transactions on UBA's authorized platform.
3. **Marketing automation:** consent and contact preferences → audience segmentation → reviewed campaign → delivery → unsubscribe/suppression and outcome reporting. This is not yet a functional module here.

### POS, Web Orders, and Logistics fulfillment

The **Point of Sale** page is the in-app checkout for authorized employees. Staff select products from the Loyverse-sourced catalog, record the payment method, create the sale, and print a customer receipt. The live contract is `GET /pos/dashboard` for scoped catalog/sales data and per-outlet `outletAccess` capabilities, and `POST /pos/sales` to validate and create the receipt in Loyverse. Any employee authorized to open the outlet's POS can sell. The demo catalog and receipts are synthetic and do not write to Loyverse or charge customers.

**Web Orders** is a distinct register for purchases made through subsidiary websites; it is not the walk-in POS and is not the Logistics queue. Orders identify their source site, outlet, payment status, and fulfillment mode. After a server-verified Paystack payment, orders needing no delivery (such as student application/registration payments) complete online. Only paid orders marked as requiring delivery appear as **Logistics** fulfillment tasks. Walk-in sales, including Guemoni agency-banking service fees, remain in POS. Guemoni does not use this web-order or Logistics flow.

The backend contracts are server-to-server `POST /web-orders` for subsidiary site submissions, `GET /web-orders`, `GET /logistics/tasks`, `POST /logistics/tasks/:id/fulfillment`, and `POST /logistics/tasks/:id/receipt`. Logistics records the fulfilling and receipt-issuing employees; a receipt for a delivery order is issued only after verified payment and fulfillment. Orders and tasks are scoped to assigned outlets; branch managers see their branch, company managers see their company branches, Operations Managers see subsidiary outlets within their group scope, and the GMD sees the full authorized group view. POS sales and receipt summaries follow the same hierarchy.

For production, subsidiary websites must submit orders server-to-server with a stable source order ID, registered domain, outlet and item mappings, quantities, total, and payment-provider reference. Paystack must call a secured backend webhook that verifies the provider signature and payment; never trust a browser-supplied "paid" flag or expose a webhook action in the frontend. The backend should enforce current employee scopes, route only paid delivery orders to Logistics, prevent duplicate payment/receipt processing with idempotency, validate catalog totals and stock, and audit webhook and employee actions. Use the official [Loyverse API reference](https://developer.loyverse.com/docs/) and its documented `receipts_write` scope from a secure backend integration; never expose tokens in the browser or Vite environment. GUE employees authenticate to this application rather than individual Loyverse user accounts. Confirm the free-account API entitlement and any plan/account limits with Loyverse before launch; the public API scope documentation does not guarantee GUE's specific account terms. The current repository has no backend, so POS, Web Orders, Logistics, payment verification, and receipt actions run in demo mode only.

The catalog is imported from Loyverse; do not maintain a second editable price book here. Guemoni records only approved agency service fees/commission, BVN/NIN enrolment fees, and account-opening service fees. Deposit/withdrawal principal is not GUE sales revenue and must stay in the authorized UBA system; never import or create it as a Loyverse sale item.

Timart remains an evaluation option rather than a connected provider. Its public materials advertise offline POS, stock and service sales, discounts/refunds, multiple payment methods, branches/staff, and an online store, but public developer documentation and the website-order integration contract were not located. Before a Timart connector is approved, verify API access entitlement, supported import/webhook operations, idempotency, multi-company/branch scoping, and data export with Timart. See [Timart POS](https://www.gettimart.com/), [inventory and sales](https://www.gettimart.com/features/inventory-and-sales), and [POS integration](https://www.gettimart.com/features/pos-integration).

Phases 2 and 3 are workflow targets, not existing features: this frontend currently has no accounting ledger, sales pipeline, or marketing campaign engine. POS connectivity also requires a secured backend and live Loyverse account configuration; until then, the POS page is a mock workflow. Use maintained systems or a secure backend for those capabilities rather than treating mock screens as financial or customer-data controls.

### Group roles and data scopes

The CEO is represented by the unrestricted Super Admin persona, while Philip Dzer is the Group Managing Director (GMD). The GMD can view group staff except the Super Admin and approve consolidated payroll; the GMD also temporarily covers GUE Smart Farming and GUE Mobility, which do not yet have assigned managers.

Company and branch managers see staff and payroll only within their assigned scope. Uche Umoke manages GUE Cyber and GUE Engineering; Donatus Akende manages GUE Realty; and Iortyer Jeffery Vershima manages West Africa Schools and Guemoni. Ushi Terna Shadrach manages the Skills Training Centre without access to West Africa Schools staff records. Eunice Mngohol Terhamenba and Blessing Terumbur Abor are limited to the Guemoni Askunya and Gboko branches respectively. Paul Tyotom has low-risk assistant-manager scope at the Skills Training Centre and staff, payroll, and activity visibility for Industrial Parks. He can progress scoped work items, but cannot mark them complete or approve payroll.

Thaddus Ande is the cross-group Operations Manager and can view staff, activities, and payroll across companies and branches. Alyssa Apecha has group-wide HR and payroll visibility with HR staff-management capabilities. Ian Imandeh can view group-wide payroll, payments, and deductions but not staff records or other operations. The GMD retains the group approval step; scoped company/branch approval rights are assigned separately from read access.

These are client-side demo scopes only. They are enforced for navigation and displayed records in the frontend; a production backend must independently authorize every read, update, export, and approval.

Supplementary Contact Hub demo roles are displayed alongside each employee’s normal job title. They are labels for the demo and do not change the employee’s access scope or approval permissions.

Kumningir Hashabaih is assigned to GUE Group Head Office for group-wide marketing and also has the Talent Acquisition Specialist (Demo) label.

These pages are frontend prototypes, not production financial controls. Workbook employee and historic payroll data is included in client-side source/bundles for development; do not deploy this build publicly. Client-side role checks are not security controls. Production use requires a secured backend, server-enforced company/unit authorization, approval/audit history, protected file sharing, and verified integrations. No payment is initiated here. Guemoni transactions must remain within the authorized UBA platform.

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
   - `POST /internal-requests` (staff internal request routed by topic, destination, and named assignee)
   - `POST /external-requests` (tracking-only requests to external organizations; access scoped to requester and managers)
   - `PATCH /messages/:id/assign`
   - `PATCH /messages/:id/status`
   - `POST /messages/:id/notes` & `POST /messages/:id/responses`
   - `POST /messages/bulk-assign`
   - `GET /staff` & `POST /staff`
   - `PATCH /staff/:id`, `POST /staff/:id/transfer`, and `POST /staff/:id/promotions`
   - `POST /staff/:id/termination-requests`, `GET /staff-termination-requests`, and `PATCH /staff-termination-requests/:id/approval`
   - `GET /meetings`, `POST /meetings`, and `PATCH /meetings/:id/response`
   - `GET /recruitment`, `POST /recruitment/applications`, and the application screening, interview, offer-response, and onboarding-task endpoints documented above
   - `GET /pos/dashboard` (server-scoped Loyverse catalog/receipts and outlet capabilities)
   - `POST /pos/sales` (authorize checkout, validate items/payment, and create a Loyverse receipt)
   - `GET /web-orders` (server-scoped orders with payment and fulfillment mode)
   - `GET /logistics/tasks` (only paid web orders that require delivery)
   - `POST /logistics/tasks/:id/fulfillment` (record the fulfilling employee)
   - `POST /logistics/tasks/:id/receipt` (require fulfillment and create an idempotent Loyverse receipt)
   - Secured server-side Paystack webhook (verify payment and complete instant orders or route delivery orders)
   - `POST /payroll/periods/:id/group-approval` (finalize payroll, generate payslips, and email them after group approval)
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
Click the **"Simulate Message"** card in the left sidebar or the **"Test Intake API"** button in the top navigation to submit simulated contact form messages from any registered company website.
The intake system tests header validation (`X-Site-Key`), triggers category routing rules, creates real-time notifications, and renders them live in the Unified Inbox!
