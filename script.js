// --- Globalna Baza Danych i Finanse ---
const KURS_EUR_PLN = 4.30;
const KURS_CZK_PLN = 0.17; 
const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDliM3giLCJjIjoiY2pvdW4zZWVmYzE5M2FvY2h3d3d3bXQwZiJ9';
    
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
                    { typ: "bus", linia: "64", przesiadka: "Largo Argentina", delay: 5, color: '#00bcd4', coords: [[12.4922, 41.8902], [12.484, 41.896], [12.476, 41.900], [12.474, 41.900]] },
                    { typ: "metro", linia: "A", przesiadka: "Ottaviano", delay: 0, color: '#f44336', coords: [[12.474, 41.900], [12.465, 41.901], [12.4540, 41.9022]] }
                ]
            },
            { typ: "Najwygodniejsza", transport: ["tram", "metro"], czas: 45, koszt: 1.50,
                segmenty: [
                    { typ: "tram", linia: "8", przesiadka: "Trastevere", delay: 0, color: '#4CAF50', coords: [[12.4922, 41.8902], [12.47, 41.885], [12.46, 41.890]] },
                    { typ: "metro", linia: "A", przesiadka: "Ottaviano", delay: 0, color: '#f44336', coords: [[12.46, 41.890], [12.4540, 41.9022]] }
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
                    { typ: "train", linia: "S7", przesiadka: "Friedrichstraße", delay: 0, color: '#FF9800', coords: [[13.3777, 52.5163], [13.385, 52.518], [13.395, 52.520]] },
                    { typ: "metro", linia: "U5", przesiadka: "Alexanderplatz", delay: 0, color: '#3f51b5', coords: [[13.395, 52.520], [13.4116, 52.5219]] }
                ]
            },
            { typ: "Autobus", transport: ["bus"], czas: 40, koszt: 3.50,
                segmenty: [
                    { typ: "bus", linia: "100", przesiadka: "Tiergarten", delay: 0, color: '#e91e63', coords: [[13.3777, 52.5163], [13.36, 52.52], [13.4116, 52.5219]] }
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
                    { typ: "tram", linia: "22", przesiadka: "Malostranská", delay: 0, color: '#00bcd4', coords: [[14.4018, 50.0917], [14.41, 50.090], [14.42, 50.088]] },
                    { typ: "metro", linia: "A", przesiadka: "Můstek", delay: 0, color: '#795548', coords: [[14.42, 50.088], [14.425, 50.085], [14.4115, 50.0864]] }
                ]
            }
        ]
    }
};

// --- Zmienne Globalne i Obiekty Mapy ---
mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
let map = null;
let markers = [];
let currentCity = "Rzym";

const outputElement = document.getElementById('output');
const routeOptionsPanel = document.getElementById('routeOptionsPanel');
const headerTitle = document.getElementById('headerTitle');
const walletInfo = document.getElementById('walletInfo');
const authButton = document.getElementById('authButton');
const setPointButton = document.getElementById('setPointButton');


// --- FUNKCJE AUTORYZACJI ---

function updateAuthUI() {
    if (isLoggedIn) {
        authButton.textContent = `Wyloguj (${userName})`;
        authButton.onclick = handleLogout;
        walletInfo.style.display = 'block';
        updateOutput(`Witaj, ${userName}! Jesteś zalogowany.`);
    } else {
        authButton.textContent = 'Zaloguj się';
        authButton.onclick = showLoginModal;
        walletInfo.style.display = 'none';
        updateOutput("Proszę się zalogować, aby zarządzać portfelem i biletami.");
    }
    updateWalletDisplay();
}

function showLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

function handleLogin(action) {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (email.length < 3 || password.length < 3) {
        alert("Wpisz przynajmniej 3 znaki w obu polach.");
        return;
    }

    // Symulacja logowania/rejestracji:
    isLoggedIn = true;
    userName = email.split('@')[0]; // Ustawiamy nazwę użytkownika na część emaila przed @
    walletBalance = 100.00; // Resetujemy saldo po zalogowaniu na startowe
    
    closeLoginModal();
    updateAuthUI();
}

function handleLogout() {
    if (confirm("Czy na pewno chcesz się wylogować?")) {
        isLoggedIn = false;
        userName = "Gość";
        walletBalance = 0.00;
        aktywneBilety = []; // Czysty portfel po wylogowaniu
        updateAuthUI();
        alert("Wylogowano pomyślnie. Saldo i bilety zostały wyczyszczone.");
    }
}


// --- FUNKCJE PORTFELA I WALIDACJI ---

function updateWalletDisplay() {
    walletInfo.textContent = `Saldo: ${walletBalance.toFixed(2)} PLN (Kliknij by doładować)`;
}

function addFunds() {
    if (!isLoggedIn) {
        alert("⚠️ Błąd: Musisz być zalogowany, aby doładować Portfel.");
        showLoginModal();
        return;
    }

    const amount = prompt("Podaj kwotę doładowania (PLN):", "50");
    const numericAmount = parseFloat(amount);
    if (numericAmount > 0) {
        walletBalance += numericAmount;
        updateWalletDisplay();
        alert(`Doładowano ${numericAmount.toFixed(2)} PLN. Nowe saldo: ${walletBalance.toFixed(2)} PLN.`);
    } else if (amount !== null) {
        alert("Nieprawidłowa kwota.");
    }
}

function showValidationPanel() {
    const code = prompt("PANEL KONTROLERA:\nWpisz kod walidacyjny biletu:", lastTicketCode || "");
    if (code) {
        validateTicket(code);
    }
}

function validateTicket(code) {
    const bilet = aktywneBilety.find(b => b.kod_walidacji.toString() === code.toString());
    const validationDiv = document.createElement('div');
    let status = "❌ NIEWAŻNY / NIEZNANY";
    let statusClass = "invalid";

    if (bilet) {
        const teraz = Date.now();
        if (teraz < bilet.wazny_do) {
            status = "✅ WAŻNY";
            statusClass = "valid";
        } else {
            status = "❌ NIEWAŻNY (Wygasł)";
        }
        validationDiv.innerHTML = `${status}<br><span style="font-size: 0.5em;">Bilet ${bilet.typ} (${bilet.miasto})</span>`;
    } else {
        validationDiv.innerHTML = `${status}<br><span style="font-size: 0.5em;">Kod ${code} nie znaleziony.</span>`;
    }
    
    validationDiv.className = `validation-screen ${statusClass}`;
    validationDiv.innerHTML += `<button onclick="this.parentNode.remove()">Zamknij</button>`;
    document.body.appendChild(validationDiv);
}

function pokazOpcjeBiletowe() {
    if (!isLoggedIn) {
        alert("⚠️ Błąd: Musisz być zalogowany, aby kupować bilety.");
        showLoginModal();
        return;
    }
    const cityData = DATA[currentCity];
    let opcjeList = `Twoje saldo: ${walletBalance.toFixed(2)} PLN.\nWybierz numer biletu do zakupu (${currentCity}):\n\n`;
    const opcje = Object.keys(cityData.bilety);

    opcje.forEach((typ, index) => {
        const info = cityData.bilety[typ];
        const kurs = info.waluta === 'EUR' ? KURS_EUR_PLN : KURS_CZK_PLN;
        let cenaPln = (info.cena * kurs);
        opcjeList += `${index + 1}. ${typ.toUpperCase().replace(/_/g, ' ')} - ${info.cena.toFixed(2)} ${info.waluta} (${cenaPln.toFixed(2)} PLN)\n`;
    });
    
    const wybor = prompt(opcjeList);

    if (wybor === null || wybor === "") return;
        
    try {
        const wybranyIndex = parseInt(wybor) - 1;
        const typBiletu = opcje[wybranyIndex];
        kupBilet(typBiletu, cityData);
    } catch (e) { alert("❌ Nieprawidłowy wybór. Spróbuj ponownie."); }
}

function kupBilet(typBiletu, cityData) {
    const info = cityData.bilety[typBiletu];
    const kurs = info.waluta === 'EUR' ? KURS_EUR_PLN : KURS_CZK_PLN;
    const kosztPln = info.cena * kurs;

    if (kosztPln > walletBalance) {
        alert(`⚠️ TRANSAKCJA ODRZUCONA: Saldo (${walletBalance.toFixed(2)} PLN) jest niewystarczające do zakupu tego biletu (${kosztPln.toFixed(2)} PLN). Proszę doładować portfel.`);
        return;
    }

    updateOutput(`Płacę za ${typBiletu.toUpperCase().replace(/_/g, ' ')} w ${currentCity} z Portfela GlobeRide...`);

    setTimeout(() => {
        walletBalance -= kosztPln; 
        updateWalletDisplay();
        
        const czasZakupu = Date.now();
        const czasWygasniecia = czasZakupu + info.waznosc_min * 60000;
        const kod = Math.floor(Math.random() * 900000) + 100000;
        
        const bilet = { miasto: currentCity, typ: typBiletu, data_zakupu: czasZakupu, wazny_do: czasWygasniecia, kod_walidacji: kod };
        aktywneBilety.push(bilet);
        lastTicketCode = kod;
        
        alert(`✅ Płatność zakończona! Koszt: ${kosztPln.toFixed(2)} PLN. Bilet dodany do portfela! Kod walidacji: ${kod}`);
        pokazPortfel();
    }, 1500);
}

function pokazPortfel() {
    if (!isLoggedIn) {
        updateOutput("⚠️ Błąd: Musisz być zalogowany, aby zobaczyć portfel.");
        showLoginModal();
        return;
    }
    if (aktywneBilety.length === 0) {
        updateOutput("Brak aktywnych biletów w portfelu.");
        return;
    }

    let wynik = "--- 📱 PORTFEL BILETÓW UŻYTKOWNIKA " + userName.toUpperCase() + " ---\n";
    const teraz = Date.now();
    
    aktywneBilety.forEach((bilet, index) => {
        const waznyDo = bilet.wazny_do;
        const statusTekst = teraz < waznyDo ? '✅ WAŻNY' : '❌ NIEWAŻNY';
        const statusStyle = teraz < waznyDo ? 'color: green; font-weight: bold;' : 'color: red; font-weight: bold;';
        
        wynik += `\nBilet #${index + 1} (${bilet.miasto}): ${bilet.typ.toUpperCase().replace(/_/g, ' ')}\n`;
        wynik += `Status: ${statusTekst}\n`;
        wynik += `Ważny do: ${formatDate(waznyDo)}\n`;
        wynik += `<div style="font-size: 2em; text-align: center; color: black; line-height: 0.5;">█▄█▀█▀█▀▄█</div>\n`;
        wynik += `Kod Walidacji: ${bilet.kod_walidacji}\n`;
        wynik += "--------------------------------------\n";
    });
    
    updateOutput(wynik);
}


// --- FUNKCJE INICJALIZACYJNE I MAPY ---

function initApp() {
    initMap();
    changeCity("Rzym");
    updateAuthUI();
}

// NAPRAWIONE: Funkcja initMap wzmocniona
function initMap() {
    // Sprawdzenie, czy element mapy istnieje, zanim spróbujemy go usunąć
    const mapElement = document.getElementById('map');
    if (!mapElement) {
        setTimeout(initMap, 500); // Ponowna próba za 0.5s jeśli element nie jest jeszcze załadowany
        return;
    }

    if (map !== null) map.remove(); 

    try {
        map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v12', 
            center: DATA[currentCity].centrum,
            zoom: 13
        });
        
        map.on('load', function() { 
            updateOutput(`Mapa ${currentCity} załadowana pomyślnie! Kliknij w przycisk 'Ustaw Punkty' i zacznij klikać na mapie!`);
            map.on('click', handleMapClick); 
        });
        map.on('error', function(e) { updateOutput("Błąd ładowania Mapbox. Spróbuj otworzyć plik w innej przeglądarce."); });
        
    } catch (e) { updateOutput("Błąd inicjalizacji mapy: " + e.message); }
}

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
        map.jumpTo({ center: cityData.centrum, zoom: 13 });
        markers.forEach(marker => marker.remove());
        markers = [];
        for (let i = 0; i < 10; i++) { 
            const layerID = `trasaGlobeRide-${i}`;
            if (map.getLayer(layerID)) { map.removeLayer(layerID); map.removeSource(layerID); }
        }
    }
}

// --- FUNKCJE INTERAKCJI Z MAPĄ ---

function toggleMapPointSelection() {
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

function handleMapClick(e) {
    const lngLat = e.lngLat;
    const simulatedAddress = `Współrzędne (${lngLat.lat.toFixed(4)}, ${lngLat.lng.toFixed(4)})`;

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
    symulujGeoKodowanieIMarker(lngLat, markerType);

    isSettingStartPoint = !isSettingStartPoint;
}

function symulujGeoKodowanieIMarker(lngLat, type) {
    markers = markers.filter(m => m !== userLocationMarker);
    markers.forEach(m => m.remove()); 

    const color = type === 'start' ? '#3f51b5' : '#e91e63';
    const popupText = type === 'start' ? 'START' : 'CEL';

    const popup = new mapboxgl.Popup().setText(`${popupText} (Współrzędne)`);
    const newMarker = new mapboxgl.Marker({color: color}).setLngLat(lngLat).setPopup(popup).addTo(map);

    markers.push(newMarker);
    
    // Upewnij się, że inne markery (jak userLocation) są ponownie dodane
    if (userLocationMarker && !markers.includes(userLocationMarker)) {
        userLocationMarker.addTo(map);
        markers.push(userLocationMarker);
    }
}

function setMyCurrentLocation(inputId) {
    const cityData = DATA[currentCity];
    userLocation = cityData.centrum; 

    if (userLocationMarker) userLocationMarker.remove();
    
    const el = document.createElement('div');
    el.className = 'marker-user';
    el.style.backgroundColor = '#007bff';
    el.style.width = '12px';
    el.style.height = '12px';
    el.style.borderRadius = '50%';
    el.style.border = '2px solid white';
    
    userLocationMarker = new mapboxgl.Marker({ element: el })
        .setLngLat(userLocation)
        .setPopup(new mapboxgl.Popup().setText('Moja aktualna pozycja (Symulowana)'))
        .addTo(map);

    document.getElementById(inputId).value = "Moja aktualna pozycja";
    map.flyTo({ center: userLocation, zoom: 15 });
    updateOutput("📍 Ustawiono punkt startowy jako: Moja aktualna pozycja (Symulacja GPS).");
    
    // Usuń markery ustawione kliknięciem, zostaw tylko GPS
    markers = [userLocationMarker]; 
    markers.forEach(m => m.remove()); 
    markers.forEach(m => m.addTo(map)); 
}


// --- RESZTA FUNKCJI POMOCNICZYCH ---

function planujTraseClick() {
    if (map === null) { updateOutput("BŁĄD: Mapa nie została załadowana."); return; }
    
    const skadInput = document.getElementById('inputSkad').value.trim();
    const dokadInput = document.getElementById('inputDokad').value.trim();
    const wybranyTransport = document.getElementById('transportType').value;
    const cityData = DATA[currentCity];

    const parseCoords = (input) => {
        if (input.startsWith('Współrzędne (')) {
            const match = input.match(/\(([^,]+),\s*([^)]+)\)/);
            if (match) return [parseFloat(match[2]), parseFloat(match[1])]; // [lng, lat]
        }
        return cityData.poi[input]; 
    };

    const poczatekCoords = skadInput === "Moja aktualna pozycja" ? userLocation : parseCoords(skadInput) || cityData.centrum;
    const koniecCoords = parseCoords(dokadInput) || cityData.centrum;

    if (poczatekCoords === cityData.centrum || koniecCoords === cityData.centrum) {
         updateOutput("OSTRZEŻENIE: Użyto domyślnych koordynat dla nieznanego adresu. Proszę użyć autouzupełniania lub kliknięcia na mapie.");
    }

    zaznaczPunkty(poczatekCoords, koniecCoords, skadInput, dokadInput);
    routeOptionsPanel.innerHTML = "";
    
    let wynik = `--- 🗺️ WYNIKI WYSZUKIWANIA: ${skadInput} → ${dokadInput} ---\n`;
    let znalezioneTrasy = false;
    
    cityData.trasy.forEach((trasa) => {
         if (wybranyTransport !== 'all' && trasa.transport.every(t => t !== wybranyTransport)) { return; }
         znalezioneTrasy = true;
         
         const waluta = cityData.bilety[Object.keys(cityData.bilety)[0]].waluta;
         const kurs = waluta === 'EUR' ? KURS_EUR_PLN : KURS_CZK_PLN;
         let cenaPln = (trasa.koszt * kurs).toFixed(2);
         const przesiadkiOpis = trasa.segmenty.map(s => `${s.typ.toUpperCase()} ${s.linia}`).join(' → ');

         const opcjaElement = document.createElement('div');
         opcjaElement.className = 'route-option';
         opcjaElement.innerHTML = `
             <div class="route-header">${trasa.typ} (${trasa.czas} min)</div>
             <div class="route-details">
                 Środki: ${trasa.transport.map(t => t.toUpperCase()).join(', ')}<br>
                 Przesiadki: ${przesiadkiOpis}<br>
                 Koszt: ${trasa.koszt.toFixed(2)} ${waluta} (${cenaPln} PLN)
             </div>
         `;
         opcjaElement.onclick = () => wybierzTrase(trasa);
         routeOptionsPanel.appendChild(opcjaElement);
    });
    
    if (!znalezioneTrasy) {
        wynik += "\nNie znaleziono tras pasujących do wybranego filtru transportu.";
        for (let i = 0; i < 10; i++) { 
            const layerID = `trasaGlobeRide-${i}`;
            if (map.getLayer(layerID)) { map.removeLayer(layerID); map.removeSource(layerID); }
        }
    } else {
         const pierwszaTrasa = cityData.trasy.find(t => wybranyTransport === 'all' || t.transport.includes(wybranyTransport));
         if (pierwszaTrasa) { wybierzTrase(pierwszaTrasa); }
    }
    updateOutput(wynik + "\nKliknij na opcję trasy, aby zobaczyć szczegóły i mapę.");
}

function narysujTraseSegmentami(segmenty) {
    for (let i = 0; i < 10; i++) { 
        const layerID = `trasaGlobeRide-${i}`;
        if (map.getLayer(layerID)) { map.removeLayer(layerID); map.removeSource(layerID); }
    }
    
    segmenty.forEach((segment, index) => {
        const layerID = `trasaGlobeRide-${index}`;
        
        map.addSource(layerID, {
            'type': 'geojson',
            'data': {
                'type': 'Feature','properties': {},
                'geometry': { 'type': 'LineString', 'coordinates': segment.coords }
            }
        });

        map.addLayer({
            'id': layerID, 'type': 'line', 'source': layerID,
            'layout': { 'line-join': 'round', 'line-cap': 'round' },
            'paint': { 
                'line-color': segment.color,
                'line-width': segment.typ === 'metro' || segment.typ === 'train' ? 7 : 5
            }
        });
        
        if (segment.przesiadka && index < segmenty.length - 1) {
            const przesiadkaCoords = segment.coords[segment.coords.length - 1];
            const el = document.createElement('div');
            el.className = 'stop-marker';
            
            new mapboxgl.Marker({ element: el })
                .setLngLat(przesiadkaCoords)
                .setPopup(new mapboxgl.Popup().setText(`Przesiadka: ${segment.przesiadka}`))
                .addTo(map);
        }
    });
}

function wybierzTrase(trasa) {
    narysujTraseSegmentami(trasa.segmenty);
    
    let detale = `WYBRANO TRASĘ: ${trasa.typ}\n`;
    detale += `Czas: ${trasa.czas} minut\n`;
    
    trasa.segmenty.forEach(segment => {
        const opoznienie = segment.delay > 0 ? `<span class="real-time-delay">(opóźnienie: ${segment.delay} min)</span>` : '';
        detale += `${segment.typ.toUpperCase()} ${segment.linia} ${opoznienie} → Przesiadka: ${segment.przesiadka || 'CEL'}\n`;
    });
    
    detale += `\nGotowy? Kup bilet, by zacząć podróż!`;
    updateOutput(detale);
}

function updateOutput(message) { outputElement.innerHTML = message.replace(/\n/g, '<br>'); }
function formatDate(timestamp) { return new Date(timestamp).toLocaleString('pl-PL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }); }

// ... (funkcje autocomplete, closeAllLists, z v9 muszą być zachowane) ...