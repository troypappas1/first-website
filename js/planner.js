// Initialize Leaflet map
const map = L.map('map').setView([20, 0], 2); // World view
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const cityInput = document.getElementById('cityInput');
const suggestions = document.getElementById('suggestions');
const infoDiv = document.getElementById('cityInfo');
let mapMarkers = [];

// Example disaster data
const disasterData = {
  "San Francisco": ["Earthquakes", "Wildfires"],
  "Tokyo": ["Earthquakes", "Typhoons"],
  "New York": ["Hurricanes", "Winter Storms"],
  "London": ["Floods", "Storms"],
  "Sydney": ["Bushfires", "Heatwaves"],
  "Paris": ["Floods", "Storms"]
};

// Debounce input to avoid too many API calls
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
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(value)}&limit=5`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.features) return;

    data.features.forEach(place => {
      const cityName = place.properties.name;
      const country = place.properties.country || "";
      if (!cityName) return;

      const li = document.createElement('li');
      li.textContent = cityName + (country ? `, ${country}` : '');
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

// Show map markers and emergency info
function showSafeSpots(place) {
  const [lon, lat] = place.geometry.coordinates;

  // Center map
  map.setView([lat, lon], 12);

  // Remove previous markers
  mapMarkers.forEach(m => map.removeLayer(m));
  mapMarkers = [];

  // Example safe spots near the city
  const safeSpots = [
    { name: "Community Shelter", lat: lat + 0.01, lon: lon + 0.01 },
    { name: "Safe Zone", lat: lat - 0.01, lon: lon - 0.01 }
  ];

  // Add markers
  safeSpots.forEach(spot => {
    const marker = L.marker([spot.lat, spot.lon]).addTo(map).bindPopup(spot.name);
    mapMarkers.push(marker);
  });

  // Update emergency info
  const cityName = place.properties.name;
  const disasters = disasterData[cityName] || ["General Emergencies"];
  const recommendedSpot = safeSpots[0];

  infoDiv.innerHTML = `
    <p><strong>City:</strong> ${cityName}, ${place.properties.country || ""}</p>
    <p><strong>Common Natural Disasters:</strong> ${disasters.join(", ")}</p>
    <p><strong>Recommended Emergency Spot:</strong> ${recommendedSpot.name}</p>
  `;
}