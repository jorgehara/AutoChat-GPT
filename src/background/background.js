// filepath: c:\Users\JorgeHaraDevs\Desktop\AutoChat-DB\src\background\background.js
chrome.runtime.onInstalled.addListener(() => {
    console.log("Extensión instalada correctamente");
});

// Manejar eventos de descarga
chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
    suggest();
});

// Escuchar mensajes del popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'downloadCSV') {
        chrome.downloads.download({
            url: request.url,
            filename: request.filename,
            saveAs: true
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                sendResponse({ success: false, error: chrome.runtime.lastError });
            } else {
                sendResponse({ success: true, downloadId });
            }
        });
        return true; // Mantener el canal de comunicación abierto
    }
});