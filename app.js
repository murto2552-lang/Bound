// app.js - Core logic for Smart Finance Manager
// Uses IndexedDB for storage, Chart.js for visualisation

import { api } from './api.js';

// ---------- UI & Chart ----------
let balanceChart, forecastChart;

function initCharts() {
  const ctxBalance = document.getElementById('balanceChart').getContext('2d');
  const ctxForecast = document.getElementById('forecastChart').getContext('2d');

  balanceChart = new Chart(ctxBalance, {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: { responsive: true, plugins: { legend: { display: true } } }
  });

  forecastChart = new Chart(ctxForecast, {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: { responsive: true, plugins: { legend: { display: true } } }
  });
}

function updateCharts(transactions) {
  const sorted = transactions.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  const labels = sorted.map(t => t.date);
  const cumulative = [];
  let sum = 0;
  sorted.forEach(t => {
    sum += Number(t.amount) * (t.type === 'income' ? 1 : -1);
    cumulative.push(sum);
  });

  // Balance chart
  balanceChart.data.labels = labels;
  balanceChart.data.datasets = [{
    label: 'Balance',
    data: cumulative,
    borderColor: 'var(--accent)',
    tension: 0.2,
    fill: false
  }];
  balanceChart.update();

  // Forecast chart (simple exponential smoothing)
  const forecast = forecastCashFlow(cumulative);
  const forecastLabels = labels.concat(forecast.futureLabels);
  const forecastData = cumulative.concat(forecast.futureValues);
  forecastChart.data.labels = forecastLabels;
  forecastChart.data.datasets = [{
    label: 'Forecast',
    data: forecastData,
    borderColor: 'hsl(120, 70%, 55%)',
    borderDash: [5,5],
    tension: 0.2,
    fill: false
  }];
  forecastChart.update();
}

// Simple exponential smoothing for next 30 days
function forecastCashFlow(pastValues) {
  const alpha = 0.3; // smoothing factor
  let last = pastValues[pastValues.length - 1] || 0;
  let forecastVals = [];
  for (let i = 1; i <= 30; i++) {
    last = alpha * last + (1 - alpha) * (pastValues[pastValues.length - i] || last);
    forecastVals.push(last);
  }
  const futureLabels = [];
  const start = new Date();
  for (let i = 1; i <= 30; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    futureLabels.push(d.toISOString().split('T')[0]);
  }
  return { futureLabels, futureValues: forecastVals };
}

// ---------- Modal handling ----------
const modal = document.getElementById('transactionModal');
const openBtn = document.getElementById('addTransactionBtn');
const closeBtn = document.getElementById('closeModal');
const form = document.getElementById('transactionForm');

openBtn.addEventListener('click', () => modal.style.display = 'flex');
closeBtn.addEventListener('click', () => modal.style.display = 'none');
window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(form);
  
  // Note: FormData handles file uploads automatically in fetch API.
  // We pass the raw FormData directly to the API layer!
  await api.createTransaction(formData);
  
  form.reset();
  modal.style.display = 'none';
  
  // Refresh chart
  const all = await api.getTransactions();
  updateCharts(all);
});

// ---------- Initialization ----------
window.addEventListener('DOMContentLoaded', async () => {
  initCharts();
  const allTx = await api.getTransactions();
  updateCharts(allTx);
});

// ---------- Simulation (What‑If) ----------
// Placeholder for future feature – can be extended later.

export { forecastCashFlow };
