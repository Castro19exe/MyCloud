document.addEventListener('DOMContentLoaded', () => {
    function createPopupMessage(message, category = 'info', duration = 5000) {
        const container = document.getElementById('popup-messages-container');
        if (!container) return;

        const popup = document.createElement('div');
        popup.className = `popup-message ${category}`;

        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        popup.appendChild(messageSpan);

        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'close-popup';
        closeButton.innerHTML = '&times;';
        closeButton.onclick = () => {
            popup.style.animation = 'none';
            popup.remove();
        };
        popup.appendChild(closeButton);

        container.appendChild(popup);

        // Forçar reflow para reiniciar a animação se um popup idêntico for adicionado rapidamente
        popup.offsetHeight; 

        // Aplicar animação (o CSS já tem `forwards` para manter o estado final)
        popup.style.animation = `slideInAndFadeOut ${duration / 1000}s forwards`;

        setTimeout(() => {
            if (popup.parentNode) {
                popup.remove();
            }
        }, duration);
    }

    document.addEventListener('DOMContentLoaded', () => {
        const existingPopups = document.querySelectorAll('.popup-messages-container .popup-message .close-popup');
        existingPopups.forEach(button => {
            button.onclick = () => {
                const popup = button.closest('.popup-message');
                if (popup) {
                    popup.style.animation = 'none';
                    popup.remove();
                }
            };
        });
    });
});