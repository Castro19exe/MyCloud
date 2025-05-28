import { storage, auth } from './firebase.js';
import { ref, uploadBytesResumable, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

document.addEventListener('DOMContentLoaded', () => {
    const uploadBtn = document.getElementById("upload-btn");
    uploadBtn?.addEventListener("click", handleUpload);
});

const handleUpload = async () => {
    const fileInput = document.getElementById("fileInput");
    const file = fileInput?.files[0];
    if (!file) return alert("Escolhe um ficheiro.");

    const user = auth.currentUser;
    if (!user) return alert("Tens de estar autenticado.");

    const filePath = `users/${user.uid}/${file.name}`;
    const fileRef = ref(storage, filePath);

    const uploadTask = uploadBytesResumable(fileRef, file);

    const progressBar = document.getElementById("upload-progress");
    progressBar.style.display = "block";

    uploadTask.on("state_changed",
        (snapshot) => {
            const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            progressBar.value = percent;
        },
        (error) => {
            console.error("Erro ao fazer upload:", error);
            alert("Erro ao fazer upload.");
            progressBar.style.display = "none";
        },
        async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            alert("Upload feito com sucesso!");

            // Atualizar lista de ficheiros
            addFileToTable(file, downloadURL);
            progressBar.style.display = "none";
        }
    );
};

function addFileToTable(file, url) {
    const tbody = document.getElementById("file-list");
    const tr = document.createElement("tr");

    const icon = getFileIcon(file.type);

    tr.innerHTML = `
        <td><a href="${url}" target="_blank">${icon} ${file.name}</a></td>
        <td>${file.type || "Desconhecido"}</td>
        <td>${(file.size / 1024).toFixed(1)} KB</td>
        <td>${new Date().toLocaleDateString()}</td>
    `;
    tbody.appendChild(tr);
}

function getFileIcon(type) {
    if (type.includes("image")) return "🖼️";
    if (type.includes("pdf")) return "📄";
    if (type.includes("zip") || type.includes("rar")) return "🗜️";
    if (type.includes("audio")) return "🎵";
    if (type.includes("video")) return "🎥";
    if (type.includes("text")) return "📄";
    return "📁";
}
