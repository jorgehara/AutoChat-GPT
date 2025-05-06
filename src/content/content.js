// Variable para controlar el estado de inicialización
let isInitialized = false;

// Función para extraer contactos
async function extractContactsFromPage() {
    try {
        const contacts = new Map(); // Usar Map para evitar duplicados

        // Primero buscar contactos en la lista de chats actual (contactos agregados)
        const addedContacts = document.querySelectorAll('span.x1lkfr7t.xdbd6k5.x1fcty0u.xw2npq5');
        addedContacts.forEach(phoneSpan => {
            const phone = phoneSpan.textContent.trim();
            if (phone.includes('+')) {
                // Buscar el nombre del contacto en elementos cercanos
                const chatRow = phoneSpan.closest('[role="row"]');
                const nameElement = chatRow?.querySelector('span[title]');
                const name = nameElement?.title || 'Sin nombre';
                contacts.set(phone, { name, phone });
            }
        });

        // Luego abrir el panel de nueva conversación para buscar más contactos
        const newChatButton = document.querySelector('[aria-label="Nuevo chat"]');
        if (newChatButton) {
            newChatButton.click();
            // Esperar a que se cargue el panel
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Buscar contactos no agregados
            const nonAddedContacts = document.querySelectorAll('span.x1jchvi3.x1fcty0u.x40yjcy');
            nonAddedContacts.forEach(phoneSpan => {
                const phone = phoneSpan.textContent.trim();
                if (phone.includes('+')) {
                    // Para contactos no agregados, usar el número como nombre
                    contacts.set(phone, { name: phone, phone });
                }
            });

            // Cerrar el panel
            const closeButton = document.querySelector('[aria-label="Cerrar"]');
            if (closeButton) {
                closeButton.click();
            }
        }

        // Convertir el Map a Array y retornar
        return Array.from(contacts.values());
    } catch (error) {
        console.error('Error al extraer contactos:', error);
        return [];
    }
}

// Función de inicialización
function initialize() {
    if (isInitialized) return;
    
    // Escuchar mensajes del popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('Mensaje recibido en content script:', request);
        
        if (request.action === 'extractContacts') {
            console.log('Iniciando extracción de contactos...');
            extractContactsFromPage()
                .then(contacts => {
                    console.log('Contactos extraídos:', contacts.length);
                    sendResponse({ success: true, contacts });
                })
                .catch(error => {
                    console.error('Error en extracción:', error);
                    sendResponse({ success: false, error: error.message });
                });
            return true; // Mantener el canal de comunicación abierto
        }
    });

    isInitialized = true;
    console.log('Content script inicializado');
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

// También inicializar cuando la página esté completamente cargada
window.addEventListener('load', initialize);

// Notificar que el content script está cargado
chrome.runtime.sendMessage({ action: 'contentScriptReady' });