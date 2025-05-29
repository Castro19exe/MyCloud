// static/js/login.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Impedir submissão tradicional do formulário

            const emailInput = document.getElementById('login-email');
            const passwordInput = document.getElementById('login-password');
            const email = emailInput.value;
            const password = passwordInput.value;

            const formData = new URLSearchParams();
            formData.append('login-email', email);
            formData.append('login-password', password);

            try {
                const response = await fetch('/login', { // Usar url_for aqui também é uma boa prática se este JS for embutido num template
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData
                });

                const result = await response.json(); // Tenta converter a resposta para JSON

                console.log('Resposta do Servidor:', result); // Para depuração
                console.log('Status da Resposta:', response.status, 'OK?', response.ok); // Para depuração

                if (response.ok && result.redirect) {
                    // Login bem-sucedido E o servidor enviou um URL para redirecionar
                    alert(result.message || 'Login bem-sucedido! Redirecionando...'); // Opcional: feedback visual
                    window.location.href = result.redirect; // FAZ O REDIRECIONAMENTO
                } else {
                    // Erro no login (ex: credenciais erradas) ou resposta inesperada
                    alert(result.error || 'Falha no login. Verifique suas credenciais ou a resposta do servidor.');
                }
            } catch (error) {
                console.error('Erro na função fetch do login:', error);
                alert('Ocorreu um erro de rede ou ao processar a resposta do servidor.');
            }
        });
    }
});