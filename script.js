// --- Globalna Baza Danych i Finanse ---
const KURS_EUR_PLN = 4.30;
const KURS_CZK_PLN = 0.17; 

// --- ZMIENNE STANU APLIKACJI ---
let walletBalance = 100.00; 
let isLoggedIn = false;
let userName = "Gość"; 
let isSettingStartPoint = true; 

let lastTicketCode = null; 
let aktywneBilety = [];
let userLocation = null; 
let userLocationMarker = null;

// --- DANE MIAST (FORMAT: [LAT, LNG] DLA LEAFLET) ---
const DATA = {
    "Rzym": {
        kod: "ATAC", flaga: "🇮🇹", centrum: [41.9028, 12.4964], 
        bilety: { "jednorazowy_BIT": { cena: 1.50, waluta: "EUR", waznosc_min: 100 }, "dzienny_24h": { cena: 7.00, waluta: "EUR", waznosc_min: 1440 } },
        poi: { "Koloseum": [41.8902, 12.4922], "Watykan": [41.9022, 12.4540], "Termini (Stacja)": [41.901, 12.501], "Piazza Venezia": [41.896, 12.482] },
        trasy: [ /* ... (Dane tras) ... */ ]
    },
    "Berlin": {
        kod: "BVG", flaga: "🇩🇪", centrum: [52.5200, 13.4050], 
        bilety: { "jednorazowy_AB": { cena: 3.50, waluta: "EUR", waznosc_min: 120 }, "dzienny": { cena: 9.90, waluta: "EUR", waznosc_min: 1440 } },
        poi: { "Brama Brandenburska": [52.5163, 13.3777], "Alexanderplatz": [52.5219, 13.4116], "Hbf (Stacja Główna)": [52.5255, 13.3695], "Potsdamer Platz": [52.509, 13.375] },
        trasy: [ /* ... (Dane tras) ... */ ]
    },
    "Praga": {
        kod: "DPP", flaga: "🇨🇿", centrum: [50.0880, 14.4208],
        bilety: { "30_minut": { cena: 30, waluta: "CZK", waznosc_min: 30 }, "dzienny": { cena: 120, waluta: "CZK", waznosc_min: 1440 } },
        poi: { "Zamek Praski": [50.0917, 14.4018], "Most Karola": [50.0864, 14.4115], "Stare Mesto": [50.0878, 14.4208], "Vaclavske Namesti": [50.081, 14.425] },
        trasy: [ /* ... (Dane tras) ... */ ]
    }
};

// --- Zmienne Globalne i Obiekty Mapy ---
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


// --- FUNKCJE INICJALIZACYJNE I MAPY (WZMACNIANIE) ---

function initApp() {
    updateAuthUI();
    // Odroczone ładowanie mapy, aby dać Leaflet czas na inicjalizację
    setTimeout(initMap, 100); 
}

// PRZEPISANE: WZMOCNIONA INICJALIZACJA LEAFLET
function initMap() {
    try {
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error("Błąd: Element #map nie istnieje w DOM.");
            setTimeout(initMap, 500);
            return;
        }

        if (map !== null) map.remove(); 

        // Użycie instrukcji Leaflet
        map = L.map('map').setView([0, 0], 2); 
        
        // Dodanie kafelków OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Ustawienie pierwszego widoku
        changeCity(currentCity); 
        
        // Aktywacja kliknięcia mapy
        map.on('click', handleMapClick); 

        updateOutput(`Mapa ${currentCity} załadowana pomyślnie! Kliknij w przycisk 'Ustaw Punkty' i zacznij klikać na mapie!`);
        
    } catch (e) { 
        console.error("KRYTYCZNY BŁĄD INICJALIZACJI MAPY (JS):", e);
        outputElement.innerHTML = `❌ BŁĄD KRYTYCZNY MAPY: ${e.message}. Sprawdź konsolę (F12) i zasoby w GitHub Pages.`;
    }
}

// PRZEPISANE: Zmiana Miasta
function changeCity(cityName) {
    currentCity = cityName;
    const cityData = DATA[cityName];
    
    // ... (Logika zmiany UI, usunięcie markerów, itd.) ...
    if (map) {
        map.setView(cityData.centrum, 13);
        clearMapObjects(); 
    }
    headerTitle.innerHTML = `${cityData.flaga} GlobeRide: ${cityName} (${cityData.kod})`;
    document.getElementById('inputSkad').placeholder = `Skąd (Kliknij na mapę!)`;
    document.getElementById('inputDokad').placeholder = `Dokąd (Kliknij na mapę!)`;
    routeOptionsPanel.innerHTML = "";
    outputElement.innerHTML = `Przełączono na: ${cityName}. Wpisz adresy lub kliknij w przycisk "Ustaw Punkty".`;

}


// --- FUNKCJE MAPY I LOKALIZACJI ---
function clearMapObjects() {
    markers.forEach(m => m.remove());
    polylines.forEach(p => p.remove());
    markers = [];
    polylines = [];
}

// PRZEPISANE: Obsługa kliknięcia mapy (Leaflet)
function handleMapClick(e) {
    const latLng = e.latlng;
    const simulatedAddress = `Współrzędne (${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)})`;

    if (isSettingStartPoint) {
        document.getElementById('inputSkad').value = simulatedAddress;
        updateOutput(`Ustawiono START (SKĄD): ${simulatedAddress}. Teraz kliknij punkt CELU (DOKĄD).`);
        setPointButton.textContent = "1. Ustaw Punkty (Tryb Włączony: DOKĄD)";
    } else {
        document.getElementById('inputDokad').value = simulatedAddress;
        updateOutput(`Ustawiono CEL (DOKĄD): ${simulatedAddress}. Kliknij "Zaplanuj Trasę".`);
        setPointButton.textContent = "1. Ustaw Punkty (Tryb Wyłączony: SKĄD)";
    }
    
    const markerType = isSettingStartPoint ? 'start' : 'end';
    symulujGeoKodowanieIMarker(latLng, markerType);

    isSettingStartPoint = !isSettingStartPoint;
}

function symulujGeoKodowanieIMarker(latLng, type) {
    // Usunięcie starych markerów start/end
    markers = markers.filter(m => m !== userLocationMarker);
    markers.forEach(m => m.remove()); 

    const color = type === 'start' ? '#3f51b5' : '#e91e63';
    const popupText = type === 'start' ? 'START' : 'CEL';

    const newMarker = L.marker(latLng).addTo(map).bindPopup(`${popupText} (Współrzędne)`).openPopup();

    markers.push(newMarker);
    
    // Upewnij się, że marker użytkownika jest z powrotem
    if (userLocationMarker) {
        userLocationMarker.addTo(map);
        markers.push(userLocationMarker);
    }
}
// ... (Wszystkie pozostałe funkcje muszą być skopiowane z poprzedniego kroku!) ...
// (Logika autoryzacji, portfela, planowania trasy itd. od updateAuthUI do końca)
