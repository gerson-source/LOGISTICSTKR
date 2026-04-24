# GA Delivery Planner

A mobile-first, PWA-ready equipment tracking and delivery coordination tool for construction site teams. Built as a single HTML file with a live Supabase backend.

---

## What It Does

Tracks equipment, tools, and attachments across job sites in real time. Dispatchers and foremen can log moves, scan QR codes to pull up item details on mobile, and monitor what's at each site — all without installing an app.

---

## Features

### Inventory Management
- **Equipment** — machines tracked by ID (e.g. `E-001`), name, type, location, status, and mobilization truck
- **Tools** — tracked by ID (e.g. `T-001`), type, location, and status
- **Attachments** — tracked by ID (e.g. `A-001`), paired to specific machines, with location and condition notes
- Auto-incrementing IDs (`↻ Auto` button generates the next sequential ID)
- Inline rename on any item
- Condition badge — quick notes logged directly on a card (e.g. "Needs service", "Flat tire")
- Status toggle — flip between **In Use** / **Available** with one tap

### Move Planning & Logging
- Queue a move for any equipment, tool, or attachment
- Moves progress through three states: **Queued → Transit → Complete**
- Full move log per category with timestamps, from/to locations, truck, and notes
- Copy log to clipboard for pasting into texts or reports
- Clear completed moves from the log

### Sites View
- Aggregated view of every site with counts of machines, tools, and attachments on location
- Inbound indicator — shows items with queued or in-transit moves arriving at a site
- QR code button per site (links to `?site=site-slug`) — *launcher ready, page in progress*
- Filter dropdown to isolate a single site

### QR Code Scanning
- Each item has a QR code linking to `gatracker.netlify.app?item=E-001`
- Scanning on mobile loads a clean item detail view (name, location, status) without the full app UI
- Site QR codes planned — will open a foreman landing page at `?site=site-001`

### Real-Time Sync
- Powered by **Supabase Realtime** — changes from any device (INSERT / UPDATE / DELETE) push instantly to all connected clients
- Live indicator dot in the header with item counts
- No page refresh needed

### PWA / Mobile
- Installable on iOS and Android home screens via `manifest.json`
- `apple-mobile-web-app-capable` meta tags for full-screen iOS PWA mode
- Safe area insets respected on notched devices
- Dark mode — respects `prefers-color-scheme`, toggle in header, preference saved to `localStorage`
- Fully responsive — single-column layout on mobile, sticky sidebar on desktop
- Modals slide up as bottom sheets on mobile
- All tap targets meet 44px minimum

---

## Supabase Database Tables

| Table | Purpose |
|---|---|
| `equipment` | Machine inventory |
| `tools` | Tool inventory |
| `attachments` | Attachment inventory, `paired_eq_id` links to equipment |
| `locations` | Site list with `name` and `slug` fields |
| `moves` | Move log — `kind` is `equipment`, `tool`, or `attachment` |
| `machine_types` | Dropdown options for equipment types |
| `tool_types` | Dropdown options for tool types |
| `mobilization_options` | Truck/transport options |
| `statuses` | Status options (In Use, Available, etc.) |

---

## File Structure

```
/
├── index.html       # Entire application — HTML, CSS, and JS in one file
└── manifest.json    # PWA manifest for home screen install
```

---

## Deployment

### Netlify (recommended — drag and drop)
1. Go to [netlify.com](https://netlify.com)
2. Drag your project folder onto the Netlify dashboard
3. Your live URL will be something like `https://ga-tracker.netlify.app`

### GitHub Pages
1. Push `index.html` and `manifest.json` to a GitHub repo
2. Go to **Settings → Pages → Branch: main → Save**
3. Live at `https://YOUR-USERNAME.github.io/REPO-NAME`

---

## Configuration

The Supabase project URL and anon key are set at the top of `index.html`:

```js
const sb = supabase.createClient('YOUR_SUPABASE_URL', 'YOUR_ANON_KEY');
```

Replace those two values with your own from the Supabase dashboard under **Project Settings → API**.

---

## What's In Progress

| Feature | Status |
|---|---|
| Foreman site landing page (`?site=site-001`) | 🔧 In progress |
| Site QR code modal (`openSiteQRModal`) | 🔧 Built, not wired |
| Monday tool talk screen | 📋 Planned |
| Request system (controlled request types) | 📋 Planned |
| Warehouse to-do dashboard | 📋 Planned |
| Materials tracking | 📋 Planned |
| Mobile item actions (beyond read-only view) | 📋 Planned |

---

## Browser Support

Chrome, Safari, Firefox, Edge — all modern versions. Optimized for iOS Safari (PWA install) and Chrome on Android.
