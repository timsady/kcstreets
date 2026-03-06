// --- Map Setup ---
const map = L.map('map').setView([39.0997, -94.5786], 13); // Kansas City center

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19
}).addTo(map);

// Layer groups for markers and radius circle
const markersLayer = L.layerGroup().addTo(map);
const radiusLayer = L.layerGroup().addTo(map);
