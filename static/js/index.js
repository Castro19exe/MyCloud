document.addEventListener('DOMContentLoaded', () => {
    const accountInfo = document.getElementById('account-info');
    const accountMenu = document.getElementById('account-menu');
    const accountArrow = document.getElementById('account-arrow');

    if (accountInfo && accountMenu && accountArrow) {
        accountInfo.addEventListener('click', (event) => {
            event.stopPropagation();
            accountMenu.classList.toggle('open');
            accountArrow.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (accountMenu && accountInfo && !accountInfo.contains(e.target) && !accountMenu.contains(e.target)) {
                accountMenu.classList.remove('open');
                accountArrow.classList.remove('open');
            }
        });
    }

    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('upload-btn');
    const customFileLabel = document.querySelector('.custom-file-label[for="fileInput"]');

    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', async () => {
            const file = fileInput.files[0];
            if (!file) {
                // alert('Por favor, escolha um ficheiro primeiro.');
                return;
            }
            const formData = new FormData();
            formData.append('file', file);
            uploadBtn.disabled = true;
            uploadBtn.textContent = 'A enviar...';
            try {
                const response = await fetch('/upload', { method: 'POST', body: formData });
                const result = await response.json();
                if (response.ok) {
                    if(typeof createPopupMessage === 'function'){
                        createPopupMessage(result.message || 'Ficheiro enviado com sucesso!', 'success');
                    } else {
                        // alert(result.message || 'Ficheiro enviado com sucesso!');
                    }
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    if(typeof createPopupMessage === 'function'){
                        createPopupMessage(result.error || 'Erro ao enviar o ficheiro.', 'error');
                    } else {
                        // alert(result.error || 'Erro ao enviar o ficheiro.');
                    }
                }
            } catch (error) {
                console.error('Erro no upload:', error);
                if(typeof createPopupMessage === 'function'){
                    createPopupMessage('Ocorreu um erro de rede ou servidor durante o upload.', 'error');
                } else {
                    // alert('Ocorreu um erro de rede ou servidor durante o upload.');
                }
            } finally {
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Upload';
                if (customFileLabel) customFileLabel.textContent = 'Escolher ficheiro';
                fileInput.value = '';
            }
        });
    }
    if (fileInput && customFileLabel) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                let filename = e.target.files[0].name;
                const maxLength = 40;
                if (filename.length > maxLength) {
                    customFileLabel.textContent = filename.substring(0, maxLength - 3) + "...";
                    customFileLabel.setAttribute('title', filename);
                } else {
                    customFileLabel.textContent = filename;
                    customFileLabel.removeAttribute('title');
                }
            } else {
                customFileLabel.textContent = 'Escolher ficheiro';
                customFileLabel.removeAttribute('title');
            }
        });
    }

    const selectAllCheckbox = document.getElementById('select-all-files-checkbox');
    const fileCheckboxes = document.querySelectorAll('.file-checkbox');
    const bulkActionsToolbar = document.getElementById('bulk-actions-toolbar');
    const deleteSelectedBtn = document.getElementById('delete-selected-btn');

    function updateBulkActionsToolbar() {
        if (!bulkActionsToolbar) return;
        const selectedCheckboxes = document.querySelectorAll('.file-checkbox:checked');
        if (selectedCheckboxes.length > 0) {
            bulkActionsToolbar.style.display = 'block'; // Ou 'flex', dependendo do seu CSS
        } else {
            bulkActionsToolbar.style.display = 'none';
        }
    }

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (event) => {
            fileCheckboxes.forEach(checkbox => {
                checkbox.checked = event.target.checked;
            });
            updateBulkActionsToolbar();
        });
    }

    fileCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            if (!checkbox.checked && selectAllCheckbox) {
                selectAllCheckbox.checked = false;
            }
            // Verifica se todas estão marcadas para marcar o "select all"
            let allChecked = true;
            fileCheckboxes.forEach(cb => {
                if (!cb.checked) {
                    allChecked = false;
                }
            });
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = allChecked;
            }
            updateBulkActionsToolbar();
        });
    });

    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', async () => {
            const selectedFiles = [];
            document.querySelectorAll('.file-checkbox:checked').forEach(checkbox => {
                selectedFiles.push(checkbox.value); // 'value' contém o filename
            });

            if (selectedFiles.length === 0) {
                // alert('Nenhum ficheiro selecionado para mover para a lixeira.');
                return;
            }

            if (confirm(`Tem a certeza que quer mover ${selectedFiles.length} ficheiro(s) para a lixeira?`)) {
                try {
                    const response = await fetch('/bulk_move_to_trash', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            // Se estiver a usar CSRF com Flask-WTF, adicione o header X-CSRFToken
                            // 'X-CSRFToken': '{{ csrf_token() }}' // Isto não funciona em JS estático, precisa obter o token de outra forma
                        },
                        body: JSON.stringify({ filenames: selectedFiles })
                    });

                    const result = await response.json();

                    if (response.ok) {
                        if(typeof createPopupMessage === 'function'){
                            createPopupMessage(result.message || `${selectedFiles.length} ficheiro(s) movido(s) para a lixeira.`, 'success');
                        } else {
                            // alert(result.message || `${selectedFiles.length} ficheiro(s) movido(s) para a lixeira.`);
                        }
                        setTimeout(() => window.location.reload(), 1500);
                    } else {
                        if(typeof createPopupMessage === 'function'){
                           createPopupMessage(result.error || 'Erro ao mover ficheiros para a lixeira.', 'error');
                        } else {
                            // alert(result.error || 'Erro ao mover ficheiros para a lixeira.');
                        }
                    }
                } catch (error) {
                    console.error('Erro ao mover ficheiros selecionados para lixeira:', error);
                    if(typeof createPopupMessage === 'function'){
                        createPopupMessage('Ocorreu um erro de rede ou servidor.', 'error');
                    } else {
                        // alert('Ocorreu um erro de rede ou servidor.');
                    }
                }
            }
        });
    }
    
    updateBulkActionsToolbar(); 
});
