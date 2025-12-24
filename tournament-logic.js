// --- DATABASE CONFIGURATION ---
let db;
const DB_NAME = "KingsSquareTournamentDB";
const STORE_FEEDS = "liveFeeds";
const STORE_CALENDAR = "fideCalendar";

// Initialize IndexedDB
const request = indexedDB.open(DB_NAME, 1);

request.onupgradeneeded = (e) => {
    db = e.target.result;
    // Store for the Sidebar (Live Feeds)
    if (!db.objectStoreNames.contains(STORE_FEEDS)) {
        db.createObjectStore(STORE_FEEDS, { keyPath: "id", autoIncrement: true });
    }
    // Store for the FIDE Calendar Table
    if (!db.objectStoreNames.contains(STORE_CALENDAR)) {
        db.createObjectStore(STORE_CALENDAR, { keyPath: "id", autoIncrement: true });
    }
};

request.onsuccess = (e) => {
    db = e.target.result;
    console.log("High-Capacity DB Connected");
    loadHistory(); // Load everything on startup
};

// --- CORE FUNCTIONS ---

// 1. Save and Load Live Feeds (Sidebar)
function addNewTournament() {
    const name = document.getElementById('manualName').value;
    const url = document.getElementById('manualUrl').value;

    if (!name || !url) {
        alert("Please fill in both fields!");
        return;
    }

    const transaction = db.transaction([STORE_FEEDS], "readwrite");
    const store = transaction.objectStore(STORE_FEEDS);
    const entry = { name, url, timestamp: Date.now() };

    store.add(entry);

    transaction.oncomplete = () => {
        renderFeedCard(entry);
        document.getElementById('manualName').value = "";
        document.getElementById('manualUrl').value = "";
    };
}

function renderFeedCard(data) {
    const list = document.getElementById('tournamentList');
    const newCard = document.createElement('div');
    newCard.className = 't-card';
    newCard.innerHTML = `
        <h4>${data.name}</h4>
        <p>Saved Feed • ID: ${data.id || 'new'}</p>
        <button onclick="deleteFeed(${data.id}, event)" style="background:none; border:none; color:#ff4d4d; font-size:0.7rem; cursor:pointer; padding:0;">[Delete]</button>
    `;
    newCard.onclick = () => loadStream(data.url, data.name, newCard);
    list.prepend(newCard);
}

// 2. Load Data from History
function loadHistory() {
    // Clear the current list UI before re-loading from DB
    const list = document.getElementById('tournamentList');
    // Keep the default hardcoded cloud feed if you want, or clear it
    // list.innerHTML = ''; 

    const transaction = db.transaction([STORE_FEEDS], "readonly");
    const store = transaction.objectStore(STORE_FEEDS);

    store.openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            renderFeedCard(cursor.value);
            cursor.continue();
        }
    };
}

// 3. Delete from History
window.deleteFeed = (id, event) => {
    event.stopPropagation(); // Prevents clicking the card when clicking delete
    if (!confirm("Remove this feed from history?")) return;

    const transaction = db.transaction([STORE_FEEDS], "readwrite");
    transaction.objectStore(STORE_FEEDS).delete(id);
    transaction.oncomplete = () => {
        location.reload(); // Simplest way to refresh the UI
    };
};

// 4. Load Stream into Iframe
window.loadStream = (url, title, element) => {
    document.querySelectorAll('.t-card').forEach(card => card.classList.remove('active'));
    element.classList.add('active');

    document.getElementById('activeTitle').innerText = title;
    document.getElementById('activeStatus').innerText = "LIVE STREAMING";
    document.getElementById('activeStatus').style.color = "#ffe23e";

    const container = document.getElementById('iframeContainer');
    container.innerHTML = `<iframe src="${url}" allowfullscreen></iframe>`;
};
window.loadStream = (url, title, element) => {
    let finalUrl = url;

    // FIX: If the URL is from Lichess, ensure it's in the embeddable format
    if (url.includes("lichess.org") && !url.includes("embed") && !url.includes("frame")) {
        // If it's a game link, convert it to embed
        if (url.includes("/tournament/")) {
             alert("Lichess blocks full tournament pages. Use Lichess TV or a specific Game Link instead.");
             return;
        }
        // Convert standard game link to embed link
        finalUrl = url.replace("lichess.org/", "lichess.org/embed/");
    }

    document.querySelectorAll('.t-card').forEach(card => card.classList.remove('active'));
    element.classList.add('active');

    document.getElementById('activeTitle').innerText = title;
    document.getElementById('activeStatus').innerText = "LIVE STREAMING";
    document.getElementById('activeStatus').style.color = "#ffe23e";

    const container = document.getElementById('iframeContainer');
    // Added 'sandbox' attribute for better security and compatibility
    container.innerHTML = `<iframe 
        src="${finalUrl}" 
        allowfullscreen 
        sandbox="allow-scripts allow-same-origin allow-popups"
        style="width:100%; height:650px; border:none;"></iframe>`;
};