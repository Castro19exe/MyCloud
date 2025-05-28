import { auth } from './firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

export async function register(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
}

export async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}