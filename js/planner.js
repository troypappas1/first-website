let plan = JSON.parse(localStorage.getItem('emergencyPlan')) || {};

// Save plan as before
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

// --- Leaflet Map Setup ---
const map = L.map('map').setView([37.7749, -122.4194], 12); // Default: San Francisco

// Tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Example safe spots
const safeSpots = [
  { name: "Community Shelter", lat: 37.779, lon: -122.414 },
  { name: "High School Gym", lat: 37.768, lon: -122.429 },
  { name: "City Hall Safe Room", lat: 37.781, lon: -122.417 }
];

safeSpots.forEach(spot => {
  L.marker([spot.lat, spot.lon]).addTo(map).bindPopup(spot.name);
});

// Find safe spot by address
async function findSafeSpot() {
  const address = document.getElementById('addressInput').value.trim();
  if (!address) return alert("Enter an address!");

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.length === 0) return alert("Address not found!");

    const { lat, lon } = data[0];
    map.setView([lat, lon], 14);

    // Optional: marker for user location
    L.marker([lat, lon]).addTo(map).bindPopup("Your Location").openPopup();
  } catch (err) {
    alert("Error fetching location");
    console.error(err);
  }
}