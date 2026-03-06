# KC Streets Pothole Lookup — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a static web app that queries KCMO 311 pothole tickets by location with radius filtering, displaying results on an interactive map and sortable table.

**Architecture:** Pure client-side SPA — single `index.html` with embedded CSS/JS (or linked files). Leaflet map queries the SODA API directly from the browser. Nominatim handles geocoding. No build tools needed.

**Tech Stack:** Vanilla HTML/CSS/JS, Leaflet.js (CDN), OpenStreetMap tiles, SODA API, Nominatim API

**Design doc:** `docs/plans/2026-03-06-kcstreets-pothole-lookup-design.md`

---

### Task 1: Project Scaffolding + Git Init

**Files:**
- Create: `index.html`
- Create: `css/style.css`
- Create: `js/app.js`

**Step 1: Initialize git repo**

```bash
cd C:/dev/kcstreets
git init
```

**Step 2: Create `.gitignore`**

```
.DS_Store
Thumbs.db
*.swp
.env
```

**Step 3: Create `index.html` with base structure**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KC Streets — Pothole Lookup</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div id="app">
    <aside id="search-panel">
      <h1>KC Streets</h1>
      <p class="subtitle">Pothole Report Lookup</p>

      <form id="search-form">
        <label for="address-input">Search by address</label>
        <div class="input-group">
          <input type="text" id="address-input" placeholder="e.g. 31st & Main, Kansas City, MO">
          <button type="submit" id="search-btn">Search</button>
        </div>
      </form>

      <div class="radius-control">
        <label for="radius-slider">Search radius: <span id="radius-value">50</span> ft</label>
        <input type="range" id="radius-slider" min="10" max="100" value="50" step="5">
      </div>

      <div id="summary" class="summary hidden">
        <h2>Results Summary</h2>
        <div id="summary-content"></div>
      </div>
    </aside>

    <main>
      <div id="map"></div>
      <div id="results-panel" class="hidden">
        <h2>Pothole Reports <span id="results-count"></span></h2>
        <div class="table-wrapper">
          <table id="results-table">
            <thead>
              <tr>
                <th data-sort="open_date_time">Date</th>
                <th data-sort="current_status">Status</th>
                <th data-sort="incident_address">Address</th>
                <th data-sort="days_to_close">Days to Close</th>
                <th data-sort="report_source">Source</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </main>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

**Step 4: Create empty `css/style.css` and `js/app.js`**

`css/style.css` — empty file for now.
`js/app.js` — empty file for now.

**Step 5: Verify**

Open `index.html` in a browser. Should see the heading, search form, and radius slider. Map area will be blank (no JS yet).

**Step 6: Commit**

```bash
git add .gitignore index.html css/style.css js/app.js docs/
git commit -m "feat: project scaffolding with base HTML structure

Adds index.html with search panel, map container, and results table markup.
Includes Leaflet CSS/JS from CDN. Empty CSS and JS files for next steps."
```

---

### Task 2: Initialize Leaflet Map

**Files:**
- Modify: `js/app.js`

**Step 1: Add map initialization code**

In `js/app.js`:

```javascript
// --- Map Setup ---
const map = L.map('map').setView([39.0997, -94.5786], 13); // Kansas City center

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19
}).addTo(map);

// Layer groups for markers and radius circle
const markersLayer = L.layerGroup().addTo(map);
const radiusLayer = L.layerGroup().addTo(map);
```

**Step 2: Add minimal CSS for layout**

In `css/style.css`:

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #1a1a1a;
}

#app {
  display: flex;
  height: 100vh;
}

#search-panel {
  width: 360px;
  min-width: 360px;
  padding: 24px;
  background: #f8f9fa;
  border-right: 1px solid #dee2e6;
  overflow-y: auto;
}

main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

#map {
  flex: 1;
  min-height: 400px;
}

h1 { font-size: 1.5rem; margin-bottom: 2px; }
.subtitle { color: #666; margin-bottom: 20px; font-size: 0.9rem; }

/* Search form */
#search-form { margin-bottom: 16px; }
#search-form label { display: block; font-weight: 600; margin-bottom: 6px; font-size: 0.85rem; }
.input-group { display: flex; gap: 8px; }
#address-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.9rem;
}
#search-btn {
  padding: 8px 16px;
  background: #0d6efd;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
}
#search-btn:hover { background: #0b5ed7; }

/* Radius slider */
.radius-control { margin-bottom: 20px; }
.radius-control label { display: block; font-weight: 600; margin-bottom: 6px; font-size: 0.85rem; }
#radius-slider { width: 100%; }

/* Summary */
.summary { background: white; border-radius: 8px; padding: 16px; border: 1px solid #dee2e6; }
.summary h2 { font-size: 1rem; margin-bottom: 12px; }

/* Results table */
#results-panel { padding: 16px 24px; border-top: 1px solid #dee2e6; max-height: 300px; overflow-y: auto; }
#results-panel h2 { font-size: 1rem; margin-bottom: 12px; }
.table-wrapper { overflow-x: auto; }
#results-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
#results-table th {
  text-align: left;
  padding: 8px;
  border-bottom: 2px solid #dee2e6;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}
#results-table th:hover { background: #e9ecef; }
#results-table td { padding: 8px; border-bottom: 1px solid #f0f0f0; }
#results-table tr:hover { background: #f8f9fa; }

.hidden { display: none; }

/* Status badges */
.status-open { color: #dc3545; font-weight: 600; }
.status-resolved { color: #198754; font-weight: 600; }

/* Responsive */
@media (max-width: 768px) {
  #app { flex-direction: column; height: auto; }
  #search-panel { width: 100%; min-width: unset; border-right: none; border-bottom: 1px solid #dee2e6; }
  #map { min-height: 50vh; }
}
```

**Step 3: Verify**

Open `index.html` in browser. Map should render centered on Kansas City with the search panel on the left.

**Step 4: Commit**

```bash
git add js/app.js css/style.css
git commit -m "feat: initialize Leaflet map and base layout CSS

Map centered on Kansas City with OpenStreetMap tiles.
Responsive sidebar layout with search controls."
```

---

### Task 3: Geocoding + Map Click

**Files:**
- Modify: `js/app.js`

**Step 1: Add geocoding and click-to-search**

Append to `js/app.js`:

```javascript
// --- State ---
let currentLat = null;
let currentLng = null;

// --- Radius slider ---
const radiusSlider = document.getElementById('radius-slider');
const radiusValue = document.getElementById('radius-value');
radiusSlider.addEventListener('input', () => {
  radiusValue.textContent = radiusSlider.value;
});
radiusSlider.addEventListener('change', () => {
  if (currentLat && currentLng) {
    searchPotholes(currentLat, currentLng);
  }
});

// --- Geocoding ---
async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address + ', Kansas City, MO')}&format=json&limit=1`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'KCStreets-PotholeLookup/1.0' }
  });
  const data = await response.json();
  if (data.length === 0) {
    throw new Error('Address not found');
  }
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

// --- Search form ---
const searchForm = document.getElementById('search-form');
const addressInput = document.getElementById('address-input');

searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const address = addressInput.value.trim();
  if (!address) return;

  setLoading(true);
  try {
    const { lat, lng } = await geocodeAddress(address);
    currentLat = lat;
    currentLng = lng;
    map.setView([lat, lng], 17);
    await searchPotholes(lat, lng);
  } catch (err) {
    showError('Address not found. Try clicking the map instead.');
  } finally {
    setLoading(false);
  }
});

// --- Map click ---
map.on('click', async (e) => {
  currentLat = e.latlng.lat;
  currentLng = e.latlng.lng;
  map.setView([currentLat, currentLng], 17);
  setLoading(true);
  try {
    await searchPotholes(currentLat, currentLng);
  } catch (err) {
    showError('Unable to fetch data. Please try again in a moment.');
  } finally {
    setLoading(false);
  }
});

// --- UI helpers ---
function setLoading(isLoading) {
  const btn = document.getElementById('search-btn');
  btn.disabled = isLoading;
  btn.textContent = isLoading ? 'Searching...' : 'Search';
}

function showError(message) {
  const summary = document.getElementById('summary');
  const content = document.getElementById('summary-content');
  summary.classList.remove('hidden');
  content.innerHTML = `<p class="error-message">${message}</p>`;
  document.getElementById('results-panel').classList.add('hidden');
}

// --- Placeholder for next task ---
async function searchPotholes(lat, lng) {
  console.log(`Search at ${lat}, ${lng} radius=${radiusSlider.value}ft`);
}
```

**Step 2: Add error message styling to CSS**

Append to `css/style.css`:

```css
.error-message { color: #dc3545; font-style: italic; }
```

**Step 3: Verify**

Open in browser. Type an address (e.g. "31st and Main") and submit — map should center on the geocoded location. Click the map — console should log coordinates. Radius slider should update label.

**Step 4: Commit**

```bash
git add js/app.js css/style.css
git commit -m "feat: add geocoding, address search, and map click

Nominatim geocoding for address input. Click-to-search on map.
Radius slider wired up. Loading state and error display."
```

---

### Task 4: SODA API Query

**Files:**
- Modify: `js/app.js`

**Step 1: Replace the placeholder `searchPotholes` with real API call**

Replace the placeholder function in `js/app.js`:

```javascript
// --- SODA API ---
const SODA_BASE = 'https://data.kcmo.org/resource/d4px-6rwg.json';

function feetToMeters(feet) {
  return feet * 0.3048;
}

async function searchPotholes(lat, lng) {
  const radiusFt = parseInt(radiusSlider.value);
  const radiusM = feetToMeters(radiusFt);

  const where = `issue_type='A Pothole' AND within_circle(lat_long, ${lat}, ${lng}, ${radiusM})`;
  const params = new URLSearchParams({
    '$where': where,
    '$order': 'open_date_time DESC',
    '$limit': '1000'
  });

  const response = await fetch(`${SODA_BASE}?${params}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  const data = await response.json();

  displayResults(lat, lng, radiusFt, data);
}
```

**Step 2: Add `displayResults` function**

```javascript
function displayResults(lat, lng, radiusFt, records) {
  // Clear previous
  markersLayer.clearLayers();
  radiusLayer.clearLayers();

  // Draw radius circle
  L.circle([lat, lng], {
    radius: feetToMeters(radiusFt),
    color: '#0d6efd',
    fillColor: '#0d6efd',
    fillOpacity: 0.1,
    weight: 2
  }).addTo(radiusLayer);

  // Search center marker
  L.circleMarker([lat, lng], {
    radius: 6,
    color: '#0d6efd',
    fillColor: '#0d6efd',
    fillOpacity: 1,
    weight: 2
  }).addTo(radiusLayer).bindPopup('Search location');

  if (records.length === 0) {
    showError(`No pothole reports found within ${radiusFt}ft of this location.`);
    return;
  }

  // Add markers
  records.forEach(r => {
    if (!r.latitude || !r.longitude) return;
    const isOpen = r.current_status !== 'resolved';
    const color = isOpen ? '#dc3545' : '#198754';
    const statusText = isOpen ? 'Open' : 'Resolved';

    const marker = L.circleMarker([parseFloat(r.latitude), parseFloat(r.longitude)], {
      radius: 7,
      color: color,
      fillColor: color,
      fillOpacity: 0.7,
      weight: 1
    }).addTo(markersLayer);

    const openDate = r.open_date_time ? new Date(r.open_date_time).toLocaleDateString() : 'N/A';
    const resolvedDate = r.resolved_date ? new Date(r.resolved_date).toLocaleDateString() : 'N/A';

    marker.bindPopup(`
      <strong>Pothole Report</strong><br>
      <strong>Status:</strong> ${statusText}<br>
      <strong>Opened:</strong> ${openDate}<br>
      <strong>Resolved:</strong> ${resolvedDate}<br>
      <strong>Address:</strong> ${r.incident_address || 'N/A'}<br>
      <strong>Days to close:</strong> ${r.days_to_close || 'N/A'}<br>
      <strong>Source:</strong> ${r.report_source || 'N/A'}
    `);
  });

  // Summary
  renderSummary(records);

  // Table
  renderTable(records);
}
```

**Step 3: Verify**

Open in browser. Search "31st and Main" — should see actual pothole markers (or "no results" if none nearby). Try clicking different areas of KC.

**Step 4: Commit**

```bash
git add js/app.js
git commit -m "feat: add SODA API query with within_circle geospatial filter

Queries OpenDataKC for pothole 311 tickets within user-specified radius.
Displays color-coded markers (red=open, green=resolved) with popup details.
Draws search radius circle on map."
```

---

### Task 5: Summary Stats Panel

**Files:**
- Modify: `js/app.js`

**Step 1: Add `renderSummary` function**

```javascript
function renderSummary(records) {
  const summary = document.getElementById('summary');
  const content = document.getElementById('summary-content');
  summary.classList.remove('hidden');

  const total = records.length;
  const open = records.filter(r => r.current_status !== 'resolved').length;
  const resolved = total - open;

  const dates = records
    .map(r => r.open_date_time ? new Date(r.open_date_time) : null)
    .filter(Boolean)
    .sort((a, b) => a - b);

  const firstReported = dates.length > 0 ? dates[0].toLocaleDateString() : 'N/A';
  const lastReported = dates.length > 0 ? dates[dates.length - 1].toLocaleDateString() : 'N/A';

  const daysToClose = records
    .map(r => parseInt(r.days_to_close))
    .filter(d => !isNaN(d));
  const avgDays = daysToClose.length > 0
    ? Math.round(daysToClose.reduce((a, b) => a + b, 0) / daysToClose.length)
    : 'N/A';

  content.innerHTML = `
    <div class="summary-grid">
      <div class="stat">
        <span class="stat-value">${total}</span>
        <span class="stat-label">Total Reports</span>
      </div>
      <div class="stat">
        <span class="stat-value status-open">${open}</span>
        <span class="stat-label">Open</span>
      </div>
      <div class="stat">
        <span class="stat-value status-resolved">${resolved}</span>
        <span class="stat-label">Resolved</span>
      </div>
      <div class="stat">
        <span class="stat-value">${avgDays}</span>
        <span class="stat-label">Avg Days to Close</span>
      </div>
    </div>
    <p class="date-range">First reported: ${firstReported}<br>Last reported: ${lastReported}</p>
  `;
}
```

**Step 2: Add summary grid CSS**

Append to `css/style.css`:

```css
.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}
.stat { text-align: center; }
.stat-value { display: block; font-size: 1.5rem; font-weight: 700; }
.stat-label { display: block; font-size: 0.75rem; color: #666; text-transform: uppercase; }
.date-range { font-size: 0.8rem; color: #555; line-height: 1.5; }
```

**Step 3: Verify**

Search a location — summary panel should show total, open, resolved counts, avg days to close, and date range.

**Step 4: Commit**

```bash
git add js/app.js css/style.css
git commit -m "feat: add results summary stats panel

Shows total reports, open/resolved counts, avg days to close,
and first/last reported dates computed from query results."
```

---

### Task 6: Sortable Results Table

**Files:**
- Modify: `js/app.js`

**Step 1: Add `renderTable` function**

```javascript
let currentRecords = [];
let sortColumn = 'open_date_time';
let sortAsc = false;

function renderTable(records) {
  currentRecords = records;
  const panel = document.getElementById('results-panel');
  const count = document.getElementById('results-count');
  const tbody = document.querySelector('#results-table tbody');

  panel.classList.remove('hidden');
  count.textContent = `(${records.length})`;

  sortAndRenderRows();
}

function sortAndRenderRows() {
  const tbody = document.querySelector('#results-table tbody');
  const sorted = [...currentRecords].sort((a, b) => {
    let valA = a[sortColumn] || '';
    let valB = b[sortColumn] || '';

    if (sortColumn === 'days_to_close') {
      valA = parseInt(valA) || 0;
      valB = parseInt(valB) || 0;
    } else if (sortColumn === 'open_date_time') {
      valA = new Date(valA || 0).getTime();
      valB = new Date(valB || 0).getTime();
    } else {
      valA = valA.toString().toLowerCase();
      valB = valB.toString().toLowerCase();
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  tbody.innerHTML = sorted.map(r => {
    const date = r.open_date_time ? new Date(r.open_date_time).toLocaleDateString() : 'N/A';
    const isOpen = r.current_status !== 'resolved';
    const statusClass = isOpen ? 'status-open' : 'status-resolved';
    const statusText = isOpen ? 'Open' : 'Resolved';
    return `<tr>
      <td>${date}</td>
      <td><span class="${statusClass}">${statusText}</span></td>
      <td>${r.incident_address || 'N/A'}</td>
      <td>${r.days_to_close || 'N/A'}</td>
      <td>${r.report_source || 'N/A'}</td>
    </tr>`;
  }).join('');

  // Update sort indicators
  document.querySelectorAll('#results-table th').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.sort === sortColumn) {
      th.classList.add(sortAsc ? 'sort-asc' : 'sort-desc');
    }
  });
}

// Column header click sorting
document.querySelectorAll('#results-table th[data-sort]').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.dataset.sort;
    if (sortColumn === col) {
      sortAsc = !sortAsc;
    } else {
      sortColumn = col;
      sortAsc = true;
    }
    sortAndRenderRows();
  });
});
```

**Step 2: Add sort indicator CSS**

Append to `css/style.css`:

```css
#results-table th.sort-asc::after { content: ' ▲'; font-size: 0.7rem; }
#results-table th.sort-desc::after { content: ' ▼'; font-size: 0.7rem; }
```

**Step 3: Verify**

Search a location with results. Table should render with data. Click column headers to sort ascending/descending.

**Step 4: Commit**

```bash
git add js/app.js css/style.css
git commit -m "feat: add sortable results table

Displays pothole reports in a table with sortable columns:
date, status, address, days to close, and source.
Click headers to toggle sort direction."
```

---

### Task 7: Final Polish + Manual Test

**Files:**
- Modify: `index.html` (add favicon meta)
- Modify: `css/style.css` (any needed tweaks)

**Step 1: Add meta tags and noscript fallback to `index.html`**

Add inside `<head>`:

```html
<meta name="description" content="Search historical KCMO 311 pothole reports by location. Find pothole reporting history near any Kansas City address.">
```

Add before closing `</body>`:

```html
<noscript>
  <p style="padding: 40px; text-align: center;">This app requires JavaScript to run.</p>
</noscript>
```

**Step 2: Full manual test**

Test the following in a browser:

1. Page loads with map centered on KC — PASS?
2. Type "31st and Main" → search → map centers + markers appear or "no results" message — PASS?
3. Click a different spot on map → new search executes — PASS?
4. Adjust radius slider → re-queries with new radius — PASS?
5. Click table column headers → rows re-sort — PASS?
6. Click a marker → popup shows ticket details — PASS?
7. Resize to mobile width → layout stacks vertically — PASS?
8. Search nonsense address → error message appears — PASS?

**Step 3: Commit**

```bash
git add index.html css/style.css
git commit -m "feat: add meta tags and noscript fallback

Adds SEO description meta tag and noscript message for
browsers without JavaScript."
```

---

## Summary

| Task | Description | Dependencies |
|------|-------------|-------------|
| 1 | Project scaffolding + git init | None |
| 2 | Leaflet map + base CSS layout | Task 1 |
| 3 | Geocoding + map click + radius slider | Task 2 |
| 4 | SODA API query + map markers | Task 3 |
| 5 | Summary stats panel | Task 4 |
| 6 | Sortable results table | Task 4 |
| 7 | Final polish + manual test | Tasks 5, 6 |

Tasks 5 and 6 are independent of each other and can be done in parallel.
