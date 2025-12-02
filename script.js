// --- Globalna Baza Danych, Kursy ---
const KURS_EUR_PLN = 4.30;
const KURS_CZK_PLN = 0.17; 
// MAPBOX_ACCESS_TOKEN NIE JEST JUŻ UŻYWANY

// --- ZMIENNE STANU APLIKACJI ---
let walletBalance = 100.00; 
let isLoggedIn = false;
let userName = "Gość"; 
let isSettingStartPoint = true; 

let lastTicketCode = null; 
let aktywneBilety = [];
let userLocation = null; // Koordynaty nie są już potrzebne
let userLocationMarker = null;

let favorites = JSON.parse(localStorage.getItem('globeRideFavorites')) || [];


// --- DANE MIAST (KORDYNATY ZOSTALY USUNIĘTE, TYLKO NAZWY) ---
const DATA = {
    "Rzym": {
        kod: "ATAC", flaga: "🇮🇹", centrum: [12.4964, 41.9028], 
        bilety: { "jednorazowy_BIT": { cena: 1.50, waluta: "EUR", waznosc_min: 100 }, "dzienny_24h": { cena: 7.00, waluta: "EUR", waznosc_min: 1440 } },
        poi: { "Koloseum": "Koloseum", "Watykan": "Watykan", "Termini (Stacja)": "Termini (Stacja)" },
        trasy: [
            { typ: "Najszybsza", transport: ["bus", "metro"], czas: 35, koszt: 1.50, segmenty: [{ typ: "bus", linia: "64", przesiadka: "Largo Argentina", delay: 5, color: '#00bcd4' }, { typ: "metro", linia: "A", przesiadka: "Ottaviano", delay: 0, color: '#f44336' }] },
            { typ: "Najwygodniejsza", transport: ["tram", "metro"], czas: 45, koszt: 1.50, segmenty: [{ typ: "tram", linia: "8", przesiadka: "Trastevere", delay: 0, color: '#4CAF50' }, { typ: "metro", linia: "A", przesiadka: "Ottaviano", delay: 0, color: '#f44336' }] }
        ]
    },
    "Berlin": {
        kod: "BVG", flaga: "🇩🇪", centrum: [13.4050, 52.5200], 
        bilety: { "jednorazowy_AB": { cena: 3.50, waluta: "EUR", waznosc_min: 120 }, "dzienny": { cena: 9.90, waluta: "EUR", waznosc_min: 1440 } },
        poi: { "Brama Brandenburska": "Brama Brandenburska", "Alexanderplatz": "Alexanderplatz", "Hbf (Stacja Główna)": "Hbf (Stacja Główna)" },
        trasy: [
            { typ: "Metro/Pociąg", transport: ["metro", "train"], czas: 25, koszt: 3.50, segmenty: [{ typ: "train", linia: "S7", przesiadka: "Friedrichstraße", delay: 0, color: '#FF9800' }, { typ: "metro", linia: "U5", przesiadka: "Alexanderplatz", delay: 0, color: '#3f51b5' }] },
            { typ: "Autobus", transport: ["bus"], czas: 40, koszt: 3.50, segmenty: [{ typ: "bus", linia: "100", przesiadka: "Tiergarten", delay: 0, color: '#e91e63' }] }
        ]
    },
    "Praga": {
        kod: "DPP", flaga: "🇨🇿", centrum: [14.4208, 50.0880],
        bilety: { "30_minut": { cena: 30, waluta: "CZK", waznosc_min: 30 }, "dzienny": { cena: 120, waluta: "CZK", waznosc_min: 1440 } },
        poi: { "Zamek Praski": "Zamek Praski", "Most Karola": "Most Karola", "Stare Mesto": "Stare Mesto" },
        trasy: [
            { typ: "Tramwaj/Metro", transport: ["tram", "metro"], czas: 20, koszt: 30, segmenty: [{ typ: "tram", linia: "22", przesiadka: "Malostranská", delay: 0, color: '#00bcd4' }, { typ: "metro", linia: "A", przesiadka: "Můstek", delay: 0, color: '#795548' }] }
        ]
    }
};

// --- Obiekty DOM ---
const outputElement = document.getElementById('output');
const routeOptionsPanel = document.getElementById('routeOptionsPanel');
const headerTitle = document.getElementById('headerTitle');
const walletInfo = document.getElementById('walletInfo');
const authButton = document.getElementById('authButton');

let currentCity = "Rzym";


// --- FUNKCJE KRYTYCZNE (USUNIĘTO LOGIKĘ MAPY) ---

function initApp() {
    updateAuthUI();
    // Mapa nie jest już inicjalizowana!
    changeCity("Rzym");
    updateOutput(`Aplikacja gotowa! Użyj pól tekstowych i przycisku 'Zaplanuj Trasę'.`);
}

function changeCity(cityName) {
    currentCity = cityName;
    const cityData = DATA[cityName];
    
    // Ładowanie Ulubionych
    loadFavoritesUI(); 

    headerTitle.innerHTML = `${cityData.flaga} GlobeRide: ${cityName} (${cityData.kod})`;
    document.getElementById('inputSkad').placeholder = `Skąd (np. ${Object.keys(cityData.poi)[0]})`;
    document.getElementById('inputDokad').placeholder = `Dokąd (np. ${Object.keys(cityData.poi)[1]})`;
    routeOptionsPanel.innerHTML = "";
    
    updateOutput(`Przełączono na: ${cityName}. Aplikacja gotowa.`);
}

function planujTraseClick() {
    const skadInput = document.getElementById('inputSkad').value.trim();
    const dokadInput = document.getElementById('inputDokad').value.trim();
    const selectedTransport = document.getElementById('transportType').value;
    const cityData = DATA[currentCity];

    if (!skadInput || !dokadInput) {
        updateOutput("Wprowadź adres początkowy i końcowy.");
        return;
    }
    
    // W tej wersji symulujemy, że adresy są poprawne.
    planujTrase(cityData.trasy, selectedTransport);
}


// --- LOGIKA BIZNESOWA I UX (BEZ MAPY) ---

function planujTrase(trasy, selectedTransport) {
    const transferFilter = document.getElementById('transferFilter').value;
    
    const trasyZMetadanymi = trasy.map(trasa => {
        return {
            ...trasa,
            numTransfers: trasa.segmenty.length - 1,
        };
    });

    if (transferFilter === 'min') {
        trasyZMetadanymi.sort((a, b) => a.numTransfers - b.numTransfers);
    } 

    let optionsHTML = `<h3>Dostępne Opcje Trasy dla ${currentCity}:</h3>`;
    let foundRoutes = false;

    trasyZMetadanymi.forEach((trasa, index) => {
        if (selectedTransport === 'all' || trasa.transport.includes(selectedTransport)) {
            const kosztPLN = convertCurrency(trasa.koszt, DATA[currentCity].bilety.jednorazowy_BIT ? DATA[currentCity].bilety.jednorazowy_BIT.waluta : 'EUR');
            
            optionsHTML += `
                <div class="route-option" onclick="selectRoute(${index})">
                    <div style="float: right;"><span onclick="event.stopPropagation(); alert('Wystawiono ocenę 5/5 dla tej trasy!');">⭐</span></div>
                    <strong>${trasa.typ} (${trasa.czas} min)</strong> - Przesiadek: ${trasa.numTransfers}<br>
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
    updateOutput(`Znaleziono ${foundRoutes ? trasyZMetadanymi.length : 0} opcji. Kliknij, aby zobaczyć szczegóły.`);
}


function selectRoute(index) {
    const trasa = DATA[currentCity].trasy[index];
    
    const iconMap = {
        'bus': '🚍 Autobus',
        'metro': '🚇 Metro',
        'tram': '🚋 Tramwaj',
        'train': '🚂 Pociąg'
    };
    
    let detale = `<h3>Trasa: ${trasa.typ} (${trasa.czas} min)</h3>\n`;
    detale += `<div style="text-align: left; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">`;
    
    detale += `<strong>🚶 START: Twoja lokalizacja</strong><br>`;
    
    trasa.segmenty.forEach((segment, segmentIndex) => {
        const icon = iconMap[segment.typ] || '➡️';
        const opoznienie = segment.delay > 0 ? ` <span style="color: red; font-weight: bold;">(+${segment.delay} min)</span>` : '';
        const isLast = segmentIndex === trasa.segmenty.length - 1;
        
        detale += `<hr style="border-top: 1px dashed #bbb;">`;
        detale += `${icon} <strong>Linia ${segment.linia}</strong>${opoznienie}<br>`;
        detale += `&nbsp; &nbsp; ↳ Kierunek: ${segment.przesiadka || 'CEL'}<br>`;

        if (!isLast) {
            detale += `&nbsp; &nbsp; 🔄 **Przesiądź się** na: ${segment.przesiadka}<br>`;
        } else {
            detale += `&nbsp; &nbsp; 🏁 **Wysiądź** na przystanku: ${segment.przesiadka || 'CEL'}`;
        }
    });

    detale += `</div>`;
    
    updateOutput(detale);
}


// --- FUNKCJE POMOCNICZE I UI ---

function updateOutput(message) { outputElement.innerHTML = message; }
function convertCurrency(price, currency) {
    if (currency === "EUR") return price * KURS_EUR_PLN;
    if (currency === "CZK") return price * KURS_CZK_PLN;
    return price;
}
function formatDate(timestamp) { return new Date(timestamp).toLocaleString('pl-PL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }); }

// Logika Ulubionych
function loadFavoritesUI() {
    const selectFrom = document.getElementById('favoriteFrom');
    const selectTo = document.getElementById('favoriteTo');

    selectFrom.innerHTML = '<option value="">⭐ Ulubione</option>';
    selectTo.innerHTML = '<option value="">⭐ Ulubione</option>';

    if (favorites.length > 0) {
        favorites.forEach(fav => {
            const optionFrom = document.createElement('option');
            const optionTo = document.createElement('option');
            
            optionFrom.value = fav;
            optionFrom.textContent = fav;
            optionTo.value = fav;
            optionTo.textContent = fav;
            
            selectFrom.appendChild(optionFrom);
            selectTo.appendChild(optionTo);
        });
    }
}

function addToFavorites() {
    const address = document.getElementById('inputSkad').value.trim();
    if (address && !favorites.includes(address)) {
        favorites.push(address);
        localStorage.setItem('globeRideFavorites', JSON.stringify(favorites));
        loadFavoritesUI();
        updateOutput(`Adres "${address}" został dodany do Ulubionych.`);
    } else if (address) {
        updateOutput(`Adres "${address}" już znajduje się w Ulubionych.`);
    } else {
        updateOutput("Wpisz adres, zanim dodasz go do Ulubionych.");
    }
}

// Logika UI i Autoryzacji (updateAuthUI, showLoginModal, handleLogin, handleLogout, addFunds)
function updateAuthUI() { /* ... */ }
function showLoginModal() { document.getElementById('loginModal').style.display = 'block'; }
function closeLoginModal() { document.getElementById('loginModal').style.display = 'none'; }
function handleLogin(type) { /* ... */ }
function handleLogout() { /* ... */ }
function addFunds() { /* ... */ }

// Logika Biletów i Portfela (pokazOpcjeBiletowe, kupBilet, pokazPortfel, showValidationPanel, validateTicket)
function pokazOpcjeBiletowe() { /* ... */ }
function kupBilet(ticketKey, cityData) { /* ... */ }
function pokazPortfel() { /* ... */ }
function showValidationPanel() { /* ... */ }
function validateTicket(code) { /* ... */ }


// --- URUCHOMIENIE APLIKACJI ---
document.addEventListener('DOMContentLoaded', initApp);
