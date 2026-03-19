// Load saved plan from localStorage
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