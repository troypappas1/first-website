// ------------------- Planner functionality -------------------
let plan = JSON.parse(localStorage.getItem('emergencyPlan')) || {};

function savePlan() {
  const members = document.getElementById('membersInput').value.trim();
  const supplies = document.getElementById('suppliesInput').value.trim();

  plan = {
    members: members ? members.split(',').map(m => m.trim()) : [],
    supplies: supplies ? supplies.split(',').map(s => s.trim()) : []
  };

  localStorage.setItem('emergencyPlan', JSON.stringify(plan));
  renderPlan();
}

function renderPlan() {
  const display = document.getElementById('planDisplay');
  if (!display) return;

  if (plan.members && plan.supplies) {
    display.innerHTML = `
      <p><strong>Household Members:</strong> ${plan.members.join(', ')}</p>
      <p><strong>Supplies:</strong> ${plan.supplies.join(', ')}</p>
    `;
  } else {
    display.innerHTML = '<p>No plan saved yet.</p>';
  }
}

// Initial render
renderPlan();


// ------------------- Free global city search + Leaflet map -------------------
const map = L.map('map').setView([20, 0], 2); // World view
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const cityInput = document.getElementById('cityInput');
const suggestions = document.getElementById('suggestions');

// Show city suggestions using Nominatim API
async function showCitySuggestions() {
  const value = cityInput.value;
  suggestions.innerHTML = '';
  if (!value) return;

  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(value)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();

    data.forEach(place => {
      if (!place.type.includes("city") && !place.type.includes("town")) return;

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

  // Example safe spots near the city
  const safeSpots = [
    { name: "Community Shelter", lat: lat + 0.01, lon: lon + 0.01 },
    { name: "Safe Zone", lat: lat - 0.01, lon: lon - 0.01 }
  ];

  // Remove old markers
  if (map.markers) map.markers.forEach(m => map.removeLayer(m));
  map.markers = [];

  safeSpots.forEach(spot => {
    const marker = L.marker([spot.lat, spot.lon]).addTo(map).bindPopup(spot.name);
    map.markers.push(marker);
  });
}