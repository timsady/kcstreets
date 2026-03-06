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
