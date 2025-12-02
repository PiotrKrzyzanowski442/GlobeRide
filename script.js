// --- Globalna Baza Danych, Kursy i Token Mapbox ---
const KURS_EUR_PLN = 4.30;
const KURS_CZK_PLN = 0.17; 
const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNqdGxkZG8ydDFhaDMzeHIxMzE5YzVkY2kifQ.YJc9gPq9c6B4K4m8Q3q_zg'; 

// --- ZMIENNE STANU APLIKACJI ---
let walletBalance = 100.00; 
let isLoggedIn = false;
let userName = "Gość"; 
let isSettingStartPoint = true; 

let lastTicketCode = null; 
let aktywneBilety = [];
let userLocation = null; 
let userLocationMarker = null;

// --- DANE MIAST (FORMAT MAPBOX: [LNG, LAT]) ---
const DATA = {
    "Rzym": {
        kod: "ATAC", flaga: "🇮🇹", centrum: [12.4964, 41.9028], 
        bilety: { "jednorazowy_BIT": { cena: 1.50, waluta: "EUR", waznosc_min: 100 }, "dzienny_24h": { cena: 7.00, waluta: "EUR", waznosc_min: 1440 } },
        poi: { "Koloseum": [12.4922, 41.8902], "Watykan": [12.4540, 41.9022], "Termini (Stacja)": [12.501, 41.901], "Piazza Venezia": [12.482, 41.896] },
        trasy: [
            { typ: "Najszybsza", transport: ["bus", "metro"], czas: 35, koszt: 1.50,
                segmenty: [
                    { typ: "bus", linia: "64", przesiadka: "Largo Argentina", delay: 5, color: '#00bcd4', coords: [[12.4922, 41.8902], [12.484, 41.896], [12.476, 41.900]] },
                    { typ: "metro", linia: "A", przesiadka: "Ottaviano", delay: 0, color: '#f44336', coords: [[12.476, 41.900], [12.465, 41.901], [12.4540, 41.9022]] }
                ]
            },
            { typ: "Najwygodniejsza", transport: ["tram", "metro"], czas: 45, koszt: 1.50,
                segmenty: [
                    { typ: "tram", linia: "8", przesiadka: "Trastevere", delay: 0, color: '#795548', coords: [[12.4922, 41.8902], [12.475, 41.885]] },
                    { typ: "metro", linia: "A", przesiadka: "Ottaviano", delay: 0, color: '#f44336', coords: [[12.475, 41.885], [12.4540, 41.9022]] }
                ]
            }
        ]
    },
    "Berlin": {
        kod: "BVG", flaga: "🇩🇪", centrum: [13.4050, 52.5200], 
        bilety: { "jednorazowy_AB": { cena: 3.50, waluta: "EUR", waznosc_min: 120 }, "dzienny": { cena: 9.90, waluta: "EUR", waznosc_min: 1440 } },
        poi: { "Brama Brandenburska": [13.3777, 52.5163], "Alexanderplatz": [13.4116, 52.5219], "Hbf (Stacja Główna)": [13.3695, 52.5255], "Potsdamer Platz": [13.375, 52.509] },
        trasy: [
            { typ: "Metro/Pociąg", transport: ["metro", "train"], czas: 25, koszt: 3.50,
                segmenty: [
                    { typ: "train", linia: "S7", przesiadka: "Friedrichstraße", delay: 0, color: '#FF9800', coords: [[13.3777, 52.5163], [13.385, 52.518]] },
                    { typ: "metro", linia: "U5", przesiadka: "Alexanderplatz", delay: 0, color: '#3f51b5', coords: [[13.385, 52.518], [13.4116, 52.5219]] }
                ]
            },
            { typ: "Autobus", transport: ["bus"], czas: 40, koszt: 3.50,
                segmenty: [
                    { typ: "bus", linia: "100", przesiadka: "Tiergarten", delay: 0, color: '#e91e63', coords: [[13.3777, 52.5163], [13.390, 52.519], [13.4116, 52.5219]] }
                ]
            }
        ]
    },
    "Praga": {
        kod: "DPP", flaga: "🇨🇿", centrum: [14.4208, 50.0880],
        bilety: { "30_minut": { cena: 30, waluta: "CZK", waznosc_min: 30 }, "dzienny": { cena: 120, waluta: "CZK", waznosc_min: 1440 } },
        poi: { "Zamek Praski": [14.4018, 50.0917], "Most Karola": [14.4115, 50.0864], "Stare Mesto": [14.4208, 50.0878] },
        trasy: [
            { typ: "Tramwaj/Metro", transport: ["tram", "metro"], czas: 20, koszt: 30,
                segmenty: [
                    { typ: "tram", linia: "22", przesiadka: "Malostranská", delay: 0, color: '#00bcd4', coords: [[14.4018, 50.0917], [14.41, 50.090]] },
                    { typ: "metro", linia: "A", przesiadka: "Můstek", delay: 0, color: '#795548', coords: [[14.41, 50.090], [14.4208, 50.0878]] }
                ]
            }
        ]
    }
};

// --- Obiekty Mapy i Elementy DOM ---
let map = null;
let markers = []; 
let polylines = [];
let currentCity = "Rzym";

const outputElement = document.getElementById('output');
const routeOptionsPanel = document.getElementById('routeOptionsPanel');
const headerTitle = document.getElementById('headerTitle');
const walletInfo = document.getElementById('walletInfo');
const authButton = document.getElementById('authButton');
const setPointButton = document.getElementById('setPointButton');


// --- FUNKCJE INICJALIZACYJNE I MAPY ---

function initApp() {
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN; // Ustaw token Mapbox
    updateAuthUI();
    initMap();
    changeCity("Rzym");
}

function initMap() {
    // Inicjalizacja Mapbox GL JS
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: DATA["Rzym"].centrum, 
        zoom: 12
    });

    // Ustawienie kliknięcia do wyboru punktów
    map.on('click', handleMapClick);
}

function changeCity(cityName) {
    currentCity = cityName;
    const cityData = DATA[cityName];
    
    if (map) {
        map.flyTo({ center: cityData.centrum, zoom: 12 });
        clearMapObjects(); 
        addPoiMarkers(cityData.poi);
    }

    headerTitle.innerHTML = `${cityData.flaga} GlobeRide: ${cityName} (${cityData.kod})`;
    const poiNames = Object.keys(cityData.poi);
    document.getElementById('inputSkad').value = poiNames[0] || 'Skąd (Kliknij na mapę!)';
    document.getElementById('inputDokad').value = poiNames[1] || 'Dokąd (Kliknij na mapę!)';

    routeOptionsPanel.innerHTML = "";
    updateOutput(`Przełączono na: ${cityName}. Wpisz adresy lub kliknij w przycisk "Ustaw Punkty".`);
}

function clearMapObjects() {
    markers.forEach(m => m.remove());
    markers = [];
    
    polylines.forEach(id => {
        if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(id)) map.removeSource(id);
    });
    polylines = [];
}

function addPoiMarkers(poiData) {
    for (const name in poiData) {
        const coords = poiData[name];
        const marker = new mapboxgl.Marker({ color: '#f57c00' }) 
            .setLngLat(coords)
            .setPopup(new mapboxgl.Popup().setHTML(`<h4>${name}</h4>`))
            .addTo(map);
        markers.push(marker);
    }
}

function symulujGeoKodowanieIMarker(lngLat, type, label) {
    markers = markers.filter(m => {
        if (m._element.classList.contains('start-marker') && type === 'start') { m.remove(); return false; }
        if (m._element.classList.contains('end-marker') && type === 'end') { m.remove(); return false; }
        return true;
    });

    const color = type === 'start' ? '#3f51b5' : '#e91e63';
    const markerEl = document.createElement('div');
    markerEl.className = type === 'start' ? 'start-marker' : 'end-marker';
    markerEl.style.cssText = `background-color: ${color}; width: 15px; height: 15px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);`;

    const newMarker = new mapboxgl.Marker({ element: markerEl, anchor: 'center' })
        .setLngLat(lngLat)
        .setPopup(new mapboxgl.Popup().setHTML(`<h4>${label}</h4>`))
        .addTo(map);

    markers.push(newMarker);
    return lngLat;
}

function handleMapClick(e) {
    const lngLat = [e.lngLat.lng, e.lngLat.lat];
    const simulatedAddress = `Współrzędne (${lngLat[1].toFixed(4)}, ${lngLat[0].toFixed(4)})`;

    if (isSettingStartPoint) {
        document.getElementById('inputSkad').value = simulatedAddress;
        updateOutput(`Ustawiono START (SKĄD): ${simulatedAddress}. Teraz kliknij punkt CELU (DOKĄD).`);
        setPointButton.textContent = "1. Ustaw Punkty (Tryb Włączony: DOKĄD)";
        symulujGeoKodowanieIMarker(lngLat, 'start', 'START');
    } else {
        document.getElementById('inputDokad').value = simulatedAddress;
        updateOutput(`Ustawiono CEL (DOKĄD): ${simulatedAddress}. Kliknij "Zaplanuj Trasę".`);
        setPointButton.textContent = "1. Ustaw Punkty (Tryb Wyłączony: SKĄD)";
        symulujGeoKodowanieIMarker(lngLat, 'end', 'CEL');
    }

    isSettingStartPoint = !isSettingStartPoint;
}

function toggleMapPointSelection() {
    isSettingStartPoint = true; 
    const mapElement = document.getElementById('map');
    
    if (mapElement.classList.contains('map-clickable')) {
        mapElement.classList.remove('map-clickable');
        setPointButton.classList.remove('active');
        setPointButton.textContent = "1. Ustaw Punkty (Tryb Wyłączony)";
        map.off('click', handleMapClick);
        updateOutput("Tryb wyboru punktów na mapie został WYŁĄCZONY. Wpisz adresy ręcznie.");
    } else {
        mapElement.classList.add('map-clickable');
        setPointButton.classList.add('active');
        setPointButton.textContent = "1. Ustaw Punkty (Tryb Włączony: SKĄD)";
        isSettingStartPoint = true;
        map.on('click', handleMapClick);
        updateOutput("Tryb wyboru punktów na mapie został WŁĄCZONY. Kliknij na mapę, aby ustawić punkt STARTOWY (SKĄD).");
    }
}

// ... (CAŁY POZOSTAŁY KOD FUNKCJI Z POPRZEDNIEGO KROKU MUSI ZOSTAĆ SKOPIOWANY TUTAJ) ...

// Funkcje Autoryzacji, Biletów, Portfela, itd. muszą być tutaj!
function updateAuthUI() { /* ... */ }
function showLoginModal() { /* ... */ }
function handleLogin(type) { /* ... */ }
// ... [Wklej resztę kodu] ...

document.addEventListener('DOMContentLoaded', initApp);
