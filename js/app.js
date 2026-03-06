// --- Map Setup ---
const map = L.map('map').setView([39.0997, -94.5786], 13); // Kansas City center

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19
}).addTo(map);

// Layer groups for markers and radius circle
const markersLayer = L.layerGroup().addTo(map);
const radiusLayer = L.layerGroup().addTo(map);

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
    try {
      await searchPotholes(lat, lng);
    } catch (err) {
      showError('Unable to fetch data. Please try again in a moment.');
    }
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

let currentRecords = [];
let sortColumn = 'open_date_time';
let sortAsc = false;

function renderTable(records) {
  currentRecords = records;
  const panel = document.getElementById('results-panel');
  const count = document.getElementById('results-count');

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
