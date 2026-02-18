const WebSocket = require('ws');
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Sert les fichiers statiques (index.html) depuis le dossier racine
app.use(express.static(__dirname));

// Configuration de Multer pour les images/vidéos
const upload = multer({ dest: 'uploads/' });
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// Route principale pour charger le chat
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route d'upload vers Catbox.moe
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Pas de fichier" });
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', fs.createReadStream(req.file.path));

        const response = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: form.getHeaders()
        });
        
        fs.unlinkSync(req.file.path);
        let url = response.data.trim();
        if (!url.startsWith('http')) url = 'https://' + url;
        res.json({ url: url });
    } catch (error) {
        console.error("Erreur Upload:", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Utilise le port 10000 fourni par Render
const port = process.env.PORT || 3000;
const server = app.listen(port, '0.0.0.0', () => {
    console.log("🚀 Serveur prêt sur le port " + port);
});

// Gestion des WebSockets pour le temps réel
const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
    console.log("Nouveau client connecté");
    ws.on('message', (data) => {
        // Renvoie le message à TOUS les utilisateurs connectés
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data.toString());
            }
        });
    });
});
