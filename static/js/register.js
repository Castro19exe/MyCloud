// static/js/register.js
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const spinnerOverlay = document.getElementById('loading-spinner-overlay-register'); // ID específico do spinner de registo
    const submitButton = registerForm ? registerForm.querySelector('button[type="submit"]') : null;

    if (registerForm && spinnerOverlay && submitButton) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const emailInput = document.getElementById('register-email');
            const passwordInput = document.getElementById('register-password');
            const email = emailInput.value;
            const password = passwordInput.value;

            const formData = new URLSearchParams();
            formData.append('register-email', email);
            formData.append('register-password', password);

            // Mostrar spinner e desabilitar botão
            spinnerOverlay.style.display = 'flex';
            submitButton.disabled = true;
            submitButton.textContent = 'Aguarde...';

            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData
                });

                if (!response.ok) {
                    // Erro do servidor (ex: email já existe, erro 500)
                    const result = await response.json();
                    console.log('Erro do servidor (registo):', result);
                    if (typeof createPopupMessage === 'function') {
                        createPopupMessage(result.error || `Erro ${response.status}: Falha no registo.`, 'error');
                    } else {
                        alert(result.error || `Erro ${response.status}: Falha no registo.`);
                    }
                    // Esconder spinner e reabilitar botão em caso de erro
                    spinnerOverlay.style.display = 'none';
                    submitButton.disabled = false;
                    submitButton.textContent = 'Criar Conta';
                } else {
                    // Sucesso - O backend Flask faz o redirect para a página de login.
                    // O spinner e a página de registo desaparecerão com a navegação.
                    // A flash message aparecerá na página de login.
                    console.log('Registo submetido, servidor respondeu OK. Redirecionamento do servidor deve ocorrer.');
                    spinnerOverlay.querySelector('p').textContent = 'Sucesso! A redirecionar...'; // Mensagem opcional no spinner
                    // Garantir que a navegação acontece se o fetch já resolveu o redirect
                    if (response.redirected) {
                        window.location.href = response.url;
                    } else {
                        console.warn("Resposta OK mas não houve redirecionamento detetado pelo 'fetch'. O browser deve tratar o redirect do servidor.")
                    }
                }
            } catch (error) {
                console.error('Erro na função fetch do registo (bloco catch):', error);
                
                if (typeof createPopupMessage === 'function') {
                    createPopupMessage('Ocorreu um erro de rede ou servidor. Tente novamente.', 'error');
                } else {
                    alert('Ocorreu um erro de rede ou servidor. Tente novamente.');
                }
                
                spinnerOverlay.style.display = 'none';
                submitButton.disabled = false;
                submitButton.textContent = 'Criar Conta';
            }
        });
    }
});