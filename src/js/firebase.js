import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyDftwtd6PQrB52fjtKxtkuHZh2s9Aq4qGg",
    authDomain: "projetocn-bd229.firebaseapp.com",
    projectId: "projetocn-bd229",
    storageBucket: "projetocn-bd229.firebasestorage.app",
    messagingSenderId: "79254815097",
    appId: "1:79254815097:web:c3689c5889e513dfdeefa8",
    measurementId: "G-BJ4DB1WP83"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);

export { auth, storage };
