// Initialize Leaflet map
const map = L.map('map').setView([20, 0], 2); // World view
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const cityInput = document.getElementById('cityInput');
const suggestions = document.getElementById('suggestions');
let mapMarkers = [];

// Fetch city suggestions from Nominatim API
let debounceTimer;
cityInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchCitySuggestions, 300); // Wait 300ms after typing
});

async function fetchCitySuggestions() {
  const value = cityInput.value.trim();
  suggestions.innerHTML = '';
  if (!value) return;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(value)}`;
    const res = await fetch(url);
    const data = await res.json();

    data.forEach(place => {
      if (!place.type.includes("city") && !place.type.includes("town") && !place.type.includes("village")) return;
      const li = document.createElement('li');
      li.textContent = place.display_name;
      li.className = 'p-2 cursor-pointer hover:bg-gray-200';
      li.onclick = () => {
        cityInput.value = place.display_name;
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
function showSafeSpots(city) {
  const lat = parseFloat(city.lat);
  const lon = parseFloat(city.lon);

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