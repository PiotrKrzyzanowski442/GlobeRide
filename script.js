// --- Globalna Baza Danych i Finanse (Bez zmian) ---
const KURS_EUR_PLN = 4.30;
const KURS_CZK_PLN = 0.17; 
const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDliM3giLCJjIjoiY2pvdW4zZWVmYzE5M2FvY2h3d3d3bXQwZiJ9';

// --- ZMIENNE STANU APLIKACJI (Bez zmian) ---
let walletBalance = 100.00; 
let isLoggedIn = false;
let userName = "Gość"; 
let isSettingStartPoint = true; 

let lastTicketCode = null; 
let aktywneBilety = [];
let userLocation = null; 
let userLocationMarker = null;

// --- DANE MIAST (CAŁY OBIEKT DATA POZOSTAJE BEZ ZMIAN) ---
// ... (cały obiekt DATA musi zostać skopiowany tutaj) ...
// (Zakładam, że w pliku są całe definicje DATA, które były w poprzednim kroku, ale dla zwięzłości je pomijam)

const DATA = { /* ... (dane dla Rzym, Berlin, Praga) ... */ }; 

// --- Zmienne Globalne i Obiekty Mapy ---
let map = null; // Zostało puste
let markers = []; 
let polylines = [];
let currentCity = "Rzym";

const outputElement = document.getElementById('output');
const routeOptionsPanel = document.getElementById('routeOptionsPanel');
const headerTitle = document.getElementById('headerTitle');
const walletInfo = document.getElementById('walletInfo');
const authButton = document.getElementById('authButton');
const setPointButton = document.getElementById('setPointButton');


// --- FUNKCJE KRYTYCZNE (ODBLOKOWANIE INTERFEJSU) ---

function initApp() {
    updateAuthUI();
    // Uruchamiamy funkcje, które muszą się załadować
    
    // NOWOŚĆ: Uproszczona inicjalizacja mapy bez timeoutu
    try {
        initMapLite(); // Używamy lekkiej, nowej funkcji
        changeCity("Rzym");
    } catch (e) {
        // Jeśli nawet lekka inicjalizacja się nie uda, wymuszamy gotowość interfejsu
        console.error("Błąd ładowania mapy, ale interfejs jest aktywny.", e);
        changeCity("Rzym"); // Ustawiamy UI bez mapy
    }
}

// NOWA, LEKKA FUNKCJA INICJALIZACJI MAPY (Leaflet)
function initMapLite() {
    try {
        const mapElement = document.getElementById('map');
        if (!mapElement) return;

        if (map !== null) map.remove(); 

        map = L.map('map').setView([0, 0], 2); 
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Aktywacja kliknięcia mapy (jeśli mapa się załaduje)
        map.on('click', handleMapClick); 
        
        updateOutput(`Mapa ${currentCity} załadowana pomyślnie! Użyj 'Ustaw Punkty'.`);
        
    } catch (e) { 
        // W przypadku błędu, wrzucamy informację do output i nie blokujemy reszty kodu
        console.error("BŁĄD INICJALIZACJI MAPY LITE:", e);
        updateOutput(`❌ BŁĄD MAPY: Nie można załadować kafelków. Funkcjonalność biletowa jest gotowa.`);
        // Musimy usunąć warstwę mapy, jeśli istnieje
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) mapContainer.style.height = '0px'; 
    }
}

// --- FUNKCJE MAPY I LOKALIZACJI (STUBS) ---
// (Wszystkie te funkcje, które odwołują się do Leaflet, muszą być teraz chronione lub pominięte w razie błędu)

function changeCity(cityName) {
    currentCity = cityName;
    const cityData = DATA[cityName];
    
    // ... (Logika zmiany UI) ...
    if (map && map._loaded) { // Sprawdzamy, czy Leaflet jest gotowy
        map.setView(cityData.centrum, 13);
        clearMapObjects(); 
    }
    
    headerTitle.innerHTML = `${cityData.flaga} GlobeRide: ${cityName} (${cityData.kod})`;
    // ... (Reszta funkcji changeCity) ...
    // ... (Wszystkie inne funkcje zostają, ale muszą być skopiowane) ...
}

// --- Na końcu pliku, dla automatycznego uruchomienia ---
document.addEventListener('DOMContentLoaded', initApp);
