const DEFAULT_CITY = "Karachi";
let unit = "C"; // current unit
let weather = null; // last loaded data

const $ = (id) => document.getElementById(id);

// Weather code -> [emoji, description]
const codes = {
  0: ["☀️", "Clear sky"],
  1: ["🌤️", "Mostly clear"],
  2: ["⛅", "Partly cloudy"],
  3: ["☁️", "Overcast"],
  45: ["🌫️", "Fog"],
  48: ["🌫️", "Rime fog"],
  51: ["🌦️", "Light drizzle"],
  53: ["🌦️", "Drizzle"],
  55: ["🌦️", "Heavy drizzle"],
  61: ["🌧️", "Light rain"],
  63: ["🌧️", "Rain"],
  65: ["🌧️", "Heavy rain"],
  71: ["❄️", "Light snow"],
  73: ["❄️", "Snow"],
  75: ["❄️", "Heavy snow"],
  80: ["🌧️", "Rain showers"],
  81: ["🌧️", "Rain showers"],
  82: ["⛈️", "Violent showers"],
  95: ["⛈️", "Thunderstorm"],
  96: ["⛈️", "Thunderstorm with hail"],
  99: ["⛈️", "Thunderstorm with hail"],
};

const info = (code) => codes[code] || ["🌡️", "Unknown"];

// API always gives °C, so convert here when unit is F
const toUnit = (c) =>
  unit === "C" ? Math.round(c) + "°C" : Math.round((c * 9) / 5 + 32) + "°F";

async function loadCity(city) {
  try {
    $("message").textContent = "Loading...";

    // 1) city name -> latitude/longitude
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`,
    );
    const geo = await geoRes.json();
    if (!geo.results) throw new Error("not-found");
    const { name, country, latitude, longitude } = geo.results[0];

    // 2) latitude/longitude -> weather
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code` +
      `&hourly=temperature_2m,weather_code` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
    const res = await fetch(url);
    const data = await res.json();

    weather = { place: `${name}, ${country}`, ...data };
    $("message").textContent = "";
    render();
  } catch (err) {
    $("message").textContent =
      err.message === "not-found"
        ? "City not found. Try another name."
        : "Could not load weather. Check your internet connection.";
  }
}

function render() {
  const { place, current, hourly, daily } = weather;
  const [icon, desc] = info(current.weather_code);

  $("city").textContent = place;
  $("date").textContent = new Date(current.time).toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  $("desc").textContent = desc;
  $("icon").textContent = icon;
  $("temp").textContent = toUnit(current.temperature_2m);
  $("feels").textContent = toUnit(current.apparent_temperature);
  $("humidity").textContent = current.relative_humidity_2m + "%";
  $("wind").textContent = current.wind_speed_10m + " km/h";

  // Hourly: start from the current hour, show next 24
  const start = hourly.time.findIndex(
    (t) => t.slice(0, 13) >= current.time.slice(0, 13),
  );
  $("hourly-row").innerHTML = hourly.time
    .slice(start, start + 24)
    .map((t, i) => {
      const k = start + i;
      const hour = new Date(t).toLocaleTimeString("en-US", { hour: "numeric" });
      return `<div class="hour">
        <span>${hour}</span>
        <div class="i">${info(hourly.weather_code[k])[0]}</div>
        <strong>${toUnit(hourly.temperature_2m[k])}</strong>
      </div>`;
    })
    .join("");

  // 7-day forecast
  $("daily-grid").innerHTML = daily.time
    .map((d, i) => {
      const day = new Date(d).toLocaleDateString("en-US", { weekday: "short" });
      return `<div class="day">
        <span>${day}</span>
        <div class="i">${info(daily.weather_code[i])[0]}</div>
        <strong>${toUnit(daily.temperature_2m_max[i])}</strong>
        <span>${toUnit(daily.temperature_2m_min[i])}</span>
      </div>`;
    })
    .join("");
}

// Search form
$("search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  loadCity($("city-input").value.trim());
});

// °C / °F toggle
$("unit-btn").addEventListener("click", () => {
  unit = unit === "C" ? "F" : "C";
  $("unit-btn").textContent = `Switch to °${unit === "C" ? "F" : "C"}`;
  if (weather) render();
});

loadCity(DEFAULT_CITY);
