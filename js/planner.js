document.addEventListener("DOMContentLoaded", () => {

  const map = L.map('map').setView([20, 0], 2);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  const cityInput = document.getElementById('cityInput');
  const suggestions = document.getElementById('suggestions');
  const disasterSelect = document.getElementById('disasterSelect');
  const infoDiv = document.getElementById('cityInfo');

  let markers = [];

  // AUTOCOMPLETE
  cityInput.addEventListener('input', async () => {
    const q = cityInput.value.trim();
    suggestions.innerHTML = '';
    if (!q) return;

    try {
      const res = await fetch(`https://photon.komoot.io/api/?q=${q}&limit=5`);
      const data = await res.json();

      data.features.forEach(place => {
        const li = document.createElement('li');
        li.textContent = place.properties.name + ", " + (place.properties.country || '');
        
        li.onclick = () => {
          suggestions.innerHTML = '';
          cityInput.value = li.textContent;
          loadCity(place);
        };

        suggestions.appendChild(li);
      });

    } catch (e) {
      console.log("Photon error", e);
    }
  });

  async function loadCity(place) {
    const [lon, lat] = place.geometry.coordinates;

    map.setView([lat, lon], 12);

    markers.forEach(m => map.removeLayer(m));
    markers = [];

    const delta = 0.05;
    const bbox = `${lat - delta},${lon - delta},${lat + delta},${lon + delta}`;

    const query = `
      [out:json];
      (
        node["amenity"="shelter"](${bbox});
        node["emergency"="hospital"](${bbox});
        node["emergency"="fire_station"](${bbox});
      );
      out;
    `;

    let shelters = [];

    try {
      const res = await fetch("https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(query));
      const data = await res.json();

      shelters = data.elements.map(el => ({
        name: el.tags?.name || "Shelter",
        lat: el.lat,
        lon: el.lon,
        type: el.tags?.emergency || el.tags?.amenity || "general"
      }));

    } catch {
      shelters = [];
    }

    if (shelters.length === 0) {
      shelters = [
        { name: "Fallback Shelter", lat: lat + 0.01, lon: lon + 0.01, type: "general" }
      ];
    }

    const disaster = disasterSelect.value || "General";

    shelters.forEach(s => {
      const marker = L.marker([s.lat, s.lon]).addTo(map).bindPopup(s.name);
      markers.push(marker);
    });

    const closest = shelters[0];

    infoDiv.innerHTML = `
      <b>${place.properties.name}</b><br>
      Disaster: ${disaster}<br>
      Recommended: ${closest.name}
    `;
  }

});