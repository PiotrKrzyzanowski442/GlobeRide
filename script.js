// --- Globalna Baza Danych, Kursy i Token Mapbox ---
const KURS_EUR_PLN = 4.30;
const KURS_CZK_PLN = 0.17; 
// UWAGA: PROSZĘ UŻYĆ SWOJEGO WŁASNEGO, PRYWATNEGO TOKENU MAPBOX!
const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNqdGxkZG8ydDFhaDMzeHIxMzE5YzVkY2kifQ.YJc9gPq9c6B4K4m8Q3q_zg'; 


// --- ZMIENNE STANU APLIKACJI ---
let walletBalance = 100.00; 
let isLoggedIn = false;
let userName = "Gość"; 
let isSettingStartPoint = true; // true = ustawiamy 'Skąd', false = ustawiamy 'Dokąd'

let lastTicketCode = null; // Ostatni wygenerowany kod biletu
let aktywneBilety = [];
let userLocation = null; // [lng, lat]
let userLocationMarker = null;


// --- DANE MIAST (MAPBOX GL JS UŻYWA FORMATU: [LNG, LAT]) ---
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
            { typ: "Autobus (40 min)", transport: ["bus"], czas: 40, koszt: 3.50,
                segmenty: [
                    { typ: "bus", linia: "100", przesiadka: "Tiergarten", delay: 0, color: '#3f51b5', coords: [[13.3777, 52.5163], [13.390, 52.519], [13.4116, 52.5219]] }
                ]
            }
        ]
    },
    "Praga": {
        kod: "DPP", flaga: "🇨🇿", centrum: [14.4208, 50.0880], 
        bilety: { "30_minut": { cena: 30, waluta: "CZK", waznosc_min: 30 }, "dzienny": { cena: 120, waluta: "CZK", waznosc_min: 1440 } },
        poi: { "Zamek Praski": [14.4018, 50.0917], "Most Karola": [14.4115, 50.0864], "Stare Mesto": [14.4208, 50.0878], "Vaclavske Namesti": [14.425, 50.081] },
        trasy: [
            { typ: "Tramwaj/Metro", transport: ["tram", "metro"], czas: 20, koszt: 30,
                segmenty: [
                    { typ: "tram", linia: "22", przesiadka: "Malostranská", delay: 0, color: '#00bcd4', coords: [[14.4018, 50.0917], [14.41, 50.090]] },
                    { typ: "metro", linia: "A", przesiadka: "Můstek", delay: 0, color: '#795548', coords: [[14.41, 50.090], [14.4208, 50.0878], [14.4115, 50.0864]] }
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

// --- Funkcje Wsparcia ---

function updateOutput(message) {
    outputElement.innerHTML = message;
}

function convertCurrency(price, currency) {
    if (currency === "EUR") return price * KURS_EUR_PLN;
    if (currency === "CZK") return price * KURS_CZK_PLN;
    return price;
}

// --- Logika Autoryzacji/UI ---

function updateAuthUI() {
    walletInfo.innerHTML = `Saldo: ${walletBalance.toFixed(2)} PLN`;
    if (isLoggedIn) {
        authButton.textContent = `Wyloguj (${userName})`;
        authButton.onclick = handleLogout;
        walletInfo.style.display = 'inline';
    } else {
        authButton.textContent = 'Zaloguj się';
        authButton.onclick = showLoginModal;
        walletInfo.style.display = 'inline';
    }
}

function showLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

function handleLogin(type) {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (email && password) {
        isLoggedIn = true;
        userName = email.split('@')[0];
        closeLoginModal();
        updateAuthUI();
        updateOutput(`Witaj ${userName}! Jesteś zalogowany.`);
    } else {
        updateOutput("Proszę podać e-mail i hasło (dowolne).");
    }
}

function handleLogout() {
    isLoggedIn = false;
    userName = "Gość";
    updateAuthUI();
    updateOutput("Wylogowano pomyślnie.");
}

function addFunds() {
    const amount = parseFloat(prompt("Wprowadź kwotę do doładowania (PLN):", "50.00"));
    if (amount > 0) {
        walletBalance += amount;
        updateAuthUI();
        updateOutput(`Doładowano konto kwotą ${amount.toFixed(2)} PLN.`);
    }
}


// --- Logika Mapy (Mapbox GL JS) ---

function initApp() {
    updateAuthUI();
    initMap();
    changeCity("Rzym");
}

function initMap() {
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11', // Domyślny, lekki styl
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
        clearMapObjects(); // Usuń markery/linie z poprzedniego miasta
        addPoiMarkers(cityData.poi); // Dodaj POI dla nowego miasta
    }

    headerTitle.innerHTML = `${cityData.flaga} GlobeRide: ${cityName} (${cityData.kod})`;
    
    // Reset pól do POI
    const poiNames = Object.keys(cityData.poi);
    document.getElementById('inputSkad').value = poiNames[0] || 'Skąd (Kliknij na mapę!)';
    document.getElementById('inputDokad').value = poiNames[1] || 'Dokąd (Kliknij na mapę!)';

    routeOptionsPanel.innerHTML = "";
    updateOutput(`Przełączono na: ${cityName}. Wpisz adresy lub kliknij w przycisk "Ustaw Punkty".`);
}

function clearMapObjects() {
    // Usuń markery
    markers.forEach(m => m.remove());
    markers = [];
    
    // Usuń polilinie (warstwy)
    polylines.forEach(id => {
        if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(id)) map.removeSource(id);
    });
    polylines = [];
}

function addPoiMarkers(poiData) {
    for (const name in poiData) {
        const coords = poiData[name];
        const marker = new mapboxgl.Marker({ color: '#f57c00' }) // Pomarańczowy dla POI
            .setLngLat(coords)
            .setPopup(new mapboxgl.Popup().setHTML(`<h4>${name}</h4>`))
            .addTo(map);
        markers.push(marker);
    }
}

function symulujGeoKodowanieIMarker(lngLat, type, label) {
    // Znajdź i usuń stare markery start/end
    markers = markers.filter(m => {
        if (m._element.classList.contains('start-marker') && type === 'start') { m.remove(); return false; }
        if (m._element.classList.contains('end-marker') && type === 'end') { m.remove(); return false; }
        return true;
    });

    const color = type === 'start' ? '#3f51b5' : '#e91e63'; // Niebieski lub Czerwony
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
    setPointButton.textContent = "1. Ustaw Punkty (Tryb Włączony: SKĄD)";
    updateOutput("Tryb ustawiania punktów aktywny. Najpierw kliknij punkt START (Skąd).");
}

function planujTraseClick() {
    const startPoint = document.getElementById('inputSkad').value;
    const endPoint = document.getElementById('inputDokad').value;
    const selectedTransport = document.getElementById('transportType').value;

    if (startPoint.includes("Współrzędne") && endPoint.includes("Współrzędne")) {
         // Na potrzeby tej symulacji nie będziemy parsuować współrzędnych, 
         // tylko będziemy używać danych z DATA
         updateOutput("Użyto współrzędnych! Symulacja trasy na podstawie danych miejskich...");
    }
    
    // W tej symulacji ignorujemy wpisane adresy i zawsze planujemy trasy z DATA
    planujTrase(DATA[currentCity].trasy, selectedTransport);
}


// --- Logika Planowania i Biletów ---

function planujTrase(trasy, selectedTransport) {
    clearMapObjects(); // Czyści starą trasę

    let optionsHTML = `<h3>Dostępne Opcje Trasy dla ${currentCity}:</h3>`;
    let foundRoutes = false;

    trasy.forEach((trasa, index) => {
        // Filtrowanie po typie transportu
        if (selectedTransport === 'all' || trasa.transport.includes(selectedTransport)) {
            const kosztPLN = convertCurrency(trasa.koszt, DATA[currentCity].bilety.jednorazowy_BIT ? DATA[currentCity].bilety.jednorazowy_BIT.waluta : 'EUR');
            
            optionsHTML += `
                <div class="route-option" onclick="selectRoute(${index})">
                    <strong>${trasa.typ} (${trasa.czas} min)</strong><br>
                    Środki: ${trasa.transport.join(', ').toUpperCase()}<br>
                    Koszt: ${trasa.koszt.toFixed(2)} ${DATA[currentCity].bilety.jednorazowy_BIT ? DATA[currentCity].bilety.jednorazowy_BIT.waluta : 'EUR'} (${kosztPLN.toFixed(2)} PLN)
                </div>
            `;
            foundRoutes = true;
        }
    });

    if (!foundRoutes) {
        optionsHTML += "<p>Nie znaleziono tras spełniających kryteria.</p>";
    }

    routeOptionsPanel.innerHTML = optionsHTML;
    updateOutput(`Znaleziono ${foundRoutes ? trasy.length : 0} opcji. Kliknij, aby zobaczyć szczegóły na mapie.`);
}

function selectRoute(index) {
    const trasa = DATA[currentCity].trasy[index];
    clearMapObjects();

    // Dodaj markery dla POI trasy
    const startPOI = Object.values(DATA[currentCity].poi)[0];
    const endPOI = Object.values(DATA[currentCity].poi)[1];
    symulujGeoKodowanieIMarker(startPOI, 'start', 'START');
    symulujGeoKodowanieIMarker(endPOI, 'end', 'CEL');

    narysujTraseSegmentami(trasa.segmenty);
    updateOutput(`Wybrano trasę: ${trasa.typ}. Szczegóły narysowane na mapie.`);
}

function narysujTraseSegmentami(segmenty) {
    segmenty.forEach((segment, index) => {
        const geojson = {
            'type': 'Feature',
            'properties': {},
            'geometry': {
                'type': 'LineString',
                'coordinates': segment.coords
            }
        };

        const sourceId = `route-${polylines.length}`;
        const layerId = `route-layer-${polylines.length}`;

        if (map.getSource(sourceId)) {
            map.getSource(sourceId).setData(geojson);
        } else {
            map.addSource(sourceId, {
                'type': 'geojson',
                'data': geojson
            });
            map.addLayer({
                'id': layerId,
                'type': 'line',
                'source': sourceId,
                'layout': {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                'paint': {
                    'line-color': segment.color,
                    'line-width': 8,
                    'line-opacity': 0.7
                }
            });
            polylines.push(layerId);
            polylines.push(sourceId);
        }
    });

    // Dopasuj widok mapy do narysowanej trasy (Opcjonalnie)
    // const bounds = segmenty.reduce((acc, seg) => acc.extend(seg.coords[0]).extend(seg.coords[seg.coords.length - 1]), new mapboxgl.LngLatBounds());
    // if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 50 });
}

function pokazOpcjeBiletowe() {
    const cityData = DATA[currentCity];
    let biletyHTML = `<h3>Dostępne Bilety (${currentCity}):</h3>`;

    for (const key in cityData.bilety) {
        const bilet = cityData.bilety[key];
        const kosztPLN = convertCurrency(bilet.cena, bilet.waluta);
        
        biletyHTML += `
            <div class="route-option" onclick="kupBilet('${key}')">
                <strong>${key.replace('_', ' ')}</strong><br>
                Ważność: ${bilet.waznosc_min} min<br>
                Koszt: ${bilet.cena.toFixed(2)} ${bilet.waluta} (${kosztPLN.toFixed(2)} PLN)
            </div>
        `;
    }
    routeOptionsPanel.innerHTML = "";
    updateOutput(biletyHTML);
}

function kupBilet(ticketKey) {
    if (!isLoggedIn) {
        updateOutput("Musisz być zalogowany, aby kupić bilet.");
        showLoginModal();
        return;
    }

    const bilet = DATA[currentCity].bilety[ticketKey];
    const kosztPLN = convertCurrency(bilet.cena, bilet.waluta);

    if (walletBalance >= kosztPLN) {
        walletBalance -= kosztPLN;
        updateAuthUI();
        
        const expiryTime = new Date(Date.now() + bilet.waznosc_min * 60000);
        const ticketCode = Math.random().toString(36).substring(2, 10).toUpperCase();

        const nowyBilet = {
            kod: ticketCode,
            miasto: currentCity,
            typ: ticketKey,
            dataZakupu: new Date().toLocaleString(),
            waznyDo: expiryTime.toLocaleString(),
            waznyDoTimestamp: expiryTime.getTime(),
            stan: 'aktywny'
        };

        aktywneBilety.push(nowyBilet);
        lastTicketCode = ticketCode; // Zapisz dla panelu kontrolera
        
        updateOutput(`✅ Kupiono bilet ${ticketKey} za ${kosztPLN.toFixed(2)} PLN.\nKod: ${ticketCode}\nWażny do: ${nowyBilet.waznyDo}`);
    } else {
        updateOutput(`❌ Za mało środków. Brakuje ${(kosztPLN - walletBalance).toFixed(2)} PLN.`);
    }
}

function pokazPortfel() {
    if (!isLoggedIn) {
        updateOutput("Zaloguj się, aby zobaczyć portfel.");
        showLoginModal();
        return;
    }

    let portfelHTML = `<h3>Twój Portfel (${userName}):</h3>`;
    portfelHTML += `<p>Aktualne Saldo: <strong>${walletBalance.toFixed(2)} PLN</strong></p>`;
    portfelHTML += `<h4>Aktywne Bilety:</h4>`;

    if (aktywneBilety.length === 0) {
        portfelHTML += "<p>Brak aktywnych biletów.</p>";
    } else {
        aktywneBilety = aktywneBilety.filter(b => b.waznyDoTimestamp > Date.now());

        aktywneBilety.forEach(b => {
            portfelHTML += `
                <div class="route-option" style="background-color: ${b.stan === 'aktywny' ? '#e3f2fd' : '#ffebee'}; border-color: ${b.stan === 'aktywny' ? '#3f51b5' : '#f44336'};">
                    <strong>${b.typ.replace('_', ' ').toUpperCase()}</strong> (${b.miasto})<br>
                    Kod: ${b.kod}<br>
                    Ważny do: ${new Date(b.waznyDoTimestamp).toLocaleTimeString()}
                </div>
            `;
        });
    }
    routeOptionsPanel.innerHTML = "";
    updateOutput(portfelHTML);
}

function showValidationPanel() {
    const defaultCode = lastTicketCode || "Brak ostatniego biletu";

    let panelHTML = `
        <h3>Panel Kontrolera</h3>
        <p>Wprowadź kod biletu do walidacji (np. ${defaultCode}):</p>
        <input type="text" id="validationCode" placeholder="Kod Biletu" value="${defaultCode}" style="width: 100%; padding: 10px; margin-bottom: 10px;">
        <button onclick="validateTicket()" style="background-color: #9c27b0; color: white;">Waliduj</button>
        <div id="validationResult" class="validation-info"></div>
    `;
    routeOptionsPanel.innerHTML = "";
    updateOutput(panelHTML);
}

function validateTicket() {
    const code = document.getElementById('validationCode').value.toUpperCase();
    const resultElement = document.getElementById('validationResult');
    const now = Date.now();
    
    const ticket = aktywneBilety.find(b => b.kod === code);

    if (!ticket) {
        resultElement.textContent = `❌ KOD NIEPRAWIDŁOWY: Bilet o kodzie ${code} nie istnieje.`;
        resultElement.style.color = 'red';
        return;
    }

    if (ticket.waznyDoTimestamp < now) {
        ticket.stan = 'nieważny';
        resultElement.textContent = `❌ BILET NIEWAŻNY: Wygasł o ${new Date(ticket.waznyDoTimestamp).toLocaleTimeString()}.`;
        resultElement.style.color = 'red';
    } else {
        resultElement.textContent = `✅ BILET WAŻNY: ${ticket.typ.replace('_', ' ').toUpperCase()} (${ticket.miasto}). Ważny do ${new Date(ticket.waznyDoTimestamp).toLocaleTimeString()}.`;
        resultElement.style.color = 'green';
    }
}
