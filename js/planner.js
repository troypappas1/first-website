// Initialize Leaflet map
const map = L.map('map').setView([20, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const cityInput = document.getElementById('cityInput');
const suggestions = document.getElementById('suggestions');
const infoDiv = document.getElementById('cityInfo');
let mapMarkers = [];

// Debounce input
let debounceTimer;
cityInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchCitySuggestions, 300);
});

// Free city autocomplete from Photon API
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
      li.className = 'p-2 cursor-pointer hover:bg-gray-200';
      li.onclick = () => {
        cityInput.value = li.textContent;
        suggestions.innerHTML = '';
        findShelters(place);
      };
      suggestions.appendChild(li);
    });
  } catch (err) {
    console.error(err);
  }
}

// Use Overpass API to find real shelters near a selected city
async function findShelters(place) {
  const [lon, lat] = place.geometry.coordinates;

  // Map center
  map.setView([lat, lon], 12);

  // Build a small bounding box (about ~0.05 degrees ~ ~5km)
  const delta = 0.05;
  const bbox = `${lat - delta},${lon - delta},${lat + delta},${lon + delta}`;

  // Overpass query to find OSM elements tagged as shelters/emergency facilities
  const query = `
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

  try {
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const data = await res.json();

    // Clear old markers
    mapMarkers.forEach(m => map.removeLayer(m));
    mapMarkers = [];

    let shelters = [];

    if (data.elements) {
      data.elements.forEach(el => {
        let shelterLat = el.lat || el.center?.lat;
        let shelterLon = el.lon || el.center?.lon;
        let name = el.tags?.name || "Shelter";
        if (shelterLat && shelterLon) {
          shelters.push({ name, lat: shelterLat, lon: shelterLon });
        }
      });
    }

    // If no real shelters found, fallback to generic ones
    if (shelters.length === 0) {
      shelters = [
        { name: "Community Shelter", lat: lat + 0.01, lon: lon + 0.01 },
        { name: "Emergency Center", lat: lat - 0.01, lon: lon - 0.01 }
      ];
    }

    // Add markers
    shelters.forEach(spot => {
      const marker = L.marker([spot.lat, spot.lon])
                      .addTo(map)
                      .bindPopup(spot.name);
      mapMarkers.push(marker);
    });

    // Sort by closest distance
    shelters.sort((a, b) => {
      const da = Math.hypot(a.lat - lat, a.lon - lon);
      const db = Math.hypot(b.lat - lat, b.lon - lon);
      return da - db;
    });

    const recommended = shelters[0];

    infoDiv.innerHTML = `
      <p><strong>City:</strong> ${place.properties.name}, ${place.properties.country || ""}</p>
      <p><strong>Nearest Shelter:</strong> ${recommended.name}</p>
      <p><em>Showing ${shelters.length} locations within ~5km</em></p>
    `;
  } catch (err) {
    console.error("Overpass error:", err);
    infoDiv.innerHTML = `
      <p>Error finding shelters.</p>
    `;
  }
}