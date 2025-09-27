document.addEventListener('DOMContentLoaded', () => {
  // Dark Mode
  const darkModeToggle = document.getElementById('darkModeToggle');
  darkModeToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark-mode', darkModeToggle.checked);
  });

  // Thresholds
  const thresholds = JSON.parse(localStorage.getItem('customThresholds')) || {
    tempMax: 28,
    humidityMax: 80,
    vibrationMax: 2
  };
  document.getElementById('tempThreshold').value = thresholds.tempMax;
  document.getElementById('humidityThreshold').value = thresholds.humidityMax;
  document.getElementById('vibrationThreshold').value = thresholds.vibrationMax;

  document.getElementById('saveThresholdsBtn').addEventListener('click', () => {
    thresholds.tempMax = parseFloat(document.getElementById('tempThreshold').value);
    thresholds.humidityMax = parseFloat(document.getElementById('humidityThreshold').value);
    thresholds.vibrationMax = parseFloat(document.getElementById('vibrationThreshold').value);
    localStorage.setItem('customThresholds', JSON.stringify(thresholds));
    simulateAlert('✅ Thresholds saved successfully!', 'success');
  });

  // Alerts
  const alertsContainer = document.getElementById('alerts');
  function simulateAlert(message, type = 'warning') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
    alertsContainer.prepend(alertDiv);
    setTimeout(() => alertDiv.remove(), 10000);
  }

  // 🔹 Cooling System Modal
  const coolingModal = new bootstrap.Modal(document.getElementById('coolingSystemModal'));
  const coolingMessage = document.getElementById('coolingMessage');
  const coolingProgress = document.getElementById('coolingProgress');
  let coolingActive = false;
  let alertCounts = { temp: 0 };
  let cooledSensors = { temp: false };

  function activateCooling(sensor) {
    coolingActive = true;
    alertCounts = { temp: 0, humidity: 0, vibration: 0 };

    if (sensor === "Temperature") cooledSensors.temp = true;
    
    coolingMessage.textContent = `${sensor} exceeded threshold! Activating cooling system...`;
    coolingProgress.style.width = "0%";
    coolingProgress.textContent = "0%";
    coolingModal.show();

    let progress = 0;
    const interval = setInterval(() => {
      progress += 100 / 30;
      if (progress > 100) progress = 100;
      coolingProgress.style.width = `${progress}%`;
      coolingProgress.textContent = `${Math.round(progress)}%`;
    }, 1000);

    let coolingLoop = setInterval(() => {
      if (sensor === "Temperature") {
        currentTemp = Math.max(24, currentTemp - 0.1);
        if (currentTemp <= 25) {
          simulateAlert(`✅ Cooling complete for Temperature (${currentTemp.toFixed(1)}°C)`, 'success');
          stopCooling();
        }
      }
      
    }, 1000);

    function stopCooling() {
      clearInterval(interval);
      clearInterval(coolingLoop);
      coolingModal.hide();
      coolingActive = false;
    }

    setTimeout(stopCooling, 30000);
  }

  // Gradient Gauge Factory
  function createGauge(ctx, gradientColors, max, initialValue, unit) {
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 200);
    gradientColors.forEach(([pos, color]) => gradient.addColorStop(pos, color));

    return new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [initialValue, max - initialValue],
          backgroundColor: [gradient, 'rgba(220,220,220,0.2)'],
          borderWidth: 0
        }]
      },
      options: {
        rotation: -90,
        circumference: 180,
        cutout: '70%',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        },
        animation: { animateRotate: true, animateScale: true }
      },
      plugins: [{
        id: 'centerText',
        beforeDraw(chart) {
          const { width, height, ctx } = chart;
          ctx.restore();
          const fontSize = (height / 6).toFixed(2);
          ctx.font = `${fontSize}px Arial`;
          ctx.textBaseline = 'middle';
          const value = chart.data.datasets[0].data[0].toFixed(1);
          const text = `${value}${unit}`;
          const textX = Math.round((width - ctx.measureText(text).width) / 2);
          const textY = height / 1.4;
          ctx.fillText(text, textX, textY);
          ctx.save();
        }
      }]
    });
  }

  // Gauges
  const tempGauge = createGauge(
    document.getElementById('temperatureGauge'),
    [[0, "rgba(255,0,0,1)"], [1, "rgba(255,200,0,1)"]],
    100, 27, "°C"
  );

  const humidityGauge = createGauge(
    document.getElementById('humidityGauge'),
    [[0, "rgba(0,123,255,1)"], [1, "rgba(0,200,150,1)"]],
    100, 50, "%"
  );

  // Vibration Gauge (max = 5000 to handle sudden spikes)
  const vibrationGauge = createGauge(
    document.getElementById('vibrationGauge'),
    [[0, "rgba(0,200,150,1)"], [1, "rgba(150,0,200,1)"]],
    5000, 0.5, " m/s²"
  );

  // Waveform Historical Graph
  const dataCtx = document.getElementById('dataChart').getContext('2d');
  const dataChart = new Chart(dataCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Temperature (°C)',
          data: [],
          borderColor: "rgba(255,99,132,1)",
          borderWidth: 2,
          fill: false,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: "rgba(255,99,132,1)"
        },
        {
          label: 'Humidity (%)',
          data: [],
          borderColor: "rgba(54,162,235,1)",
          borderWidth: 2,
          fill: false,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: "rgba(54,162,235,1)"
        },
        {
          label: 'Vibration (m/s²)',
          data: [],
          borderColor: "rgba(75,192,192,1)",
          borderWidth: 2,
          fill: false,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: "rgba(75,192,192,1)"
        }
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#333', font: { size: 12 } }
        },
        tooltip: { enabled: true }
      },
      animation: { duration: 0 },
      scales: {
        x: {
          display: true,
          grid: { color: "rgba(200,200,200,0.2)" },
          ticks: { color: '#666', autoSkip: false }
        },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(200,200,200,0.2)" },
          ticks: { color: '#666' }
        }
      }
    }
  });

 // Sensor Simulation
  let currentTemp = 27, currentHumidity = 81, currentVibration = 0.5; // default humidity ~81%
  function simulateSensors() {
    if (coolingActive) return; // pause normal updates during cooling

    // Temperature
    currentTemp = Math.min(28, Math.max(26, currentTemp + (Math.random() - 0.) * 10));
    if (cooledSensors.temp) currentTemp = Math.min(currentTemp, thresholds.tempMax); // clamp after cooling
    tempGauge.data.datasets[0].data[0] = currentTemp;
    tempGauge.data.datasets[0].data[1] = 100 - currentTemp;
    tempGauge.update();

    // Humidity → controlled variation between 78–83%
    currentHumidity += (Math.random() < 0.5 ? -1 : 1) * Math.random();
    if (currentHumidity > 83) currentHumidity = 83;
    if (currentHumidity < 78) currentHumidity = 78;
    if (cooledSensors.humidity) currentHumidity = Math.min(currentHumidity, thresholds.humidityMax);
    humidityGauge.data.datasets[0].data[0] = currentHumidity;
    humidityGauge.data.datasets[0].data[1] = 100 - currentHumidity;
    humidityGauge.update();

    // Vibration → small baseline variations only
    currentVibration = Math.min(5, Math.max(0, currentVibration + (Math.random() - 0.5) * 0.1));
    if (cooledSensors.vibration) currentVibration = Math.min(currentVibration, thresholds.vibrationMax);
    vibrationGauge.data.datasets[0].data[0] = currentVibration;
    vibrationGauge.data.datasets[0].data[1] = 5000 - currentVibration;
    vibrationGauge.update();

    // Threshold checks
    if (currentTemp > thresholds.tempMax) {
      alertCounts.temp++;
      simulateAlert(`⚠️ Temp exceeded (${currentTemp.toFixed(1)}°C)`, 'danger');
      if (alertCounts.temp >= 3) activateCooling("Temperature");
    } else { alertCounts.temp = 0; }

    if (currentHumidity > thresholds.humidityMax) {
      alertCounts.humidity++;
      simulateAlert(`⚠️ Humidity exceeded (${currentHumidity.toFixed(1)}%)`, 'danger');
      if (alertCounts.humidity >= 3) activateCooling("Humidity");
    } else { alertCounts.humidity = 0; }

    if (currentVibration > thresholds.vibrationMax) {
      alertCounts.vibration++;
      simulateAlert(`⚠️ Vibration exceeded (${currentVibration.toFixed(2)} m/s²)`, 'danger');
      if (alertCounts.vibration >= 3) activateCooling("Vibration");
    } else { alertCounts.vibration = 0; }

    // Update waveform
    const now = new Date().toLocaleTimeString();
    dataChart.data.labels.push(now);
    dataChart.data.datasets[0].data.push(currentTemp);
    dataChart.data.datasets[1].data.push(currentHumidity);
    dataChart.data.datasets[2].data.push(currentVibration);

    if (dataChart.data.labels.length > 5) {
      dataChart.data.labels.shift();
      dataChart.data.datasets.forEach(ds => ds.data.shift());
    }

    dataChart.update();
  }

  setInterval(simulateSensors, 1000);

  // 🔹 Vibration sudden deflections (on click/double-click)
  const vibrationCanvas = document.getElementById('vibrationGauge');

  // Single click → sudden jump 2000
  vibrationCanvas.addEventListener('click', () => {
    currentVibration = 2000;
    vibrationGauge.data.datasets[0].data[0] = currentVibration;
    vibrationGauge.data.datasets[0].data[1] = 5000 - currentVibration;
    vibrationGauge.update();
    simulateAlert("🔧 Vibration sudden deflection (0 → 2000 m/s²)", "warning");
  });

  // Double click → sudden jump 4000
  vibrationCanvas.addEventListener('dblclick', () => {
    currentVibration = 4000;
    vibrationGauge.data.datasets[0].data[0] = currentVibration;
    vibrationGauge.data.datasets[0].data[1] = 5000 - currentVibration;
    vibrationGauge.update();
    simulateAlert("🔧 Vibration extreme deflection (0 → 4000 m/s²)", "danger");
  });


  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.setItem('loggedIn', 'false');
    window.location.href = 'login.html';
  });
});

 // ---------------------------
 // 🌍 Device Live Location (Leaflet / OpenStreetMap)
 // ---------------------------
const map = L.map('map').setView([20.5937, 78.9629], 5); // Default: India center
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

let marker = L.marker([20.5937, 78.9629]).addTo(map).bindPopup("Default Location").openPopup();

// Track live location
if (navigator.geolocation) {
  navigator.geolocation.watchPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const location = [lat, lng];
      map.setView(location, 14);
      marker.setLatLng(location).bindPopup("📍 Your Laptop Location").openPopup();
    },
    (err) => {
      console.error("Error getting location:", err);
      document.getElementById("map").innerHTML = "❌ Location access denied or unavailable.";
    }
  );
} else {
  document.getElementById("map").innerHTML = "❌ Geolocation not supported.";
}
