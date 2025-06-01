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
        closeButton.innerHTML = '&times;'; // Botão de fechar '×'
        closeButton.onclick = () => {
            popup.style.animation = 'none'; // Para parar a animação de fadeOut se fechado manualmente
            popup.remove();
        };
        popup.appendChild(closeButton);

        container.appendChild(popup);

        // Forçar reflow para reiniciar a animação se um popup idêntico for adicionado rapidamente
        popup.offsetHeight; 

        // Aplicar animação (o CSS já tem `forwards` para manter o estado final)
        popup.style.animation = `slideInAndFadeOut ${duration / 1000}s forwards`;

        // Remover o popup após a duração da animação, se não for fechado manualmente
        // O CSS já faz isso com `forwards` e o `opacity: 0` no final da animação,
        // mas podemos remover o elemento do DOM para limpeza.
        setTimeout(() => {
            if (popup.parentNode) { // Verifica se ainda existe (pode ter sido fechado manualmente)
                popup.remove();
            }
        }, duration);
    }

    // Adicionar event listener para botões de fechar em flash messages já existentes (renderizados pelo servidor)
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

        // Se você tiver flash messages renderizadas pelo servidor que não devem desaparecer sozinhas
        // e quer que a animação CSS as remova, pode precisar de um pequeno ajuste.
        // O CSS atual com `animation: slideInAndFadeOut 5s forwards;` deve funcionar para elas.
    });
});