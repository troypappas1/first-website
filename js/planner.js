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

  // 🧠 Disaster advice system
  const disasterAdvice = {
    Earthquake: "Drop, cover, and hold on. Stay away from windows. After shaking stops, move to an open area.",
    Flood: "Move to higher ground immediately. Avoid walking or driving through flood waters.",
    Fire: "Evacuate immediately. Stay low to avoid smoke. Call emergency services if safe.",
    Storm: "Stay indoors, away from windows. Have emergency supplies ready.",
    General: "Stay alert and follow local emergency instructions."
  };

  // 🔍 AUTOCOMPLETE (IMPROVED)
  cityInput.addEventListener('input', async () => {
    const q = cityInput.value.trim();
    suggestions.innerHTML = '';
    if (!q) return;

    try {
      const res = await fetch(`https://photon.komoot.io/api/?q=${q}&limit=6`);
      const data = await res.json();

      data.features.forEach(place => {
        const props = place.properties;

        // 🧠 Build better label
        let label = props.name || "";

        if (props.country === "United States" && props.state) {
          label += `, ${props.state}`;
        }

        if (props.country) {
          label += ` (${props.country})`;
        }

        const li = document.createElement('li');
        li.textContent = label;
        li.style.padding = "8px";
        li.style.cursor = "pointer";

        li.onclick = () => {
          suggestions.innerHTML = '';
          cityInput.value = label;
          loadCity(place);
        };

        suggestions.appendChild(li);
      });

    } catch (e) {
      console.log("Photon error", e);
    }
  });

  // 📍 LOAD CITY + SHELTERS
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
        { name: "Community Shelter", lat: lat + 0.01, lon: lon + 0.01 },
        { name: "Emergency Center", lat: lat - 0.01, lon: lon - 0.01 }
      ];
    }

    // Add markers
    shelters.forEach(s => {
      const marker = L.marker([s.lat, s.lon])
        .addTo(map)
        .bindPopup(`${s.name} (${s.type})`);
      markers.push(marker);
    });

    const closest = shelters[0];

    updateInfo(place, closest);
  }

  // 🧠 UPDATE INFO (WITH ADVICE)
  function updateInfo(place, shelter) {
    const disaster = disasterSelect.value || "General";
    const advice = disasterAdvice[disaster] || disasterAdvice["General"];

    const props = place.properties;

    let locationText = props.name;

    if (props.country === "United States" && props.state) {
      locationText += `, ${props.state}`;
    }

    if (props.country) {
      locationText += ` (${props.country})`;
    }

    infoDiv.innerHTML = `
      <b>${locationText}</b><br><br>
      <b>Disaster:</b> ${disaster}<br>
      <b>Recommended Shelter:</b> ${shelter.name}<br><br>
      <b>Advice:</b><br>${advice}
    `;
  }

  // 🔄 Update advice when disaster changes
  disasterSelect.addEventListener('change', () => {
    if (!cityInput.value) return;
    infoDiv.innerHTML += "<br><i>Updated for selected disaster</i>";
  });

});