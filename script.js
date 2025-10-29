/* script.js
   Handles:
   - OpenWeather API fetch
   - UI updates and language toggle (EN/HI)
   - Farming advice rules based on weather
*/

/* ========== CONFIG ========== */
const OPENWEATHER_API_KEY = "03b702b247373144805468051d6baab3"; // <-- Replace with your OpenWeatherMap API key

/* ========== DOM ========== */
const langEnBtn = document.getElementById('lang-en');
const langHiBtn = document.getElementById('lang-hi');

const locationInput = document.getElementById('locationInput');
const getWeatherBtn = document.getElementById('getWeatherBtn');

const loadingEl = document.getElementById('loading');

const weatherSection = document.getElementById('weatherSection');
const placeName = document.getElementById('placeName');
const weatherDesc = document.getElementById('weatherDesc');
const weatherIcon = document.getElementById('weatherIcon');
const tempVal = document.getElementById('tempVal');
const humidityVal = document.getElementById('humidityVal');
const windVal = document.getElementById('windVal');
const rainVal = document.getElementById('rainVal');
const cloudsVal = document.getElementById('cloudsVal');

const adviceList = document.getElementById('adviceList');
const cropList = document.getElementById('cropList');

let currentLang = localStorage.getItem('wif_lang') || 'en';

/* ========== LANGUAGE STRINGS ========== */
const STRINGS = {
  en: {
    getWeather: 'Get Weather',
    invalidInput: 'Please enter a city name, district or pincode.',
    errFetch: 'Could not fetch weather. Check name or try later.',
    adviceTitle: 'Farming Advice',
    cropTitle: 'Crop Suggestions',
    learnMore: 'Learn more'
  },
  hi: {
    getWeather: 'मौसम प्राप्त करें',
    invalidInput: 'कृपया शहर का नाम, जिला या पिनकोड दर्ज करें।',
    errFetch: 'मौसम प्राप्त नहीं किया जा सका। नाम जांचें या बाद में पुनः प्रयास करें।',
    adviceTitle: 'कृषि सलाह',
    cropTitle: 'फसल सुझाव',
    learnMore: 'और जानें'
  }
};

/* ========== UTILITIES ========== */
function celsius(kelvin) {
  return +(kelvin - 273.15).toFixed(1);
}

function showLoading(show = true) {
  if (show) loadingEl.classList.remove('hidden');
  else loadingEl.classList.add('hidden');
}

function setLanguageUI(lang) {
  currentLang = lang;
  localStorage.setItem('wif_lang', lang);

  // Toggle visible text blocks (simple approach: show/hide elements with id-suffices)
  document.querySelectorAll('[id$="-en"]').forEach(el => el.classList.toggle('hidden', lang !== 'en'));
  document.querySelectorAll('[id$="-hi"]').forEach(el => el.classList.toggle('hidden', lang !== 'hi'));

  // Button active states
  langEnBtn.classList.toggle('active', lang === 'en');
  langHiBtn.classList.toggle('active', lang === 'hi');

  getWeatherBtn.textContent = (lang === 'en') ? 'Get Weather' : 'मौसम प्राप्त करें';
}

function displayError(msg) {
  alert(msg);
}

/* ========== WEATHER ICON HELPER ========== */
function getIconUrl(iconCode) {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

/* ========== ADVICE LOGIC ========== */
function generateAdvice(weather, tempC, humidity, rainVolume) {
  // weather: string description like 'rain', 'clear', etc.
  // returns array of advice objects: { textEn, textHi }
  const adv = [];

  const cond = weather.toLowerCase();

  // Rain predicted
  if (rainVolume > 0 || cond.includes('rain') || cond.includes('shower') || cond.includes('thunder')) {
    adv.push({
      en: "Rain expected — avoid irrigation today; protect seeds and harvest from waterlogging.",
      hi: "बारिश की संभावना — आज सिंचाई न करें; बीज और फसल को जल-भराव से बचाएँ।"
    });
  }

  // Hot temperature
  if (tempC >= 35) {
    adv.push({
      en: "High temperature (>35°C) — provide shade and light irrigation; avoid spraying pesticides during peak heat.",
      hi: "उच्च तापमान (>35°C) — छाया दें और हल्की सिंचाई करें; अधिक गर्मी में कीटनाशक छिड़काव से बचें।"
    });
  } else if (tempC >= 28 && tempC < 35) {
    adv.push({
      en: "Warm weather — monitor soil moisture and irrigate moderately.",
      hi: "गर्म मौसम — मिट्टी की नमी पर नज़र रखें और मध्यम सिंचाई करें।"
    });
  } else if (tempC < 10) {
    adv.push({
      en: "Low temperature — protect tender saplings; avoid sowing frost-sensitive crops.",
      hi: "कम तापमान — नाज़ुक पौधों की रक्षा करें; ठंड-सम्वेदी फसलों की बुवाई से बचें।"
    });
  }

  // Humidity
  if (humidity >= 80) {
    adv.push({
      en: "High humidity — high risk of fungal infections; consider preventive fungicide and good drainage.",
      hi: "उच्च नमी — फफूंदी का उच्च जोखिम; रोकथाम के लिए फफूंदनाशी और अच्छी नालीकरण पर विचार करें।"
    });
  } else if (humidity <= 40) {
    adv.push({
      en: "Low humidity — risk of pest attacks and moisture stress; increase irrigation frequency slightly.",
      hi: "कम नमी — कीटों और नमी तनाव का जोखिम; सिंचाई आवृत्ति थोड़ा बढ़ाएँ।"
    });
  }

  // Sunny / clear
  if (cond.includes('clear') || cond.includes('sun')) {
    adv.push({
      en: "Clear skies — good day for pesticide sprays (avoid windy hours) and drying harvested crops.",
      hi: "खुले आसमान — कीटनाशक छिड़काव और कटाई हुई फसलों को सुखाने के लिए अच्छा दिन (हवा वाले समय से बचें)।"
    });
  }

  // Cloudy
  if (cond.includes('cloud')) {
    adv.push({
      en: "Cloudy — postpone fertilizer application if heavy rains are forecast.",
      hi: "बादल छाए हैं — यदि भारी बारिश की आशंका है तो उर्वरक देने में देरी करें।"
    });
  }

  // Windy
  if (windSpeedGlobal > 0 && windSpeedGlobal >= 10) {
    adv.push({
      en: "Strong winds — secure loose items and avoid pesticide sprays during high winds.",
      hi: "तेज़ हवा — ढीले सामान को सुरक्षित रखें और तेज हवा में छिड़काव से बचें।"
    });
  }

  // always add a general tip
  adv.push({
    en: "Check forecasts frequently and follow local agricultural advisories for pests/diseases.",
    hi: "बार-बार मौसम पूर्वानुमान देखें और कीट/रोग के लिए स्थानीय कृषि सलाह का पालन करें।"
  });

  return adv;
}

/* ========== CROP SUGGESTIONS (simple heuristic) ========== */
function suggestCrops(tempC, humidity) {
  const suggestions = [];

  // Very simplified heuristics for illustration only
  if (tempC >= 25 && tempC <= 35 && humidity >= 60) {
    suggestions.push({
      en: "Rice — suitable in warm and humid regions (paddy fields).",
      hi: "चावल — गर्म और नम क्षेत्र में उपयुक्त (धान के खेत)।"
    });
    suggestions.push({
      en: "Sugarcane — grows well in warm humid climate.",
      hi: "गन्ना — गर्म और नम जलवायु में अच्छा उगता है।"
    });
  } else if (tempC >= 15 && tempC < 30 && humidity < 60) {
    suggestions.push({
      en: "Wheat — suitable in moderate temperatures and lower humidity.",
      hi: "गेहूं — मध्यम तापमान और कम नमी में उपयुक्त।"
    });
    suggestions.push({
      en: "Pulses — good for moderate climates and can improve soil fertility.",
      hi: "दालें — मध्यम जलवायु के लिए अच्छी और मिट्टी की उर्वरकता बढ़ाती हैं।"
    });
  } else if (tempC >= 20 && tempC < 32 && humidity < 70) {
    suggestions.push({
      en: "Maize (corn) — prefers warm weather with adequate rainfall or irrigation.",
      hi: "मक्का — पर्याप्त बारिश या सिंचाई के साथ गर्म मौसम पसंद करता है।"
    });
  } else if (tempC < 15) {
    suggestions.push({
      en: "Vegetables (potato, cabbage) — cool-season crops may perform well.",
      hi: "सब्जियाँ (आलू, पत्ता गोभी) — ठंडी मौसम की फसलें अच्छा प्रदर्शन कर सकती हैं।"
    });
  } else {
    suggestions.push({
      en: "Cotton — tolerant to warm and dryish climates; ensure pest monitoring.",
      hi: "कपास — गर्म और अपेक्षाकृत शुष्क जलवायु सहन कर लेता है; कीट निगरानी सुनिश्चित करें।"
    });
  }

  return suggestions;
}

/* ========== FETCH WEATHER ========== */
let windSpeedGlobal = 0;

async function fetchWeather(location) {
  // location can be city name or pincode numeric
  showLoading(true);
  try {
    let url = "";
    // if input looks like pincode (only digits), use zip with IN
    if (/^\d{3,7}$/.test(location.trim())) {
      url = `https://api.openweathermap.org/data/2.5/weather?zip=${encodeURIComponent(location)},IN&appid=${OPENWEATHER_API_KEY}`;
    } else {
      // provide ,IN to bias towards India — users can still search other places
      url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)},IN&appid=${OPENWEATHER_API_KEY}`;
    }

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error('fetch-error');
    }
    const data = await res.json();
    showLoading(false);
    return data;
  } catch (err) {
    showLoading(false);
    throw err;
  }
}

/* ========== UI UPDATE ========== */
function updateWeatherUI(data) {
  if (!data || !data.weather) {
    displayError(STRINGS[currentLang].errFetch);
    return;
  }

  const desc = data.weather[0].description || "";
  const icon = data.weather[0].icon || "";
  const tempC = celsius(data.main.temp);
  const humidity = data.main.humidity ?? 0;
  const windSpeed = data.wind?.speed ?? 0; // m/s
  const clouds = data.clouds?.all ?? 0;
  const rainVolume = (data.rain && (data.rain['1h'] || data.rain['3h'])) ? (data.rain['1h'] || data.rain['3h']) : 0;

  windSpeedGlobal = windSpeed;

  // Place and description
  placeName.textContent = `${data.name}, ${data.sys?.country || ''}`;
  weatherDesc.textContent = desc[0]?.toUpperCase() + desc.slice(1);

  weatherIcon.src = getIconUrl(icon);
  weatherIcon.alt = desc;

  tempVal.textContent = tempC;
  humidityVal.textContent = `${humidity} %`;
  windVal.textContent = `${(windSpeed*3.6).toFixed(1)} km/h`; // convert m/s to km/h
  rainVal.textContent = rainVolume ? `${rainVolume} mm` : "0 mm";
  cloudsVal.textContent = `${clouds} %`;

  // Advice
  const adv = generateAdvice(desc, tempC, humidity, rainVolume);
  adviceList.innerHTML = '';
  adv.forEach(it => {
    const div = document.createElement('div');
    div.className = 'advice-item';
    div.innerHTML = `<div>${currentLang === 'en' ? it.en : it.hi}</div>`;
    adviceList.appendChild(div);
  });

  // Crop suggestions
  const crops = suggestCrops(tempC, humidity);
  cropList.innerHTML = '';
  crops.forEach(it => {
    const div = document.createElement('div');
    div.className = 'advice-item';
    div.innerHTML = `<div>${currentLang === 'en' ? it.en : it.hi}</div>`;
    cropList.appendChild(div);
  });

  weatherSection.classList.remove('hidden');
}

/* ========== EVENTS ========== */
langEnBtn.addEventListener('click', () => setLanguageUI('en'));
langHiBtn.addEventListener('click', () => setLanguageUI('hi'));

getWeatherBtn.addEventListener('click', async () => {
  const val = locationInput.value.trim();
  if (!val) {
    displayError(STRINGS[currentLang].invalidInput);
    return;
  }

  try {
    const data = await fetchWeather(val);
    updateWeatherUI(data);
  } catch (err) {
    console.error(err);
    displayError(STRINGS[currentLang].errFetch);
  }
});

// allow Enter key
locationInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') getWeatherBtn.click();
});

/* initial language set */
setLanguageUI(currentLang);

/* initial small enhancement: if browser geolocation available, pre-fill location with lat/lon reverse lookup via OpenWeather? 
   To keep simple (and avoid extra API calls), we only optionally use coords to fetch city name if user accepts. */
if ("geolocation" in navigator) {
  navigator.geolocation.getCurrentPosition(async (pos) => {
    try {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      // fetch city name by reverse call and set input placeholder (not required). This call requires API key and network.
      const resp = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}`);
      if (resp.ok) {
        const d = await resp.json();
        if (d && d.name) {
          locationInput.placeholder = `${d.name} (detected)`;
        }
      }
    } catch (e) {
      // ignore silently
    }
  }, () => {});
}
