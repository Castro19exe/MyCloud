import { storage, auth } from './firebase.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { ref, listAll, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

document.addEventListener('DOMContentLoaded', () => {
    const usernameDiv = document.querySelector(".username");
    const logoutBtn = document.getElementById("logout-btn");
    const loginBtn = document.getElementById("login-btn");
    const registerBtn = document.getElementById("register-btn");

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            usernameDiv.textContent = user.email;
            logoutBtn.style.display = "block";
            if (loginBtn) loginBtn.style.display = "none";
            if (registerBtn) registerBtn.style.display = "none";

            // 🔽 Listar ficheiros do utilizador autenticado
            const folderRef = ref(storage, `users/${user.uid}/`);
            const tbody = document.getElementById("file-list");
            tbody.innerHTML = "";

            try {
                const res = await listAll(folderRef);
                for (const itemRef of res.items) {
                    const url = await getDownloadURL(itemRef);

                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td><a href="${url}" target="_blank">${itemRef.name}</a></td>
                        <td>-</td>
                        <td>-</td>
                        <td>${new Date().toLocaleDateString()}</td>
                    `;
                    tbody.appendChild(tr);
                }
            } catch (error) {
                console.error("Erro ao listar ficheiros:", error);
                alert("Erro ao carregar os ficheiros.");
            }

        } else {
            usernameDiv.textContent = "Conta";
            logoutBtn.style.display = "none";
            if (loginBtn) loginBtn.style.display = "block";
            if (registerBtn) registerBtn.style.display = "block";
        }
    });

    logoutBtn?.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
            await signOut(auth);
            window.location.href = "index.html";
        } catch (error) {
            alert("Erro ao fazer logout: " + error.message);
        }
    });
});
