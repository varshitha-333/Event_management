# 60-Minute Client Presentation Pack
## Jain University — Department Events Portal
### Prepared from full codebase analysis · Repo: `varshitha-333/Event_management`

> **Honesty legend used throughout this document**
> - ✅ **Verified** — read directly in the code
> - 🔍 **Inferred** — strongly implied by the code but not explicit
> - ⚠️ **Assumption / Not implemented** — do NOT claim this to the client as working

---

# STEP 1 — Understand the Project

## 1.1 In plain business language

This is a **campus events portal for Jain University**. It gives students one place to
discover, filter, and explore every departmental event — workshops, seminars, lab
sessions, field trips, symposiums — and gives staff tools to publish new events and
curate post-event content (photos and attendee reviews).

Think of it as a **mini "Eventbrite for one university"**: branded, department-aware,
with a dashboard, a calendar, a rich event detail page, an event-creation wizard, and
a staff management console.

## 1.2 In technical language

✅ **Verified:** This is a **frontend-only, framework-free single-page-per-screen web
application** — 6 HTML pages, 3 shared JavaScript files, 1 shared stylesheet, and 11
poster images. There is **no backend, no database, no server-side API**. All event
data lives in hard-coded JavaScript arrays (`sampleEvents`, 11 events). Session state
is simulated via `localStorage` (`auth.js` → `window.JainAuth`). Every "save"
operation mutates in-memory state or `localStorage` only.

This makes it a **high-fidelity interactive prototype / UI-complete Phase-1
deliverable** — the correct framing for the client meeting.

## 1.3 Problem it solves
- Event information at universities is scattered (posters, WhatsApp, notice boards).
- Students miss registration deadlines; staff have no unified publishing channel.
- The portal centralises discovery (search + filter + calendar), presentation
  (spotlight pages with posters, seats, deadlines), and administration (create,
  edit, manage photos/reviews).

## 1.4 Business domain & target users
- **Domain:** Higher-education campus event management (EdTech / campus ops).
- **Users:**
  - **Students** — browse, filter, view event details, (UI for) register.
  - **Staff** (Faculty / Admin / HoD / Dean — ✅ role selector exists in `login.html`)
    — publish events, manage photos & reviews.

## 1.5 Main objectives
1. Single source of truth for all department events (7 departments modelled ✅).
2. Fast discovery: search, department filter, timeline filter (Past/Today/Upcoming),
   sort, grid/list/calendar views. ✅
3. Rich per-event "spotlight" page with poster, seats, deadline, organizer, share. ✅
4. Self-service event publishing wizard for staff. ✅ (UI only)
5. Post-event engagement: photo galleries + star-rated reviews. ✅ (UI only)

## 1.6 Complete system workflow (as implemented)

```
register.html ──(2-step signup, simulated)──► success card ──► login.html
login.html ──(any valid email + ≥6-char pwd, simulated 1.5 s "API")──►
     JainAuth.setLogin() stores session in localStorage (24 h / 7 d)
     ──► redirect to saved target or index.html
index.html (AUTH-GUARDED ✅) ── dashboard: stats, filters, search,
     grid/list/calendar, quick add/edit modal, CSV export
     ──click card──► bento.html?id=N  (event spotlight)
     ──sidebar──► register-event.html (create wizard) / manage_event.html (staff console)
```

## 1.7 File inventory (✅ verified)

| File | Lines | Role |
|---|---|---|
| `index.html` | 1,774 | Main dashboard (events grid/list/calendar) + inline JS app |
| `bento.html` | 2,222 | Event spotlight page (hero, gallery, share, related) |
| `login.html` | 831 | Dual-role login (Student / Staff) + inline auth logic |
| `register.html` | 530 | 2-step student registration + password strength meter |
| `register-event.html` | 1,250 | 2-step event creation wizard (staff) |
| `Event registration.html` | 1,250 | ⚠️ **Byte-identical duplicate** of `register-event.html` |
| `manage_event.html` | 796 | Staff console: photos upload + reviews management |
| `app.js` | 297 | Shared event data + utilities (used by bento.html only) |
| `bento.js` | 408 | Spotlight rendering logic (⚠️ contains a syntax error — see Step 14) |
| `auth.js` | 91 | `JainAuth` session utility (localStorage) |
| `bento.css` | 1,520 | Spotlight page stylesheet |
| `posters/event1–11.jpg` | — | 11 event poster images |
| `auth_guard_snippet.html` | 45 | Developer documentation snippet for protecting pages |

**Technologies:** HTML5, CSS3 (custom properties, grid/flexbox, keyframe animations),
vanilla ES6+ JavaScript, Google Fonts (Inter), Font Awesome 6 (CDN), localStorage /
sessionStorage, FileReader & Drag-and-Drop APIs, Blob API (CSV export),
IntersectionObserver (scroll reveals), Clipboard API (share). ✅ No build step, no
framework, no package.json — deployable on any static host.

---

# STEP 2 — Codebase Analysis, Module by Module

## 2.1 Folder structure
Flat root directory (no `src/`), one `posters/` asset folder, `.vscode/` editor
config, `.git/`. 🔍 Structure suggests rapid prototyping; a `js/`, `css/`, `pages/`
split is an easy future refactor.

## 2.2 Authentication module — `auth.js` (✅ verified)
- **Purpose:** Session simulation + route guarding.
- **How:** IIFE exposing `window.JainAuth` with:
  - `isLoggedIn()` — reads `jain_portal_auth` key, checks `expiry` timestamp,
    auto-purges expired sessions.
  - `setLogin(userData, remember)` — TTL = 7 days if "remember me", else 24 h.
  - `getUser()`, `logout()` (clears + redirects to login), `requireAuth()` (saves
    intended URL in `sessionStorage.jain_redirect_after_login`, redirects),
    `populateNavbar()` (injects name/role/initials/email into navbar IDs).
- **Connections:** `login.html` calls `setLogin` + reads the redirect key;
  `index.html` calls `requireAuth()` in `<head>` and `populateNavbar()` on load.
- ⚠️ **Important:** there is **no credential verification** — any syntactically
  valid email + password ≥ 6 chars logs in after a simulated 1.5 s delay
  (`setTimeout` in `login.html`). Only `index.html` is guarded; `manage_event.html`,
  `register-event.html`, `bento.html` are directly reachable.

## 2.3 Login module — `login.html` (✅)
- Dual-role toggle (Student / Staff) that swaps branding panel, features list,
  placeholders, button labels.
- Staff panel adds a 4-way role selector: Faculty, Admin Staff, HoD, Dean —
  stored as `staffRole` in the session payload.
- Client-side validation (email regex `\S+@\S+\.\S+`, password ≥ 6), password
  visibility toggles, remember-me checkboxes, loading spinner, success overlay,
  then redirect honouring the saved deep-link.
- Reverse guard: already-logged-in visitors are bounced to `index.html`. ✅

## 2.4 Student registration — `register.html` (✅)
- 2-step wizard: (1) name / email / student ID / department → live profile preview
  card with computed initials; (2) password + confirm + terms.
- **Password strength meter**: scores length ≥ 8, uppercase, digit, symbol → 4 bars
  Weak/Fair/Good/Strong with colour coding.
- ⚠️ Submits nowhere — 2 s simulated delay then a success card. No account is
  persisted; login does not check registered users.

## 2.5 Dashboard — `index.html` (✅ the largest module)
State object: `{events, filteredEvents, selectedDepartment, selectedTimeline,
searchQuery, currentView, currentMonth, editingEventId, openDetailId}`.
- **Stats bar:** total / upcoming / today counts + top-5 departments breakdown.
- **Filtering pipeline** (`filterEvents()`): department → timeline
  (past/present/future via date normalisation to midnight) → free-text search over
  name, location, organizer, description → sort (date asc/desc, name A-Z).
  "Unstop-style" pill dropdowns with removable filter tags and a reset button.
- **Three views:** responsive card grid, compact list, and full-month calendar —
  plus an always-on side mini-calendar with event dots and a day-detail slide panel.
- **Quick Add / Edit modal:** in-memory create (id = `Date.now().toString(36)+random`)
  and update; toast feedback. ⚠️ Not persisted — refresh restores the 11 seed events.
- **CSV export:** builds a CSV from filtered events via Blob + object URL,
  filename `jain_events_YYYY-MM-DD.csv`. ✅
- **Navigation:** every card/list row/calendar item deep-links to
  `bento.html?id=<eventId>`.

## 2.6 Event spotlight — `bento.html` + `app.js` + `bento.js`
- `app.js` ✅ supplies the canonical 11-event dataset (richer than the dashboard
  copy: adds `regCloseDate`, `tags`, absolute `/design/posters/…` paths) plus
  formatters (`formatDate`, `formatTime` 24h→12h, `getEventTimeline`,
  `getDeptColor`, `getEventPoster` with cyclic fallback).
- `bento.js` renders the selected event: hero (title, badge, seats progress bar —
  ⚠️ "filled" seats are **fabricated as 72 % of capacity** when absent), poster with
  gradient fallback on `onerror`, eligibility, schedule rows, registration deadline
  with live "N days remaining" countdown, organizer card with generated initials and
  a synthesised `@jainuniversity.ac.in` email, related-events (same department, max
  3), URL sync via `history.replaceState('?id=…')`, dual desktop/mobile selector
  sync, and an `escHtml()` sanitiser for injected strings. ✅
- `bento.html` inline script adds: sticky nav shrink, hero poster carousel
  (autoplay, pause, keyboard arrows), highlights slider, scroll-reveal
  IntersectionObserver, 26-item photo gallery with category filter + lightbox, and
  `shareEvent()` — WhatsApp deep link, mailto, Clipboard copy. ✅
- ⚠️ **Defect:** `bento.js:355` contains `letconst` — a **syntax error** that stops
  the entire file from parsing, so the dynamic spotlight rendering is currently
  broken (see Step 14). The static/inline parts of `bento.html` still work.

## 2.7 Event creation wizard — `register-event.html` (✅)
- 2-step wizard with animated stepper (slide-in transitions, done-checkmarks).
- Step 1: title, department (11 options incl. Management/Commerce/Arts/Law), date,
  start/end time, venue, description, registration deadline, capacity stepper
  (+/− buttons), mode toggle (Offline/Online/Hybrid), event type.
- Poster upload: file input → 5 MB limit → FileReader → data-URL preview with
  name/size and remove button.
- Step 2: coordinator name/email/phone with validation (regex email).
- **Preview modal** renders a live event card exactly as students would see it.
- **Draft system:** Save Draft → `localStorage.jain_event_draft_v2`; on next visit a
  `confirm()` offers restore. ✅
- ⚠️ **Publish** only validates, shows a success toast, and redirects to
  `index.html` after 2.5 s — the event is **not added** to any list.
- ⚠️ `Event registration.html` is an identical copy (verified via `diff`).

## 2.8 Staff management console — `manage_event.html` (✅)
- Left panel: searchable event list (by name or department) with status badges.
- **Photos:** drag-and-drop zone + browse, image-type filter, 8 MB per-file limit,
  pending-grid with per-photo delete, album/category tag (7 presets) + caption,
  batch "Upload" moves pending → uploaded grid (object URLs, in-memory).
- **Reviews:** reviewer name, dept/year, 1–5 interactive star rating, 400-char
  review with live counter, month picker (defaults to current month); computes and
  displays **average rating**; delete per review. Event #3 ships with 2 seed reviews.
- ⚠️ All in-memory (`eventData` map); lost on refresh. No auth guard on this page.

## 2.9 Configuration / deployment / docs
- ✅ No `package.json`, no CI, no Dockerfile — static hosting is the deployment
  model. 🔍 A leftover Cloudflare `email-decode.min.js` tag in `bento.html` and git
  commit "changed route from root path to /design path" indicate it was previously
  served via **Cloudflare Pages under a `/design/` base path** — which explains the
  absolute `/design/posters/…` poster paths in `app.js`.
- `auth_guard_snippet.html` is genuine developer documentation for wiring the auth
  guard into new pages. ✅

---

# STEP 3 — 60-Minute Meeting Agenda

| Time | Block | Goal |
|---|---|---|
| 0:00–0:05 | Welcome & framing | Set expectations: "UI-complete Phase-1 prototype" |
| 0:05–0:13 | The business problem | Scattered event info; missed deadlines; no staff channel |
| 0:13–0:21 | Live demo Part 1 — student journey | Register → Login → Dashboard → Spotlight |
| 0:21–0:29 | Live demo Part 2 — staff journey | Create-event wizard → Manage photos/reviews |
| 0:29–0:37 | Architecture & tech choices | Zero-dependency frontend; why; Phase-2 backend plan |
| 0:37–0:42 | Data model walkthrough | The event entity; proposed DB schema for Phase 2 |
| 0:42–0:47 | Security & auth | What's simulated vs. what production needs |
| 0:47–0:52 | Roadmap, scalability & costs | Backend, persistence, hosting, timeline |
| 0:52–1:00 | Q&A + next steps | Use the Q&A banks in Steps 11–12 |

**Timing rationale:** demos front-loaded (16 min) because the project's strength is
its polished UI; architecture kept honest and brief because the backend is Phase 2.

---

# STEP 4 — Complete Speaking Script

> Speak conversationally. Bracketed notes are stage directions, not spoken.

## 4.1 Introduction (0:00–0:05)

**Say:**
"Good morning, and thank you for your time. Over the next hour I'll walk you through
the Jain University Department Events Portal. What you'll see today is a fully
interactive, UI-complete front end — every screen, every user flow, every
interaction is built and clickable. It runs on hard-coded sample data of eleven
real-looking events across seven departments, which lets us validate the entire
experience before we invest in server infrastructure. By the end of the hour you'll
have seen the complete student journey, the complete staff journey, and a clear
roadmap for turning this into a production system."

**Why it matters:** Framing it as "Phase 1 prototype, deliberately front-end-first"
converts a limitation into a methodology. Never let the client discover the missing
backend by accident.

**Likely question:** *"So it's not finished?"*
**Answer:** "The user experience layer — usually the hardest thing to get right — is
finished and testable today. What remains is the persistence layer: a database and
API that the screens plug into. Because every form already validates and every save
already fires a defined action, wiring in the backend is a well-scoped, low-risk
next phase, not a redesign."

## 4.2 Business Problem (0:05–0:13)

**Say:**
"Universities run hundreds of events a year, but the information lives in silos —
posters in hallways, WhatsApp forwards, department notice boards. Students miss
registration deadlines; organisers can't gauge demand; there's no institutional
memory of what happened. This portal solves all three: a single searchable catalogue
with department and timeline filters and three views including a calendar; a
spotlight page per event with seat availability, deadlines and one-tap WhatsApp
sharing — meeting students where they already communicate; and a staff console for
publishing events and preserving photos and reviews afterward, which builds a
compounding archive that markets next year's events."

**Client may ask:** *"Who did you design this for specifically?"*
**Answer:** "Two personas. Students — mobile-first browsing, fast filtering,
shareable links. And staff in four roles we've modelled in the login: faculty,
administrative staff, heads of department, and deans — each will get different
permissions in Phase 2."

## 4.3 System Overview / Demo Part 1 (0:13–0:21)
[Follow the demo script in Step 15 — student journey.]

**Say (transition):** "Rather than slides, let me show you the real product."

## 4.4 Demo Part 2 — Staff Journey (0:21–0:29)
[Step 15 — staff journey.]

## 4.5 Architecture (0:29–0:37)

**Say:**
"Technically, we made a deliberate choice: zero frameworks, zero build tools. Pure
HTML, CSS and modern JavaScript. Three shared libraries — an authentication utility,
a shared event-data module, and the spotlight renderer — and each page owns its own
logic. Benefits for you: no dependency licensing, no framework upgrade treadmill,
instant load times, and it deploys on any static host — we've in fact served it via
Cloudflare's global CDN. When we add the backend in Phase 2, this front end talks to
it over standard JSON APIs; nothing here gets thrown away — the simulated calls are
literally placeholders with 'replace with real API call' comments in the code."

**Technical explanation (if pressed):** "State management is a plain JavaScript
state object per page with render functions — the same unidirectional pattern React
uses, without the 40-kilobyte runtime. Filtering is a pure pipeline: department →
timeline → text search → sort, re-rendered on every input event."

**Business explanation:** "Less code from third parties means lower maintenance
cost, fewer security advisories to chase, and any JavaScript developer can work on
it — no niche hiring."

## 4.6 Security (0:42–0:47)

**Say (be candid — this builds trust):**
"Let me be precise about security, because it matters. Today authentication is
simulated: sessions with 24-hour or 7-day expiry are stored in the browser, route
guards redirect unauthenticated users, and there's a full login and registration UX
including a password-strength meter. What does not exist yet is server-side
credential verification — that's Phase 2, where we'd add hashed passwords, HTTP-only
session cookies or JWTs, server-enforced role permissions, and rate limiting. On the
front end we already practise defensive coding — for example the spotlight page HTML-
escapes all injected event text to prevent script injection."

**Likely question:** *"Could someone bypass the login today?"*
**Answer — honest:** "Yes — it's a prototype gate, not a security boundary. It
demonstrates the UX; enforcement moves to the server in Phase 2. That's exactly why
we don't put real student data into this phase."

## 4.7 Scalability & Roadmap (0:47–0:52)

**Say:**
"The front end scales infinitely today — it's static files on a CDN. The Phase-2
architecture we recommend is a lightweight API — Node or Django — over PostgreSQL,
with object storage for posters and photos. The data model is already defined by the
front end: you can see it in the event objects — name, department, date, time,
venue, capacity, organizer, deadline, tags, poster. That becomes the database schema
almost one-to-one. Realistic Phase-2 scope: authentication service, events CRUD,
student registrations with capacity enforcement, photo storage, and reviews — the
screens for all of these already exist."

## 4.8 Q&A (0:52–1:00)
[Use Steps 11 and 12. Close with:]

**Say:** "My recommendation: approve Phase 2 backend development, run a pilot with
one department's events next term, then roll out campus-wide. The risky part —
whether students and staff will actually enjoy using it — is what you just saw
working."

---

# STEP 5 — Every Major Feature in Depth

### F1. Authentication & Session Management
- **Business purpose:** Personalised, gated portal; role capture for future permissions.
- **User journey:** register → login (choose Student/Staff, staff picks sub-role) →
  success overlay → deep-link redirect → navbar shows name/role/initials → logout.
- **Implementation:** ✅ `auth.js` (`JainAuth` API over `localStorage.jain_portal_auth`
  with TTL), inline scripts in `login.html` (validation + simulated 1.5 s login) and
  `register.html`. Guard: `index.html` head; reverse-guard on `login.html`.
- **Files:** `auth.js`, `login.html`, `register.html`, `index.html` (head),
  `auth_guard_snippet.html` (docs).
- **DB tables:** none today; Phase 2 → `users`, `sessions`.
- **APIs:** none; simulated via `setTimeout`. Phase 2 → `POST /auth/login`,
  `POST /auth/register`, `POST /auth/logout`.
- **Output:** session JSON `{name, email, role, type, staffRole?, expiry, loginTime}`.
- **Future:** real verification, bcrypt hashing, JWT/HTTP-only cookies, SSO with
  university identity provider, guard every page (only `index.html` is guarded ⚠️).

### F2. Event Discovery Dashboard
- **Business purpose:** Core value — find the right event in seconds.
- **Journey:** land on dashboard → see stats (total/upcoming/today) → search or use
  pill filters (Department, Timeline, Sort) with removable tags → switch grid/list/
  calendar → click card → spotlight.
- **Implementation:** ✅ `filterEvents()` pipeline + `renderGrid/renderList/
  renderBigCalendar/renderSideCalendar` in `index.html`; state object; live results
  counter; empty-state UI; toasts.
- **Files:** `index.html` (all inline). **DB:** none (11-event array). **API:** none;
  Phase 2 → `GET /events?dept=&timeline=&q=&sort=`.
- **Future:** pagination, saved filters, personalised recommendations.

### F3. Calendar Views (side mini-calendar + full-month view)
- **Business purpose:** Deadline/date-centric planning for students.
- **Implementation:** ✅ Hand-built month grid (first-day offset + days-in-month),
  today highlighting, up to 3–4 colour-coded event dots per day, click-day → slide-in
  panel listing that day's events, month prev/next navigation, dual sync between
  mini and big calendars.
- **Future:** iCal/Google Calendar export, week view.

### F4. Event Spotlight Page
- **Business purpose:** The "sell the event" page — poster, seats urgency, deadline
  countdown, organizer contact, related events, sharing.
- **Implementation:** ✅ `bento.html` + `app.js` + `bento.js`; URL param `?id=`;
  dept/event dropdown navigation (desktop + mobile mirrored); animated seat progress
  bars; days-remaining computation; related events (same dept, max 3); gallery with
  filter + lightbox; hero carousel; WhatsApp/email/copy-link share.
- ⚠️ Seats "filled" figure is simulated (72 % of capacity); `bento.js` currently has
  a blocking syntax error to fix before the demo.
- **Future:** real registration button wired to a registrations table; live seat counts.

### F5. Event Creation Wizard (staff)
- **Business purpose:** Self-service publishing → no bottleneck through IT/web team.
- **Implementation:** ✅ 2-step `register-event.html`: full event form, capacity
  stepper, Offline/Online/Hybrid mode toggle, 5 MB poster upload with FileReader
  preview, coordinator details, live preview modal, draft save/restore via
  localStorage, per-field validation with inline errors.
- ⚠️ Publish is simulated; no event actually enters the catalogue.
- **Future:** `POST /events` + moderation/approval workflow (HoD approves faculty
  submissions — the roles already exist in login).

### F6. Post-Event Content Management (staff)
- **Business purpose:** Institutional memory + social proof for future events.
- **Implementation:** ✅ `manage_event.html`: searchable event list; drag-and-drop
  multi-photo upload (8 MB cap, album tags, captions, delete); reviews with 1–5
  interactive stars, 400-char limit + live counter, computed average rating, seeded
  examples on event 3.
- ⚠️ In-memory only; page not auth-guarded.
- **Future:** object storage (S3/R2) for photos, review moderation, public display
  of galleries/reviews on the spotlight page (spotlight already has a "Past
  Highlights" section that shows for past events ✅).

### F7. CSV Export
- **Business purpose:** Reporting for administrators; offline processing in Excel.
- **Implementation:** ✅ `exportEvents()` in `index.html` — respects active filters,
  quotes fields, Blob + temporary anchor download, dated filename.
- **Future:** XLSX, scheduled email reports, attendance exports.

### F8. Quick Add / Edit Event (dashboard modal)
- **Business purpose:** Fast corrections without the full wizard.
- **Implementation:** ✅ Modal form; create (unshift with generated id) and edit
  (find-by-id merge); Escape-key + backdrop close; toast feedback.
- ⚠️ Session-only persistence.

---

# STEP 6 — Architecture

## 6.1 Overall architecture (text diagram)

```
┌──────────────────────────── BROWSER (everything runs here) ───────────────────────────┐
│                                                                                        │
│  PAGES (self-contained apps)               SHARED LIBRARIES                            │
│  ┌─────────────┐  guard  ┌──────────────┐  ┌──────────┐ session  ┌────────────────┐   │
│  │ login.html  │◄────────│ index.html   │  │ auth.js  │◄────────►│ localStorage    │   │
│  │ register.   │         │ (dashboard)  │  │ JainAuth │          │  jain_portal_   │   │
│  │ html        │         └──────┬───────┘  └──────────┘          │  auth / drafts  │   │
│  └─────────────┘   ?id=<event>  │                                └────────────────┘   │
│                                 ▼                                                      │
│  ┌───────────────────┐   ┌──────────────┐   ┌──────────┐   ┌──────────┐               │
│  │ register-event.   │   │ bento.html   │◄──│ app.js   │   │ bento.js │               │
│  │ html (wizard)     │   │ (spotlight)  │   │ data +   │   │ renderer │               │
│  └───────────────────┘   └──────────────┘   │ utils    │   └──────────┘               │
│  ┌───────────────────┐                      └──────────┘                               │
│  │ manage_event.html │      CDN: Google Fonts · Font Awesome 6                         │
│  └───────────────────┘      Assets: posters/event1–11.jpg · bento.css                  │
└────────────────────────────────────────────────────────────────────────────────────────┘
            NO SERVER · NO DATABASE · NO API  (Phase 2 adds these)
```

## 6.2 Design patterns actually used (✅)
- **Module / Revealing-module:** IIFE in `auth.js` exposing a public API.
- **Unidirectional state → render:** central `state` object + pure render functions
  (`filterEvents()` → `renderCurrentView()`), the vanilla equivalent of React's model.
- **Utility layer:** `app.js` formatters shared by the spotlight.
- **Event delegation & listeners:** everything wired in `DOMContentLoaded`.
- **Defensive rendering:** `escHtml()` in `bento.js`; `onerror` poster fallbacks;
  guard clause if `app.js` failed to load.
- ⚠️ Anti-pattern present: the event dataset is **duplicated three times**
  (`index.html`, `app.js`, `manage_event.html`) with slight drift — a known
  technical-debt item.

## 6.3 Request lifecycle (page-load lifecycle, since there's no server)
1. Browser requests HTML from static host/CDN.
2. `<head>` scripts run: `auth.js` loads → `requireAuth()` may redirect *before*
   paint (`window.location.replace`).
3. CSS + fonts + Font Awesome from CDN; posters lazy-render with fallbacks.
4. `DOMContentLoaded`: state seeded from `sampleEvents` → `filterEvents()` →
   initial render → listeners attached.
5. User input mutates state → re-render → optional URL update
   (`history.replaceState`) → toast.

## 6.4 Component interactions & data flow
`index.html` → (URL param) → `bento.html`; `login.html` ↔ `auth.js` ↔ every guarded
page; `register-event.html` ↔ localStorage draft; all pages → toast pattern
(identical showToast implementations, another dedupe candidate 🔍).

---

# STEP 7 — Database

⚠️ **Verified fact: there is no database.** Present tense = what exists; the schema
below is the **Phase-2 proposal derived 1:1 from the data structures in the code**.

## 7.1 Current data stores (✅)
| Store | Key/Structure | Written by |
|---|---|---|
| In-memory array | `sampleEvents` (11 events × ~12 fields) | `index.html`, `app.js`, `manage_event.html` (3 copies) |
| In-memory map | `eventData[id] = {photos[], reviews[]}` | `manage_event.html` |
| localStorage | `jain_portal_auth` (session + expiry) | `auth.js` |
| localStorage | `jain_event_draft_v2` (event draft) | `register-event.html` |
| sessionStorage | `jain_redirect_after_login` | `auth.js` / `login.html` |

## 7.2 Proposed Phase-2 schema (derived from the code's own shapes)

```
users(id PK, full_name, email UNIQUE, student_id, department_id FK,
      password_hash, role ENUM(student,faculty,admin,hod,dean), created_at)
        ▲ fields mirror register.html + login.html staffRole values ✅

departments(id PK, slug UNIQUE, name, color, icon)
        ▲ exactly the 7–11 dept maps hard-coded in every page ✅

events(id PK, name, department_id FK, date, start_time, end_time, venue,
       description, capacity, mode ENUM(offline,online,hybrid), type,
       reg_close_date, poster_url, organizer_id FK→users, created_at)
        ▲ union of app.js event fields + register-event.html form fields ✅

event_tags(event_id FK, tag)                 ▲ tags[] in app.js ✅
registrations(id PK, event_id FK, user_id FK, status, created_at,
              UNIQUE(event_id,user_id))      ▲ enables real seat counts
photos(id PK, event_id FK, url, caption, album_tag, uploaded_by FK)
        ▲ mirrors manage_event.html photo objects ✅
reviews(id PK, event_id FK, reviewer_name, reviewer_dept, rating 1–5,
        text VARCHAR(400), review_month)     ▲ mirrors review objects incl. 400-char cap ✅
```

- **Relationships:** departments 1—N events; events 1—N tags/photos/reviews;
  users N—M events via registrations.
- **Normalisation:** 3NF; department colours/icons move from 3 duplicated JS maps
  into one table — directly fixing today's duplication debt.
- **Scalability:** index `events(date)`, `events(department_id)`; seat availability =
  `capacity - COUNT(registrations)` — replacing the simulated 72 % figure.

---

# STEP 8 — APIs

⚠️ **No real endpoints exist.** The code contains three *simulated* calls (all
`setTimeout`): student login, staff login (1.5 s each, `login.html`), and account
creation (2 s, `register.html`) — one is even commented `// Simulate API call
(replace with real API call)` ✅.

**"Internal API" that does exist:** `window.JainAuth` (documented in Step 2.2) — the
contract every page codes against.

## Phase-2 endpoint specification (each maps to an existing screen action)

| Endpoint | Replaces (verified UI) | Request | Validation (already in UI) | Logic / DB | Response / Errors |
|---|---|---|---|---|---|
| `POST /auth/register` | `register.html` submit | name, email, student_id, dept, password | email regex, pwd ≥ 8, terms ✅ | hash pwd → insert `users` | 201 / 409 duplicate email |
| `POST /auth/login` | `login.html` submit | email, password, remember, role | email regex, pwd ≥ 6 ✅ | verify hash → issue token (24 h / 7 d — mirrors auth.js TTLs) | 200 + token / 401 |
| `GET /events` | dashboard load + filters | query: dept, timeline, q, sort | — | filtered SELECT (mirrors `filterEvents()`) | 200 list |
| `GET /events/:id` | `bento.html?id=` | path id | 404 if unknown (UI shows welcome panel today ✅) | join tags, photos, reviews, seat count | 200 detail |
| `POST /events` | wizard Publish | full event form + poster | required fields, deadline < date, poster ≤ 5 MB ✅ | insert `events`, upload poster to object storage | 201 / 422 |
| `PATCH /events/:id` | dashboard edit modal | changed fields | same | update row | 200 |
| `POST /events/:id/register` | spotlight "Register Now" btn ✅ (button exists, unwired ⚠️) | auth token | deadline not passed, seats remain | insert `registrations` atomically | 201 / 409 full |
| `POST /events/:id/photos` | manage console upload | multipart, album, caption | image type, ≤ 8 MB ✅ | store file, insert `photos` | 201 |
| `POST /events/:id/reviews` | manage console Add Review | name, dept, rating, text, month | all required, rating 1–5, ≤ 400 chars ✅ | insert `reviews` | 201 |
| `GET /events/export.csv` | dashboard Export | filters | — | stream CSV (columns already defined in `exportEvents()` ✅) | 200 text/csv |

**Error-handling pattern to promise:** consistent JSON `{error, code, fields{}}`;
the UI already has inline field errors + toasts to display them ✅.

---

# STEP 9 — Frontend Deep Dive

## 9.1 Page flow & navigation (✅ verified from href/location analysis)

```
register.html ⇄ login.html ──► index.html ──card/list/calendar──► bento.html?id=N
                                   │  (sidebar)                        │
                                   ├──► register-event.html            └─"Back to
                                   ├──► manage_event.html ──"Portal"──►   Portal"──► index
                                   └──► logout ──► login.html
```
Sidebar (hamburger) on dashboard & wizard; breadcrumbs on wizard & manage console;
profile avatar dropdown on dashboard.

## 9.2 Components (hand-rolled, no framework)
Event cards / list rows / calendar cells; pill-dropdown filter bar with badge count
and removable tags; two modals (detail + form) with backdrop-click and Escape
close; slide-in side panels; stepper wizards (2-step ×2); star-rating widget;
drag-drop upload zone; toast notifications (implemented per page ⚠️ duplicated);
hero carousel with autoplay/pause/keyboard; lightbox gallery; skeleton-free but
animated (staggered `animation-delay` per card ✅).

## 9.3 State management
Per-page plain-object state + explicit re-render calls. No global store; the only
cross-page state channels are the URL (`?id=`) and localStorage. Simple, debuggable,
zero dependencies — appropriate for this scale.

## 9.4 Forms & validation (✅)
- Login: email regex, pwd ≥ 6, inline error blocks show/hide.
- Registration: step-gated validation, pwd ≥ 8 + match + terms; strength meter.
- Event wizard: 7 required fields step 1, 3 step 2, email regex, poster ≤ 5 MB.
- Reviews: 5 required inputs incl. star rating; 400-char hard cap.
All use the same pattern: `classList.toggle('error'/'show')` + toast on failure.

## 9.5 UX & responsive design
- Design system via CSS custom properties: navy `#1c2b4a` + gold `#c8920a` brand,
  7 department accent colours used consistently across all pages ✅.
- Media queries at 1024/900/768/640px 🔍 (grep-verified breakpoints in bento.css and
  inline styles); mobile: hamburger sidebar, mirrored mobile filter dropdowns on
  spotlight, single-column grids.
- Micro-interactions: animated blobs on auth pages, count-up stats, progress-bar
  fills, scroll reveals, hover lifts — this polish is the project's differentiator.
- Accessibility: some `aria-label`s on share buttons ✅; ⚠️ gaps remain (div-based
  clickable cards, colour-only status cues) — an honest improvement item.

---

# STEP 10 — End-to-End User Flow (traced through actual code)

**Scenario: a student finds and opens the "AI & Machine Learning Workshop".**

```
1. Visit index.html
   └► <head>: auth.js loads → JainAuth.requireAuth() → no session found
      → sessionStorage.jain_redirect_after_login = ".../index.html"
      → window.location.replace('login.html')
2. login.html
   └► reverse guard: not logged in, stay. User keeps "Student" role,
      enters priya.n@jain.ac.in / secret123
   └► handleLoginSubmit(): regex ok, length ok → spinner
   └► setTimeout 1500 ms (simulated API)
      → JainAuth.setLogin({name:"Priya N", email, role:"Student",
                           type:"student"}, remember=false)  → TTL 24 h
      → success overlay → replace(savedRedirect)  → back to index.html
3. index.html (authenticated)
   └► requireAuth() passes → DOMContentLoaded:
      populateNavbar() writes "Priya N / Student / PN" into navbar
      state.events = [...sampleEvents]  (11 items)
      filterEvents() → resultsCount=11 → renderGrid() + updateStats()
      + renderSideCalendar()
4. User types "machine" in search
   └► input listener → state.searchQuery → filterEvents()
      → 1 match (name includes "Machine") → grid re-renders with 1 card
5. Click the card
   └► goToSpotlight('1') → location.href = 'bento.html?id=1'
6. bento.html
   └► app.js loads dataset → bento.js reads URLSearchParams id=1
      → dept select := 'computer-science', event select := '1'
      → renderSpotlight(ev):
         hero title/date("Friday, December 20, 2024")/time("2:00 PM")
         seats "36/50" (72 % simulated) with animated bar
         deadline "Dec 18" + days-remaining calc
         organizer "Dr. Sarah Johnson" → initials SJ →
           synthesized sarah.johnson@jainuniversity.ac.in
         related events: other CS events (Web Dev Bootcamp, Tech Symposium)
      → history.replaceState('?id=1') → toast "Loaded: AI & Machine…"
7. Share on WhatsApp
   └► shareEvent('whatsapp') → window.open('https://wa.me/?text=' +
      encodeURIComponent(title + ' — ' + url))
```
⚠️ Note: step 6 currently requires fixing the `bento.js:355` syntax error; with the
one-line fix (`letconst` → `let`, and moving the misplaced observer block) the flow
runs exactly as described.

---

# STEP 11 — 50 Client Questions & Answers

**Product & business (1–12)**
1. *What exactly did we get for our money so far?* — A complete, tested user
experience: 6 screens, ~11,000 lines of hand-written code, every student and staff
flow clickable end-to-end, brand-consistent design system, on realistic sample data.
2. *Why build the front end first?* — UX is the highest-risk element in campus
adoption. We validated it before paying for servers. Backend is now a well-scoped
contract: the screens define every field, validation and action.
3. *Who are the intended users?* — Students, and four staff roles already modelled
in the login: Faculty, Admin Staff, HoD, Dean.
4. *How many departments does it support?* — 7 fully themed (CS, Maths, Physics,
Chemistry, Biology, English, History); the creation wizard already lists 11
including Management, Commerce, Arts, Law. Adding more is a one-line config change
today, one DB row in Phase 2.
5. *Can students register for events right now?* — The Register Now button and full
UX exist; actual seat booking needs the Phase-2 registrations API. Verified: the
button is present but unwired.
6. *Are the seat counts real?* — No — displayed occupancy is simulated at 72 % of
capacity for demo realism. Real counts come with the registrations table.
7. *Can staff publish an event today?* — They can complete the entire wizard,
preview, and save drafts locally; the final publish is simulated. Wiring it to
`POST /events` is Phase 2.
8. *What happens to photos staff upload?* — They preview instantly and can be
tagged/captioned/deleted, but live in browser memory only. Phase 2 adds object
storage (e.g. S3/Cloudflare R2).
9. *Is there reporting?* — Yes, working today: CSV export of the currently filtered
event list, dated filename, opens in Excel.
10. *Can events be shared socially?* — Yes, working: WhatsApp deep link, email, and
copy-link on every spotlight page; every event has a stable shareable URL (`?id=`).
11. *What's the single biggest gap?* — Persistence. Nothing survives a refresh
except login sessions and wizard drafts. That is precisely the Phase-2 scope.
12. *Could we white-label this for another institution?* — Yes — branding is
centralised in CSS variables (navy/gold) and department config maps; a rebrand is
hours, not weeks.

**Technology choices (13–22)**
13. *Why no React/Angular?* — At this scale a framework adds 40 KB+ runtime,
build tooling, and upgrade churn for no user benefit. Vanilla JS loads instantly
and any JS developer can maintain it. We can adopt a framework in Phase 2 if the
team prefers — the state-object + render pattern we used ports directly.
14. *Why is the code inside the HTML files?* — Deliberate for prototype velocity;
each page is self-contained and independently deployable. Extraction into shared
modules is on the refactor list (auth.js/app.js/bento.js already are extracted).
15. *What external dependencies exist?* — Only two CDN assets: Google Fonts (Inter)
and Font Awesome 6 icons. No npm packages at all — zero supply-chain exposure.
16. *What browsers are supported?* — All evergreen browsers. We use standard APIs:
IntersectionObserver, Clipboard, FileReader — supported in Chrome/Edge/Firefox/
Safari for years. No IE11 (uses ES6+, optional chaining).
17. *Is it mobile-friendly?* — Yes: viewport meta on every page, breakpoints,
hamburger navigation, mirrored mobile filter controls on the spotlight page.
18. *Why localStorage for sessions?* — It's the honest prototype substitute for
server sessions and let us build real expiry logic (24 h / 7 d) that transfers
conceptually to JWT lifetimes in Phase 2.
19. *What was it hosted on?* — Evidence in the code (Cloudflare script injection,
`/design/` base path in git history) shows it ran on Cloudflare Pages' global CDN —
free tier, effectively infinite read scalability.
20. *Any licensing costs?* — None. Fonts and icons are free licences; no commercial
components.
21. *How big is the payload?* — The heaviest page is ~100 KB of HTML+JS plus poster
images; no framework bundle. Effectively instant on campus Wi-Fi.
22. *Is the code documented?* — Yes — section-banner comments throughout, JSDoc on
utilities in app.js/auth.js, and a developer snippet file explaining how to guard
new pages.

**Security (23–32)**
23. *How secure is login today?* — It is a UX prototype: format validation only, no
server verification. We state this openly; no real credentials should be used yet.
24. *Where are passwords stored?* — Nowhere — by design. We refused to store
passwords client-side; hashing (bcrypt) arrives with the Phase-2 auth service.
25. *Can the login be bypassed?* — Yes, by crafting localStorage. Enforcement is a
server responsibility and is scoped for Phase 2; today's guard is a UX device.
26. *Is there XSS protection?* — Partially: the spotlight renderer HTML-escapes all
injected strings via an `escHtml()` utility. The dashboard templates don't yet —
a known hardening task alongside a Content-Security-Policy header.
27. *Are file uploads safe?* — Client-side checks exist (image MIME filter, 5 MB /
8 MB caps). Server-side re-validation, virus scanning and randomised object keys
come with real storage.
28. *Session expiry?* — Implemented: 24 hours default, 7 days with Remember-me;
expired sessions auto-purge on next check.
29. *Role-based access control?* — Roles are captured (student/faculty/admin/hod/
dean) and displayed, but not yet enforced — no page checks `type==='staff'`.
Enforcement matrix is a Phase-2 deliverable.
30. *HTTPS?* — Any recommended host (Cloudflare Pages, Netlify) enforces TLS by
default.
31. *GDPR / data privacy?* — Today no personal data leaves the browser — arguably
the most private architecture possible. Phase 2 will add consent, retention and
deletion policies alongside the users table.
32. *Rate limiting / brute force?* — Not applicable client-side; specified for the
Phase-2 API gateway.

**Scale, reliability, integration (33–42)**
33. *Can it handle 10,000 students?* — Today: yes trivially — static files on CDN;
every user gets their own copy of the app. Phase 2 sizing is driven by writes
(registrations), which a single Postgres instance handles comfortably at this scale.
34. *What if the server fails?* — Today there is no server to fail; the CDN has
multi-region redundancy. Phase 2 design: stateless API behind a load balancer,
managed DB with automated backups and point-in-time recovery.
35. *Concurrent registrations for the last seat?* — Phase-2 answer: atomic
insert-with-count check (single SQL transaction / unique constraint), so
overbooking is impossible.
36. *Can it integrate with our LMS / ERP?* — Yes via Phase-2 REST APIs; the
spotlight page already references LMS in its faculty notes. SSO with the university
identity provider is the recommended integration first.
37. *Calendar integration?* — Not yet; iCal export is a small Phase-2 addition —
the calendar data model already exists in the UI.
38. *Email notifications?* — Not implemented. The wizard already collects
coordinator emails, and deadlines are modelled, so reminder emails are a natural
Phase-2 feature.
39. *Offline support?* — Not currently; a service-worker PWA is feasible later
since the app is already static-asset based.
40. *Multi-campus support?* — Data model extension (campus table above
departments); the theming system already proves per-entity branding works.
41. *Analytics?* — None today. Adding a privacy-friendly analytics snippet is
trivial; Phase 2 can log searches/views for demand insights.
42. *Backup strategy?* — Code is in GitHub (verified remote). User data backup
becomes relevant only when the database exists — daily snapshots + PITR specified.

**Delivery & commercial (43–50)**
43. *How long to production?* — Estimate: 6–10 weeks for Phase 2 core (auth, events
CRUD, registrations, storage, deploy), because every screen contract already
exists. (Present as estimate, not commitment.)
44. *What's technical debt right now?* — Four honest items: event data duplicated
across three files; one duplicate page file; a syntax error in bento.js to fix;
inconsistent auth-guard coverage. All small, all catalogued (see Step 14).
45. *Who can maintain this?* — Any web developer — no framework specialisation
needed. That was a deliberate hiring-risk decision.
46. *Can we see the code?* — Yes, it's in a GitHub repository with commit history
showing iterative development.
47. *What testing exists?* — Manual/exploratory only; no automated tests yet
(verified: no test files). Phase 2 includes an API test suite and smoke tests.
48. *What does hosting cost?* — Today: effectively ₹0 on free static tiers.
Phase 2: a small managed DB + API host, typically low thousands of rupees/month at
university scale.
49. *What if we want a mobile app later?* — The Phase-2 API is app-ready by design;
the responsive web app already covers mobile browsers meanwhile.
50. *What do you need from us to proceed?* — Approval of the Phase-2 scope,
access to the identity provider for SSO decisions, and one pilot department for
next term.

---

# STEP 12 — 50 Technical Interview Questions & Answers

**Architecture & JS (1–14)**
1. *Describe the overall architecture.* — Multi-page static app; each page is a
self-contained mini-app (inline script) plus three shared scripts: `auth.js`
(session), `app.js` (data+utils), `bento.js` (spotlight renderer). No bundler.
2. *How is state managed?* — A per-page plain `state` object mutated by handlers,
followed by explicit render-function calls (`filterEvents()` →
`renderCurrentView()`), i.e. unidirectional data flow without a framework.
3. *Why an IIFE in auth.js?* — Encapsulation: private `AUTH_KEY` constant, single
public surface `window.JainAuth` — the module pattern pre-ESM.
4. *How does the auth guard avoid a flash of protected content?* — It runs
synchronously in `<head>` and uses `window.location.replace()` before first paint,
also keeping login out of the back-button history.
5. *How is deep-linking handled on the spotlight page?* — `URLSearchParams` reads
`?id=` on load; navigation updates it with `history.replaceState` so the URL stays
shareable without page reloads.
6. *How are unique IDs generated for new events?* —
`Date.now().toString(36) + Math.random().toString(36).slice(2)` — collision-safe
enough for a prototype; Phase 2 uses DB-issued IDs/UUIDs.
7. *Walk through the filter pipeline.* — Copy `state.events`; filter by department
slug; filter by computed timeline (dates normalised to midnight, compared to
today); case-insensitive substring search across name/location/organizer/
description; sort by date asc/desc or `localeCompare` on name; write to
`filteredEvents`; update count; re-render active view + stats + calendar.
8. *How does the timeline classification work?* — Both today and the event date are
zeroed to 00:00; `<` → past, equal timestamps → present, else future.
9. *How is the calendar built without a library?* — `new Date(y, m, 1).getDay()`
for leading blanks, `new Date(y, m+1, 0).getDate()` for month length; per-day event
lookup by ISO string match; dots capped at 3 (mini) / 4 (big).
10. *Known timezone pitfall?* — Yes: day cells use `toISOString().split('T')[0]`,
which is UTC — events near midnight can land on the wrong cell in non-UTC
timezones. Logged as a fix (use local date formatting).
11. *How does the CSV export work?* — Map filtered events to quoted rows, join with
newlines, `new Blob([...], {type:'text/csv'})`, `URL.createObjectURL`, synthetic
`<a download>` click, then revoke the URL.
12. *How is the poster fallback chain implemented?* — `getEventPoster()` returns
`ev.poster` or a cyclic pick from an 11-item array by `(id-1) % length`; `<img
onerror>` then swaps to a department-coloured gradient block with the dept name.
13. *What does `void next.offsetWidth` do in the wizard?* — Forces a reflow between
removing and re-adding animation classes so the CSS slide-in animation restarts.
14. *Why `unshift` for new events?* — Newest-first UX: the just-added event appears
at the top of the grid immediately.

**Auth & security (15–24)**
15. *Exact session payload?* — `{name, email, role, type, staffRole?, expiry,
loginTime}` under key `jain_portal_auth`; expiry = now + 24 h or + 7 d.
16. *How is expiry enforced?* — Lazily: `isLoggedIn()` compares `Date.now()` to
`expiry` and removes the key if stale — checked on every guarded page load.
17. *Post-login redirect mechanism?* — `requireAuth()` stashes the attempted URL in
`sessionStorage.jain_redirect_after_login`; the login success handler reads,
clears, and `location.replace()`s to it, defaulting to index.html.
18. *Threat model gaps?* — No server verification; localStorage forgeable; only one
page guarded; tokens (if added later) shouldn't live in localStorage (XSS-readable)
— Phase 2 uses HTTP-only cookies.
19. *Where is XSS mitigated and where not?* — `bento.js` escapes &, <, >, " via
`escHtml()` before template injection; dashboard/manage templates interpolate raw
strings — acceptable while data is hard-coded, must be fixed before user content.
20. *Password strength algorithm?* — Score 0–4: length ≥ 8, /[A-Z]/, /[0-9]/,
/[^A-Za-z0-9]/; maps to Weak/Fair/Good/Strong bars with colours.
21. *Why different password minimums (6 login vs 8 register)?* — Inconsistency in
the prototype — flagged; Phase 2 sets a single server-enforced policy.
22. *How would you add RBAC?* — Server middleware on the API by role claim; client
merely hides UI. Roles already captured at login (`staffRole`).
23. *CSRF relevance?* — None today (no server writes); with cookie sessions in
Phase 2, add SameSite + CSRF tokens.
24. *Upload validation today?* — MIME prefix check (`image/`), size caps 5 MB
(poster) / 8 MB (photos), user-facing error toasts. Server re-validation required
in Phase 2.

**DOM, CSS, UX engineering (25–36)**
25. *How are scroll reveals done?* — IntersectionObserver (threshold ~0.12–0.15)
adds an `is-visible`/`visible` class; CSS transitions handle the animation.
26. *Carousel implementation?* — Index-based slide switching with opacity classes,
5 s `setInterval` autoplay, pause button + hover/focus pause, keyboard arrows, dot
navigation, subtle Ken-Burns zoom on the active image.
27. *Toast pattern?* — Singleton element per page; set text, add `.show`,
`clearTimeout` + `setTimeout` (~3 s) to hide; error variant swaps icon/class.
Duplicated per page — a dedupe candidate.
28. *Modal accessibility measures?* — Backdrop-click close, Escape-key close,
`body.overflow=hidden` scroll lock. Missing: focus trap and `aria-modal` —
improvement item.
29. *How is the drag-and-drop upload built?* — `dragover` (preventDefault +
highlight class), `dragleave`, `drop` → filter `dataTransfer.files` to images →
`URL.createObjectURL` previews into a pending grid.
30. *Difference between FileReader and object URLs here — and why both?* — Wizard
uses FileReader → base64 data-URL (embeddable in preview and persistable in a
draft); manage console uses object URLs (cheaper for many photos, but
non-persistable) — each fits its use case.
31. *How are department themes applied?* — Slug→colour/icon/name maps; colours
injected inline (gradients, dots, border-left accents) so one map change rethemes
every view.
32. *Responsive strategy?* — Mobile-first-ish with max-width breakpoints
(~1024/900/768/640), CSS grid auto-fill card layouts, duplicated mobile controls
(e.g. `bentoDeptSelectMobile`) synced in JS with the desktop ones.
33. *How do desktop/mobile selects stay in sync?* — Both change handlers call the
same function which writes the value into both elements by ID array iteration.
34. *Star rating widget?* — 5 buttons with `data-val`; click sets `starRating` and
toggles `.active` on all buttons ≤ value; validated as required on submit.
35. *Live character counter?* — `oninput` writes `this.value.length` into a counter
span; `maxlength=400` hard-stops input.
36. *How does the stats count-up animate?* — `requestAnimationFrame` loop
incrementing by `ceil(target/36)` until target (in the bento inline script).

**Data & quality (37–50)**
37. *Where is event data defined and what's the drift?* — Three copies:
`index.html` (12 fields, relative poster paths), `app.js` (adds `regCloseDate`,
`tags`, absolute `/design/` paths), `manage_event.html` (4-field slim copy).
Single-source refactor planned; DB solves it permanently.
38. *Why absolute `/design/posters/` paths in app.js?* — Git history shows the site
was re-rooted to a `/design` path on its host (commit: "changed route from root
path to /design path"); the dashboard kept relative paths — so posters can break
depending on deploy root. Known environment-coupling bug.
39. *The bento.js defect — explain it.* — Line 355: a toast-timer declaration was
interrupted by a pasted IntersectionObserver block, producing `letconst observer =`
— a parse-time SyntaxError that disables the whole file (the spotlight's dynamic
rendering). Fix: restore `let _toastTimer = null;` and move the observer block out.
One small PR.
40. *How would you catch that class of bug?* — `node --check`/ESLint in a
pre-commit hook or CI — currently absent; first item of the quality roadmap.
41. *Any dead or duplicate files?* — `Event registration.html` is byte-identical to
`register-event.html` (diff-verified); `posterImages` fallback array; the unused-in-
index parts of app.js. Cleanup listed.
42. *Draft persistence design?* — Serialised 9-field object to
`localStorage.jain_event_draft_v2`; on DOMContentLoaded, parse inside try/catch and
offer restore via `confirm()` keyed on draft title.
43. *What's deliberately simulated and how would you find it in code?* — Three
`setTimeout` blocks in login/register (one commented "replace with real API call"),
the 72 %-of-capacity seat fill in bento.js, the synthesised organizer emails
(slugified name @jainuniversity.ac.in), and the publish handler that only toasts.
44. *Error handling conventions?* — try/catch around all JSON.parse of storage;
guard clauses for missing DOM nodes (`if (!el) return`) and missing app.js; image
onerror fallbacks; validation errors as inline field messages + toasts.
45. *Memory-leak considerations in the photo manager?* — Object URLs are never
`revokeObjectURL`d on delete — minor leak per removed photo; noted for fix.
46. *How is "related events" computed?* — Same department, excluding current id,
`.slice(0,3)`; section hides when empty.
47. *Average rating computation?* — `reduce` sum / count, `toFixed(1)`, re-computed
on every add/delete render.
48. *Escape-key handling pattern?* — Document-level keydown closing whichever
overlays are open (modals, sidebar, preview) — idempotent close functions make this
safe.
49. *What would you refactor first and why?* — (1) fix bento.js parse error
(user-facing breakage); (2) single-source the event data module (correctness);
(3) extract shared toast/nav/sidebar into a common.js (maintainability);
(4) add ESLint + CI (prevention).
50. *Is the codebase Phase-2 ready?* — Yes structurally: clear module seams
(JainAuth contract, data module, render functions that accept event objects), all
API call sites already isolated behind simulated timeouts, and validation rules
that transfer verbatim to server-side schema validation.

---

# STEP 13 — Business Value

- **Centralisation value:** one catalogue replaces posters/WhatsApp chaos —
  measurable in registration-deadline misses avoided (deadline countdowns are built
  ✅) and organiser hours saved (self-service wizard ✅).
- **Cost efficiency:** ₹0 runtime cost today (static hosting); no software licences;
  no framework-specialist hiring premium; the largest normal cost of a project —
  UI/UX iteration — is already sunk and validated.
- **User benefits:** students get search + 3 views + calendar + shareable links +
  mobile support; staff get publishing autonomy plus a photo/review archive that
  compounds into marketing material year over year.
- **Performance:** no bundle, CDN-served, lazy visual effects — effectively instant
  loads on campus networks.
- **Maintainability:** dependency-free, commented, documented guard snippet;
  any web developer can contribute.
- **Security posture:** honest phase separation — no real personal data is at risk
  in Phase 1 because none is collected server-side.
- **Roadmap (recommended):**
  - Phase 2 (6–10 wks): auth service + events CRUD + registrations + object storage
    + deploy — every endpoint mapped in Step 8.
  - Phase 3: notifications/email reminders, iCal export, moderation workflow, SSO.
  - Phase 4: analytics, recommendations, multi-campus, PWA/mobile.

---

# STEP 14 — Strengths & Limitations (all evidence-based)

## Strengths ✅
1. **Exceptional UI completeness & polish** — 6 finished screens, animation system,
   consistent navy/gold design tokens across every file.
2. **Real, working features** — filtering pipeline, 3 view modes, hand-built dual
   calendars, CSV export, draft autosave/restore, drag-drop uploads, star reviews
   with computed averages, WhatsApp/email/copy sharing, deep-linkable event URLs.
3. **Thoughtful engineering details** — pre-paint auth redirect with return-URL
   memory; session TTLs; escHtml sanitiser; onerror poster fallbacks; guard clauses;
   try/catch around all storage parsing; keyboard support (Escape, carousel arrows).
4. **Zero-dependency stack** — no supply chain, no build, deploys anywhere.
5. **Clean upgrade path** — simulated API calls are isolated and even commented for
   replacement; data shapes map 1:1 to a relational schema.

## Limitations / technical debt ⚠️ (each verified)
| # | Item | Evidence | Impact | Fix cost |
|---|---|---|---|---|
| 1 | **bento.js syntax error** (`letconst`, line 355 — misplaced observer block) | `node --check` fails | Spotlight dynamic rendering broken | ~30 min |
| 2 | No backend/persistence — publishes, registrations, photos, reviews don't survive refresh | simulated setTimeout handlers | Prototype-only | Phase 2 |
| 3 | Auth not enforceable; only `index.html` guarded | grep: single `requireAuth` call site | Direct URL access to staff pages | hours (guards) / Phase 2 (real auth) |
| 4 | Event data duplicated ×3 with drift | index.html vs app.js vs manage_event.html | Consistency bugs | ~half day |
| 5 | Duplicate file `Event registration.html` ≡ `register-event.html` | `diff -q` identical | Confusion, double maintenance | minutes |
| 6 | Poster path env coupling (`/design/...` absolute vs relative) | app.js vs index.html | Broken images depending on deploy root | ~1 h |
| 7 | Simulated data presented as real (72 % seats, synthesised organizer emails) | bento.js lines ~150, ~262 | Must be disclosed in demo | Phase 2 |
| 8 | UTC date bug risk in calendars (`toISOString`) | index.html calendar renderers | Wrong-day dots near midnight in IST | ~1 h |
| 9 | No tests, no linting, no CI | repo inspection | Regressions (see #1!) | ~1 day setup |
| 10 | Object URLs never revoked; raw interpolation in dashboard templates; password min 6 vs 8 inconsistency; missing modal focus traps | code review | Minor | small PRs |

**Missing features (not started):** real event registration/booking, notifications,
iCal export, admin approval workflow, analytics, pagination.

---

# STEP 15 — Demo Walkthrough Script

> **Pre-demo checklist (do these BEFORE the meeting):**
> 1. Fix `bento.js` line 355 (restore `let _toastTimer = null;`, relocate the
>    observer block) — otherwise the spotlight page won't populate.
> 2. Serve from the repo root (`python -m http.server`) and spot-check posters on
>    bento.html (the `/design/` paths may need the site served under /design or the
>    paths made relative).
> 3. Clear localStorage for a clean auth demo. Open all pages once to warm CDN fonts.

**Scene 1 — Registration (2 min).** Open `register.html`. Fill name "Priya Nair",
email, student ID, pick Computer Science → *point out the live profile preview card
building initials as you type*. Continue → type a weak then strong password →
*"watch the strength meter respond — length, capitals, numbers, symbols."* Tick
terms, create → success card. **Say:** "Frictionless two-step onboarding with
instant feedback at every field." **They should notice:** polish and validation.
**Business value:** low-abandonment signup.

**Scene 2 — Login & guard (2 min).** First, in a new tab try to open `index.html`
while logged out → *it bounces to login*. **Say:** "Protected pages redirect and
remember where you were headed." Log in as Student (any email + 6-char password —
*disclose:* "verification is simulated in this phase"), point out the staff toggle
and its four roles, remember-me. Success overlay → lands back on the dashboard.
**Notice:** navbar now shows the user's name, role and initials.

**Scene 3 — Dashboard discovery (4 min).** Point at live stats (11 total, upcoming,
today, department breakdown). Type "physics" in search → instant narrowing + result
count. Clear; open the Department pill → choose Computer Science → *a removable
filter tag appears*; add Timeline→Upcoming. Switch Grid → List → Calendar; in
Calendar click a dotted day → side panel lists that day's events. Click **Export
CSV** → open the file. **Say:** "Search, filters, three views and reporting — all
running instantly in the browser." **Business value:** findability + admin
reporting.

**Scene 4 — Quick add/edit (2 min).** Click "+ Add Event", create "Robotics Demo
Day" for next week → toast → it appears first in the grid, correct department
colour. **Disclose:** "In this phase it lives in memory; the database in Phase 2
makes it permanent." **Value:** staff agility.

**Scene 5 — Spotlight page (4 min).** Click the AI & ML Workshop card → URL becomes
`bento.html?id=1`. Tour: status badge, animated seat bar (*disclose simulated
occupancy*), deadline with days-remaining, organizer card, related CS events at the
bottom — click one to show instant switching; use the nav dropdowns too. Scroll:
reveal animations, gallery filter + lightbox. Click WhatsApp share → *the wa.me
composer opens with title + link*. **Value:** "This is the page students share —
it sells the event."

**Scene 6 — Event creation wizard (4 min).** Sidebar → Register Event. Fill step 1;
use capacity +/− stepper; toggle Hybrid mode; upload a poster → instant preview
with size. Click **Save Draft**, refresh the page → restore prompt → accept.
**Say:** "Nobody loses a half-finished form." Continue to coordinator details →
**Preview** → *"exactly what students will see"* → Publish → success toast →
returns to dashboard (*disclose simulated publish*). **Value:** self-service
publishing with confidence.

**Scene 7 — Manage console (3 min).** Open `manage_event.html`. Search "physics" →
select Quantum Physics Lecture. Drag 2–3 images onto the drop zone → pending grid →
choose album "Lab Session", caption, Upload → gallery + count updates. Add a review:
name, "Physics, 2nd Year", 5 stars, text (watch the 0/400 counter), Add → appears
atop the seeded reviews and the **average rating recalculates**. Delete one to show
control. **Value:** institutional memory + social proof.

**Scene 8 — Logout (30 s).** Profile dropdown → Sign out → back at login; try
`index.html` again → blocked. "Full session lifecycle."

---

# STEP 16 — Executive Summaries

## 60-second elevator pitch
"We've built Jain University's event portal — think Eventbrite, but branded and
department-aware for one campus. Students search, filter and calendar-browse every
event, open a rich spotlight page with seats and deadlines, and share it straight to
WhatsApp. Staff publish events through a guided wizard with draft autosave, and
preserve photos and star-rated reviews afterwards. The entire experience — six
screens, eleven thousand lines of dependency-free code — is finished and clickable
today on sample data. Phase 2 plugs in the database and APIs the screens already
define. The hard part — an experience people actually want to use — is done."

## 5-minute executive summary
1. **Problem (30 s):** event info is fragmented; deadlines missed; no publishing
   channel; no archive.
2. **Solution (90 s):** one portal — discovery (search/filters/3 views/calendar),
   presentation (spotlight with posters, seats, countdowns, sharing), publishing
   (2-step wizard + drafts), memory (photos + reviews). Demo 2–3 highlights live.
3. **Status (60 s):** UI-complete Phase 1; auth, persistence and registration are
   simulated by design; data model and API contract already derived from the
   screens.
4. **Tech (45 s):** zero-dependency HTML/CSS/JS; CDN-hosted; ₹0 runtime cost; any
   developer can maintain it.
5. **Ask (45 s):** approve Phase 2 (6–10 weeks: auth, events CRUD, registrations,
   storage); pilot with one department next term.

## 10-minute condensed version
Elevator pitch → 3-minute live demo (dashboard filter → spotlight → wizard draft
restore) → architecture-in-one-slide (Step 6.1 diagram) → honest status table
(working ✅ / simulated ⚠️) → schema+API readiness (Steps 7–8) → roadmap & ask.

## Key selling points
- Complete, polished, testable UX today — the highest-risk work is done.
- Zero licence and near-zero hosting cost; zero dependency risk.
- Shareability built-in (WhatsApp/email/link) — grows adoption organically.
- Phase-2 backend is a bounded, low-risk contract already specified by the UI.

## Technical highlights
Hand-built calendar engine · unidirectional state/render pattern without a framework
· session TTL + return-URL auth flow · drag-drop uploads with previews · CSV export ·
draft autosave · IntersectionObserver animations · HTML-escaping utility · deep-
linkable event URLs.

## Final recommendations
1. **Before the client meeting:** fix bento.js line 355; verify poster paths;
   delete the duplicate `Event registration.html`.
2. **Frame honestly:** "UI-complete Phase 1" — disclose simulated seats/login when
   showing them; it builds trust and sets up the Phase-2 sale.
3. **Close with a concrete ask:** Phase-2 approval + one pilot department.

---
*End of presentation pack. Every claim above is traceable to the files listed in
Step 1.7; items marked ⚠️ must be disclosed, never demoed as production behaviour.*

