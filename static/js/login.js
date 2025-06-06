document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const spinnerOverlay = document.getElementById('loading-spinner-overlay');
    
    // Adicionado para obter o botão de submit especificamente
    const submitButton = loginForm ? loginForm.querySelector('button[type="submit"]') : null;

    if (loginForm && spinnerOverlay && submitButton) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); 

            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const formData = new URLSearchParams();
            formData.append('login-email', email);
            formData.append('login-password', password);

            // Mostrar spinner e desabilitar botão
            spinnerOverlay.style.display = 'flex'; // Mostra o overlay do spinner
            submitButton.disabled = true;
            submitButton.textContent = 'Aguarde...'; // Muda o texto do botão

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData
                });

                const result = await response.json();
                console.log('Resposta do servidor:', result);

                if (response.ok && result.redirect) {
                    // Não precisamos esconder o spinner manualmente aqui se estamos a redirecionar,
                    // pois a navegação da página irá remover tudo.
                    // Apenas alteramos o texto para dar feedback antes do redirecionamento.
                    spinnerOverlay.querySelector('p').textContent = result.message || 'Sucesso! A redirecionar...';
                    window.location.href = result.redirect;
                    // Para evitar que o código abaixo (esconder spinner, reabilitar botão) execute se o redirecionamento for muito rápido
                    // ou se houver algum problema com o redirecionamento não imediato,
                    // podemos sair da função aqui se o redirecionamento for a última ação.
                    // No entanto, se o redirecionamento falhar por algum motivo, o spinner ficaria preso.
                    // É mais seguro ter um finally ou tratar o estado do botão/spinner explicitamente.
                    // Por agora, o redirecionamento deve tratar de "limpar" o spinner.
                } else {
                    // Erro no login, esconder o spinner e reabilitar o botão
                    spinnerOverlay.style.display = 'none';
                    submitButton.disabled = false;
                    submitButton.textContent = 'Login';
                    // alert(result.error || 'Falha no login. Verifique suas credenciais.');
                }
            } catch (error) {
                console.error('Erro ao tentar fazer login:', error);
                // Erro de rede/servidor, esconder o spinner e reabilitar o botão
                spinnerOverlay.style.display = 'none';
                submitButton.disabled = false;
                submitButton.textContent = 'Login';
                // alert('Ocorreu um erro de rede ou servidor ao tentar fazer login.');
            }
            // Não é necessário um bloco finally se tratamos o estado do spinner/botão em cada branch (sucesso com redirect vs erro)
            // Se o redirecionamento for a única ação no sucesso, o estado do botão/spinner não importa após ele.
        });
    }
});