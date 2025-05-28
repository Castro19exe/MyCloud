import { register } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById("register-form");
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = document.getElementById("register-email").value;
            const password = document.getElementById("register-password").value;

            try {
                await register(email, password);
                
                window.location.href = "index.html";
            } catch (error) {
                alert(error.message);
            }
        });
    }
});
