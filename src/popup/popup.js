document.addEventListener('DOMContentLoaded', async () => {
    const exportBtn = document.getElementById('exportBtn');
    const status = document.getElementById('status');
    const progress = document.getElementById('progress');

    // Verificar si estamos en WhatsApp Web
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    const tab = tabs[0];
    
    if (!tab?.url?.includes('web.whatsapp.com')) {
        status.textContent = 'Por favor, abre WhatsApp Web primero';
        exportBtn.disabled = true;
        return;
    }

    // Recargar la página si el content script no está activo
    try {
        await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
    } catch (error) {
        console.log('Content script no detectado, recargando página...');
        await chrome.tabs.reload(tab.id);
        // Esperar a que la página se recargue
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Ahora que sabemos que estamos en WhatsApp Web, habilitar el botón
    exportBtn.disabled = false;
    status.textContent = 'Listo para exportar contactos';

    exportBtn.addEventListener('click', async () => {
        try {
            exportBtn.disabled = true;
            progress.classList.remove('hidden');
            status.textContent = 'Extrayendo contactos...';

            // Intentar extraer contactos con reintentos
            let attempts = 0;
            const maxAttempts = 3;
            let response;

            while (attempts < maxAttempts) {
                try {
                    response = await new Promise((resolve, reject) => {
                        chrome.tabs.sendMessage(tab.id, { action: 'extractContacts' }, (result) => {
                            if (chrome.runtime.lastError) {
                                reject(chrome.runtime.lastError);
                            } else {
                                resolve(result);
                            }
                        });
                    });
                    break; // Si no hay error, salir del bucle
                } catch (error) {
                    attempts++;
                    if (attempts === maxAttempts) {
                        throw error;
                    }
                    // Esperar antes de reintentar
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            if (response?.success && response?.contacts?.length > 0) {
                status.textContent = 'Preparando archivo para descarga...';
                const contacts = response.contacts;
                
                // Convertir a CSV con BOM para mejor compatibilidad
                const csvContent = '\ufeff' + convertToCSV(contacts);
                
                // Crear el blob y descargar
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
                const blobUrl = URL.createObjectURL(blob);
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

                try {
                    await chrome.downloads.download({
                        url: blobUrl,
                        filename: `whatsapp-contacts-${timestamp}.csv`,
                        saveAs: true
                    });
                    status.textContent = `¡Éxito! Se exportaron ${contacts.length} contactos`;
                } catch (downloadError) {
                    console.error('Error en la descarga:', downloadError);
                    status.textContent = 'Error al guardar el archivo. Intenta de nuevo.';
                } finally {
                    URL.revokeObjectURL(blobUrl);
                }
            } else {
                status.textContent = 'No se encontraron contactos para exportar';
            }
        } catch (error) {
            console.error('Error:', error);
            status.textContent = 'Error al procesar contactos: ' + (error.message || 'Error desconocido');
        } finally {
            progress.classList.add('hidden');
            exportBtn.disabled = false;
        }
    });
});

function convertToCSV(contacts) {
    const header = ['Nombre', 'Teléfono'];
    const rows = contacts.map(contact => [
        contact.name?.replace(/"/g, '""') || 'Sin nombre',
        contact.phone?.replace(/"/g, '""') || ''
    ].map(field => `"${field}"`));
    
    return [header, ...rows].map(row => row.join(',')).join('\n');
}