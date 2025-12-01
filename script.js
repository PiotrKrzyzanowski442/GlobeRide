// --- Globalna Baza Danych i Finanse ---
const KURS_EUR_PLN = 4.30;
const KURS_CZK_PLN = 0.17; 
// MAPBOX_ACCESS_TOKEN nie jest już potrzebny, używamy Leaflet

// --- ZMIENNE STANU APLIKACJI ---
let walletBalance = 100.00; 
let isLoggedIn = false;
let userName = "Gość"; 
let isSettingStartPoint = true; 

let lastTicketCode = null; 
let aktywneBilety = [];
let userLocation = null; 
let userLocationMarker = null;

// --- DANE MIAST (DANE DLA MVP) ---
const DATA = {
    "Rzym": {
        kod: "ATAC", flaga: "🇮🇹", centrum: [12.4964, 41.9028],
        bilety: { "jednorazowy_BIT": { cena: 1.50, waluta: "EUR", waznosc_min: 100 }, "dzienny_24h": { cena: 7.00, waluta: "EUR", waznosc_min: 1440 } },
        poi: { "Koloseum": [12.4922, 41.8902], "Watykan": [12.4540, 41.9022], "Termini (Stacja)": [12.501, 41.901], "Piazza Venezia": [12.482, 41.896] },
        trasy: [
            { typ: "Najszybsza", transport: ["bus", "metro"], czas: 35, koszt: 1.50,
                segmenty: [
                    { typ: "bus", linia: "64", przesiadka: "Largo Argentina", delay: 5, color: '#00bcd4', coords: [[41.8902, 12.4922], [41.896, 12.484], [41.900, 12.476], [41.900, 12.474]] }, // Leaflet używa [lat, lng]
                    { typ: "metro", linia: "A", przesiadka: "Ottaviano", delay: 0, color: '#f44336', coords: [[41.900, 12.474], [41.901, 12.465], [41.9022, 12.4540]] }
                ]
            },
            { typ: "Najwygodniejsza", transport: ["tram", "metro"], czas: 45, koszt: 1.50,
                segmenty: [
                    { typ: "tram", linia: "8", przesiadka: "Trastevere", delay: 0, color: '#4CAF50', coords: [[41.8902, 12.4922], [41.885, 12.47], [41.890, 12.46]] },
                    { typ: "metro", linia: "A", przesiadka: "Ottaviano", delay: 0, color: '#f44336', coords: [[41.890, 12.46], [41.9022, 12.4540]] }
                ]
            }
        ]
    },
    "Berlin": {
        kod: "BVG", flaga: "🇩🇪", centrum: [52.5200, 13.4050], // Leaflet używa [lat, lng]
        bilety: { "jednorazowy_AB": { cena: 3.50, waluta: "EUR", waznosc_min: 120 }, "dzienny": { cena: 9.90, waluta: "EUR", waznosc_min: 1440 } },
        poi: { "Brama Brandenburska": [52.5163, 13.3777], "Alexanderplatz": [52.5219, 13.4116], "Hbf (Stacja Główna)": [52.5255, 13.3695], "Potsdamer Platz": [52.509, 13.375] },
        trasy: [
            { typ: "Metro/Pociąg", transport: ["metro", "train"], czas: 25, koszt: 3.50,
                segmenty: [
                    { typ: "train", linia: "S7", przesiadka: "Friedrichstraße", delay: 0, color: '#FF9800', coords: [[52.5163, 13.3777], [52.518, 13.385], [52.520, 13.395]] },
                    { typ: "metro", linia: "U5", przesiadka: "Alexanderplatz", delay: 0, color: '#3f51b5', coords: [[52.520, 13.395], [52.5219, 13.4116]] }
                ]
            },
            { typ: "Autobus", transport: ["bus"], czas: 40, koszt: 3.50,
                segmenty: [
                    { typ: "bus", linia: "100", przesiadka: "Tiergarten", delay: 0, color: '#e91e63', coords: [[52.5163, 13.3777], [52.52, 13.36], [52.5219, 13.4116]] }
                ]
            }
        ]
    },
    "Praga": {
        kod: "DPP", flaga: "🇨🇿", centrum: [50.0880, 14.4208],
        bilety: { "30_minut": { cena: 30, waluta: "CZK", waznosc_min: 30 }, "dzienny": { cena: 120, waluta: "CZK", waznosc_min: 1440 } },
        poi: { "Zamek Praski": [50.0917, 14.4018], "Most Karola": [50.0864, 14.4115], "Stare Mesto": [50.0878, 14.4208], "Vaclavske Namesti": [50.081, 14.425] },
        trasy: [
            { typ: "Tramwaj/Metro", transport: ["tram", "metro"], czas: 20, koszt: 30,
                segmenty: [
                    { typ: "tram", linia: "22", przesiadka: "Malostranská", delay: 0, color: '#00bcd4', coords: [[50.0917, 14.4018], [50.090, 14.41], [50.088, 14.42]] },
                    { typ: "metro", linia: "A", przesiadka: "Můstek", delay: 0, color: '#795548', coords: [[50.088, 14.42], [50.085, 14.425], [50.0864, 14.4115]] }
                ]
            }
        ]
    }
};

// --- Zmienne Globalne i Obiekty Mapy ---
let map = null;
let markers = []; // Przechowuje markery Leaflet
let polylines = []; // Przechowuje linie Leaflet
let currentCity = "Rzym";


const outputElement = document.getElementById('output');
const routeOptionsPanel = document.getElementById('routeOptionsPanel');
const headerTitle = document.getElementById('headerTitle');
const walletInfo = document.getElementById('walletInfo');
const authButton = document.getElementById('authButton');
const setPointButton = document.getElementById('setPointButton');

// ... (Pominięto funkcje autoryzacji, portfela i UI dla zwięzłości, zakładamy, że są skopiowane) ...
// Logika Autoryzacji, Portfela (updateAuthUI, handleLogin, kupBilet, itd.)

// --- FUNKCJE INICJALIZACYJNE I MAPY (PRZEPISANE DLA LEAFLET) ---

function initApp() {
    initMap();
    changeCity("Rzym");
    updateAuthUI();
}

// NOWOŚĆ: Funkcja do usuwania wszystkich obiektów mapy
function clearMapObjects() {
    markers.forEach(m => m.remove());
    polylines.forEach(p => p.remove());
    markers = [];
    polylines = [];
}

// PRZEPISANE: Inicjalizacja Leaflet
function initMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) {
        setTimeout(initMap, 500);
        return;
    }

    if (map !== null) map.remove(); 

    try {
        // Inicjalizacja mapy Leaflet (centrum i zoom będą zmienione przez changeCity)
        map = L.map('map').setView([0, 0], 2); 
        
        // Dodanie kafelków OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        map.on('load', function() { 
            updateOutput(`Mapa ${currentCity} załadowana pomyślnie! Kliknij w przycisk 'Ustaw Punkty' i zacznij klikać na mapie!`);
            map.on('click', handleMapClick); 
        });
        
        // Leaflet rzadko zgłasza błędy ładowania kafelków, więc to jest mniej krytyczne.
        map.on('error', function(e) { updateOutput("Błąd ładowania kafelków mapy. Sprawdź połączenie."); });
        
    } catch (e) { updateOutput("Błąd inicjalizacji mapy Leaflet: " + e.message); }
}

// PRZEPISANE: Zmiana Miasta (użycie L.latLng)
function changeCity(cityName) {
    currentCity = cityName;
    const cityData = DATA[cityName];
    
    userLocation = null; 
    if (userLocationMarker) userLocationMarker.remove();

    headerTitle.innerHTML = `${cityData.flaga} GlobeRide: ${cityName} (${cityData.kod})`;
    document.getElementById('inputSkad').placeholder = `Skąd (Kliknij na mapę!)`;
    document.getElementById('inputDokad').placeholder = `Dokąd (Kliknij na mapę!)`;
    routeOptionsPanel.innerHTML = "";
    outputElement.innerHTML = `Przełączono na: ${cityName}. Wpisz adresy lub kliknij w przycisk "Ustaw Punkty".`;

    if (map) {
        map.setView(cityData.centrum, 13); // Użycie Leaflet's setView
        clearMapObjects(); // Usunięcie starych markerów i linii
    }
}

// PRZEPISANE: Zaznaczanie Punktów Leaflet (Marker)
function zaznaczPunkty(poczatekCoords, koniecCoords, skad, dokad) {
    clearMapObjects(); // Usunięcie starych markerów i linii

    // Marker START
    const popupStart = L.popup().setContent(`START: ${skad}`);
    const markerStart = L.marker(poczatekCoords).addTo(map).bindPopup(popupStart);
    markers.push(markerStart);

    // Marker CEL
    const popupCel = L.popup().setContent(`CEL: ${dokad}`);
    const markerEnd = L.marker(koniecCoords).addTo(map).bindPopup(popupCel);
    markers.push(markerEnd);

    // Dopasowanie widoku mapy
    const bounds = L.latLngBounds(poczatekCoords, koniecCoords);
    map.fitBounds(bounds, {padding: [50, 50]});
}

// PRZEPISANE: Rysowanie Segmentów Leaflet (Polyline)
function narysujTraseSegmentami(segmenty) {
    // Usunięcie tylko linii, markery zostają
    polylines.forEach(p => p.remove());
    polylines = [];
    
    // Rysowanie każdego segmentu osobno
    segmenty.forEach((segment) => {
        
        const polyline = L.polyline(segment.coords, {
            color: segment.color,
            weight: segment.typ === 'metro' || segment.typ === 'train' ? 7 : 5,
            opacity: 0.8
        }).addTo(map);

        polylines.push(polyline);
        
        // Dodaj marker dla przesiadki (jeśli to nie jest ostatni segment)
        if (segment.przesiadka && segment.coords.length > 1) {
            const przesiadkaCoords = segment.coords[segment.coords.length - 1];
            
            // Tworzenie markera jako zwykła kropka (Leaflet nie używa klasy DOM tak jak Mapbox)
            const stopMarker = L.circleMarker(przesiadkaCoords, {
                radius: 5,
                fillColor: '#3f51b5',
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 1
            }).bindPopup(`Przesiadka: ${segment.przesiadka}`).addTo(map);
            
            markers.push(stopMarker);
        }
    });
}

// PRZEPISANE: Obsługa kliknięcia mapy (Leaflet)
function handleMapClick(e) {
    const latLng = e.latlng; // Leaflet zwraca L.latLng
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

    const newMarker = L.marker(latLng, {
        icon: L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 20]
        })
    }).addTo(map).bindPopup(`${popupText} (Współrzędne)`);

    markers.push(newMarker);
    
    // Upewnij się, że marker użytkownika jest z powrotem
    if (userLocationMarker) {
        userLocationMarker.addTo(map);
        markers.push(userLocationMarker);
    }
}

// ... (pozostałe funkcje muszą być skopiowane i zaktualizowane, aby używać zmiennych Leaflet) ...

// Przykład: setMyCurrentLocation wymaga drobnej zmiany
function setMyCurrentLocation(inputId) {
    const cityData = DATA[currentCity];
    userLocation = cityData.centrum; 

    if (userLocationMarker) userLocationMarker.remove();
    
    // Użycie domyślnego markera Leaflet
    userLocationMarker = L.marker(userLocation).addTo(map).bindPopup('Moja aktualna pozycja (Symulowana)').openPopup();
    
    // Upewnij się, że inne markery zostały usunięte
    markers = markers.filter(m => m !== userLocationMarker);
    markers.forEach(m => m.remove());
    markers = [userLocationMarker];

    document.getElementById(inputId).value = "Moja aktualna pozycja";
    map.flyTo(userLocation, 15);
    updateOutput("📍 Ustawiono punkt startowy jako: Moja aktualna pozycja (Symulacja GPS).");
}

function updateOutput(message) { outputElement.innerHTML = message.replace(/\n/g, '<br>'); }
function formatDate(timestamp) { return new Date(timestamp).toLocaleString('pl-PL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }); }

// ... (inne pominięte funkcje, np. planujTraseClick, muszą być skopiowane) ...
