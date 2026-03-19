// Initialize Leaflet map
const map = L.map('map').setView([20, 0], 2); // World view
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const cityInput = document.getElementById('cityInput');
const suggestions = document.getElementById('suggestions');
let mapMarkers = [];

// Debounce input to avoid too many API calls
let debounceTimer;
cityInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchCitySuggestions, 300); // 300ms delay
});

// Fetch city suggestions from Photon API
async function fetchCitySuggestions() {
  const value = cityInput.value.trim();
  suggestions.innerHTML = '';
  if (!value) return;

  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(value)}&limit=5`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.features) return;

    data.features.forEach(place => {
      // Only keep cities or towns
      if (!place.properties.city && !place.properties.name) return;

      const li = document.createElement('li');
      li.textContent = place.properties.name + (place.properties.country ? `, ${place.properties.country}` : '');
      li.className = 'p-2 cursor-pointer hover:bg-gray-200';
      li.onclick = () => {
        cityInput.value = li.textContent;
        suggestions.innerHTML = '';
        showSafeSpots(place);
      };
      suggestions.appendChild(li);
    });
  } catch (err) {
    console.error(err);
  }
}

// Show example safe spots on the map
function showSafeSpots(place) {
  const [lon, lat] = place.geometry.coordinates;

  map.setView([lat, lon], 12);

  // Remove old markers
  mapMarkers.forEach(m => map.removeLayer(m));
  mapMarkers = [];

  // Example safe spots near the city
  const safeSpots = [
    { name: "Community Shelter", lat: lat + 0.01, lon: lon + 0.01 },
    { name: "Safe Zone", lat: lat - 0.01, lon: lon - 0.01 }
  ];

  safeSpots.forEach(spot => {
    const marker = L.marker([spot.lat, spot.lon]).addTo(map).bindPopup(spot.name);
    mapMarkers.push(marker);
  });
}