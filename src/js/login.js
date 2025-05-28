import { auth } from './firebase.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById("login-form");

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("login-email").value;
            const password = document.getElementById("login-password").value;

            try {
                await signInWithEmailAndPassword(auth, email, password);
                window.location.href = "index.html";
            } catch (error) {
                alert("Erro: " + error.message);
            }
        });
    }
});
