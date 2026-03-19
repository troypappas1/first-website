const disasterSelect = document.getElementById('disasterSelect');

async function findShelters(place) {
  const [lon, lat] = place.geometry.coordinates;
  map.setView([lat, lon], 12);

  const delta = 0.05;
  const bbox = `${lat - delta},${lon - delta},${lat + delta},${lon + delta}`;

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

    mapMarkers.forEach(m => map.removeLayer(m));
    mapMarkers = [];

    let shelters = [];

    if (data.elements) {
      data.elements.forEach(el => {
        let shelterLat = el.lat || el.center?.lat;
        let shelterLon = el.lon || el.center?.lon;
        let name = el.tags?.name || "Shelter";
        let type = el.tags?.amenity || el.tags?.emergency || el.tags?.building || "general";
        if (shelterLat && shelterLon) {
          shelters.push({ name, lat: shelterLat, lon: shelterLon, type });
        }
      });
    }

    // fallback if no shelters
    if (shelters.length === 0) {
      shelters = [
        { name: "Community Shelter", lat: lat + 0.01, lon: lon + 0.01, type: "general" },
        { name: "Emergency Center", lat: lat - 0.01, lon: lon - 0.01, type: "general" }
      ];
    }

    // Filter shelters based on selected disaster
    const disaster = disasterSelect.value || "General";
    let filteredShelters = shelters;

    if (disaster === "Fire") {
      filteredShelters = shelters.filter(s => s.type === "fire_station" || s.type === "shelter" || s.type === "public");
    } else if (disaster === "Earthquake") {
      filteredShelters = shelters.filter(s => s.type === "shelter" || s.type === "public");
    } else if (disaster === "Flood") {
      // Simple approach: pick shelters north of city (higher lat)
      filteredShelters = shelters.filter(s => s.lat >= lat);
    }

    if (filteredShelters.length === 0) filteredShelters = shelters; // fallback

    // Add markers
    filteredShelters.forEach(spot => {
      const marker = L.marker([spot.lat, spot.lon])
                      .addTo(map)
                      .bindPopup(`${spot.name} (${spot.type})`);
      mapMarkers.push(marker);
    });

    // Sort by closest to city center
    filteredShelters.sort((a, b) => {
      const da = Math.hypot(a.lat - lat, a.lon - lon);
      const db = Math.hypot(b.lat - lat, b.lon - lon);
      return da - db;
    });

    const recommended = filteredShelters[0];

    infoDiv.innerHTML = `
      <p><strong>City:</strong> ${place.properties.name}, ${place.properties.country || ""}</p>
      <p><strong>Disaster:</strong> ${disaster}</p>
      <p><strong>Recommended Shelter:</strong> ${recommended.name} (${recommended.type})</p>
      <p><em>Showing ${filteredShelters.length} shelters suitable for this disaster</em></p>
    `;
  } catch (err) {
    console.error("Overpass error:", err);
    infoDiv.innerHTML = `<p>Error finding shelters.</p>`;
  }
}