function extractContacts() {
    return new Promise((resolve, reject) => {
        try {
            // Esperar a que la lista de chats esté disponible
            const contactElements = document.querySelectorAll('[role="row"]');
            const contacts = [];
            
            contactElements.forEach(element => {
                const titleElement = element.querySelector('[title]');
                const phoneElement = element.querySelector('[title*="+"]');
                
                if (titleElement && phoneElement && phoneElement.title.includes('+')) {
                    contacts.push({
                        name: titleElement.title,
                        phone: phoneElement.title
                    });
                }
            });

            // Eliminar duplicados
            const uniqueContacts = Array.from(new Map(
                contacts.map(contact => [contact.phone, contact])
            ).values());

            resolve(uniqueContacts);
        } catch (error) {
            reject(error);
        }
    });
}

// Ejecutar y retornar los resultados
extractContacts().then(contacts => contacts).catch(error => {
    console.error('Error al extraer contactos:', error);
    return [];
});