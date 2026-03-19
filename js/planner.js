// Example natural disaster dataset (simplified)
const disasterData = {
  "San Francisco": ["Earthquakes", "Wildfires"],
  "Tokyo": ["Earthquakes", "Typhoons"],
  "New York": ["Hurricanes", "Winter Storms"],
  "London": ["Floods", "Storms"],
  "Sydney": ["Bushfires", "Heatwaves"],
  "Paris": ["Floods", "Storms"]
};

// Show safe spots and emergency info
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

  // Emergency info display
  const cityName = place.properties.name;
  const country = place.properties.country || "";
  const infoDiv = document.getElementById('cityInfo');

  const disasters = disasterData[cityName] || ["General Emergencies"];
  const safeSpot = safeSpots[0]; // pick first safe spot for recommendation

  infoDiv.innerHTML = `
    <p><strong>City:</strong> ${cityName}, ${country}</p>
    <p><strong>Common Natural Disasters:</strong> ${disasters.join(", ")}</p>
    <p><strong>Recommended Emergency Spot:</strong> ${safeSpot.name}</p>
  `;
}