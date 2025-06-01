document.addEventListener('DOMContentLoaded', () => {
    const accountInfo = document.getElementById('account-info');
    const accountMenu = document.getElementById('account-menu');
    const accountArrow = document.getElementById('account-arrow');

    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('upload-btn');

    // Lógica do menu dropdown da conta (do seu HTML original)
    if (accountInfo && accountMenu && accountArrow) {
        accountInfo.addEventListener('click', () => {
            accountMenu.classList.toggle('open');
            accountArrow.classList.toggle('open');
        });

        // Fechar dropdown clicando fora
        document.addEventListener('click', (e) => {
            if (!accountInfo.contains(e.target) && !accountMenu.contains(e.target)) {
                accountMenu.classList.remove('open');
                accountArrow.classList.remove('open');
            }
        });
    }

    // O botão de logout só existe se o utilizador estiver autenticado (renderizado pelo Jinja2)
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        console.log("Botão de logout encontrado.");
    } else {
        console.log("Botão de logout não encontrado (utilizador provavelmente não está logado).");
    }

    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', async () => {
            const file = fileInput.files[0];

            if (!file) {
                alert('Por favor, escolha um ficheiro primeiro.');
                return;
            }

            const formData = new FormData();
            formData.append('file', file); // 'file' é o nome que o backend Flask esperará

            // Opcional: Mostrar feedback de que o upload começou
            // Por exemplo, desabilitar o botão e mostrar uma mensagem
            uploadBtn.disabled = true;
            uploadBtn.textContent = 'A enviar...';

            try {
                const response = await fetch('/upload', { // A rota de upload que vamos criar no Flask
                    method: 'POST',
                    // Não defina 'Content-Type' manualmente ao usar FormData com ficheiros;
                    // o navegador define-o automaticamente com o boundary correto.
                    body: formData,
                });

                const result = await response.json();

                if (response.ok) {
                    alert(result.message || 'Ficheiro enviado com sucesso!');
                    // TODO: Atualizar a lista de ficheiros na página sem recarregar (mais avançado)
                    // Por agora, pode simplesmente recarregar a página para ver o novo ficheiro
                    window.location.reload();
                } else {
                    alert(result.error || 'Erro ao enviar o ficheiro.');
                }
            } catch (error) {
                console.error('Erro no upload:', error);
                alert('Ocorreu um erro de rede ou servidor durante o upload.');
            } finally {
                // Reabilitar o botão e restaurar o texto
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Upload';
                fileInput.value = ''; // Limpar o input do ficheiro
            }
        });
    }

    // Lógica para exibir o nome do ficheiro escolhido no label (opcional, mas melhora a UX)
    if (fileInput) {
        const customFileLabel = document.querySelector('.custom-file-label[for="fileInput"]');
        if (customFileLabel) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    customFileLabel.textContent = e.target.files[0].name;
                } else {
                    customFileLabel.textContent = 'Escolher ficheiro';
                }
            });
        }
    }
});
