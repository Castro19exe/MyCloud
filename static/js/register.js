// static/js/register.js
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const messageContainer = document.getElementById('message-container'); // Pega o container de mensagens

    if (registerForm && messageContainer) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Impedir submissão tradicional

            // Limpar mensagens anteriores
            messageContainer.textContent = '';
            messageContainer.className = ''; // Remove classes 'success' ou 'error'

            const emailInput = document.getElementById('register-email');
            const passwordInput = document.getElementById('register-password');
            const email = emailInput.value;
            const password = passwordInput.value;

            const formData = new URLSearchParams();
            formData.append('register-email', email);
            formData.append('register-password', password);

            try {
                const response = await fetch('/register', { // A rota de registo no Flask
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData
                });

                const result = await response.json();
                console.log('Resposta do servidor (registo):', result);

                if (response.ok) { // Código HTTP 2xx (ex: 201 Created)
                    messageContainer.textContent = result.message || 'Registo bem-sucedido!';
                    messageContainer.classList.add('success');
                    emailInput.value = ''; // Limpa os campos
                    passwordInput.value = '';

                    // Redireciona para a página de login após um pequeno atraso
                    if (result.redirect) {
                        setTimeout(() => {
                            window.location.href = result.redirect;
                        }, 2500); // Atraso de 2.5 segundos (2500 milissegundos)
                    }
                } else { // Código HTTP 4xx ou 5xx
                    messageContainer.textContent = result.error || `Erro ${response.status}: Falha no registo.`;
                    messageContainer.classList.add('error');
                }
            } catch (error) {
                console.error('Erro na função fetch do registo:', error);
                messageContainer.textContent = 'Ocorreu um erro de rede ou servidor. Tente novamente.';
                messageContainer.classList.add('error');
            }
        });
    }
});