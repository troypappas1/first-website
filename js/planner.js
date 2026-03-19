// js/planner.js

// Initialize Leaflet map
const map = L.map('map').setView([20, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const cityInput = document.getElementById('cityInput');
const suggestions = document.getElementById('suggestions');
const disasterSelect = document.getElementById('disasterSelect');
const infoDiv = document.getElementById('cityInfo');

let mapMarkers = [];

// Debounce input for city suggestions
let debounceTimer;
cityInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchCitySuggestions, 300);
});

// Fetch city suggestions from Photon API
async function fetchCitySuggestions() {
  const value = cityInput.value.trim();
  suggestions.innerHTML = '';
  if (!value) return;

  try {
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(value)}&limit=5`);
    const data = await res.json();
    if (!data.features) return;

    data.features.forEach(place => {
      const cityName = place.properties.name;
      const country = place.properties.country;
      if (!cityName) return;

      const li = document.createElement('li');
      li.textContent = cityName + (country ? `, ${country}` : '');
      li.style.cursor = 'pointer';
      li.onclick = () => {
        cityInput.value = li.textContent;
        suggestions.innerHTML = '';
        findShelters(place);
      };
      suggestions.appendChild(li);
    });
  } catch (err) {
    console.error("Photon API error:", err);
  }
}

// Main function to find shelters and show map info
async function findShelters(place) {
  const [lon, lat] = place.geometry.coordinates;
  map.setView([lat, lon], 12);

  // Clear old markers
  mapMarkers.forEach(m => map.removeLayer(m));
  mapMarkers = [];

  // Bounding box ~5km
  const delta = 0.05;
  const bbox = `${lat - delta},${lon - delta},${lat + delta},${lon + delta}`;

  const overpassQuery = `
    [out:json][timeout:25];
    (
      node["amenity"="shelter"](${bbox});
      way["amenity"="shelter"](${bbox});
      node["emergency"="fire_station"](${bbox});
      node["emergency"="hospital"](${bbox});
      node["building"="public"](${bbox});
    );
    out center;
  `;

  let shelters = [];

  try {
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.elements) {
      data.elements.forEach(el => {
        let latS = el.lat || el.center?.lat;
        let lonS = el.lon || el.center?.lon;
        let name = el.tags?.name || "Shelter";
        let type = el.tags?.amenity || el.tags?.emergency || el.tags?.building || "general";
        if (latS && lonS) {
          shelters.push({ name, lat: latS, lon: lonS, type });
        }
      });
    }
  } catch (err) {
    console.error("Overpass API error:", err);
  }

  // Fallback if no shelters found
  if (shelters.length === 0) {
    shelters = [
      { name: "Community Shelter", lat: lat + 0.01, lon: lon + 0.01, type: "general" },
      { name: "Emergency Center", lat: lat - 0.01, lon: lon - 0.01, type: "general" }
    ];
  }

  // Filter by selected disaster
  const disaster = disasterSelect.value || "General";
  let filtered = shelters;

  if (disaster === "Fire") {
    filtered = shelters.filter(s => s.type === "fire_station" || s.type === "shelter" || s.type === "public");
  } else if (disaster === "Earthquake") {
    filtered = shelters.filter(s => s.type === "shelter" || s.type === "public");
  } else if (disaster === "Flood") {
    filtered = shelters.filter(s => s.lat >= lat); // simple approximation: north = higher ground
  }

  if (filtered.length === 0) filtered = shelters;

  // Add markers
  filtered.forEach(spot => {
    const marker = L.marker([spot.lat, spot.lon])
      .addTo(map)
      .bindPopup(`${spot.name} (${spot.type})`);
    mapMarkers.push(marker);
  });

  // Closest shelter
  filtered.sort((a, b) => Math.hypot(a.lat - lat, a.lon - lon) - Math.hypot(b.lat - lat, b.lon - lon));
  const recommended = filtered[0];

  infoDiv.innerHTML = `
    <p><strong>City:</strong> ${place.properties.name}, ${place.properties.country || ""}</p>
    <p><strong>Disaster:</strong> ${disaster}</p>
    <p><strong>Recommended Shelter:</strong> ${recommended.name} (${recommended.type})</p>
    <p><em>Showing ${filtered.length} shelters suitable for this disaster</em></p>
  `;
}