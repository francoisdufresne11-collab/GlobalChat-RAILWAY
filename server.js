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

// Sert tous les fichiers du dossier racine (pour trouver index.html)
app.use(express.static(__dirname));

const upload = multer({ dest: 'uploads/' });
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// ROUTE PRINCIPALE : Envoie le fichier HTML au navigateur
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route pour l'envoi d'images/vidéos vers Catbox
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

// Port dynamique obligatoire pour Render
const port = process.env.PORT || 3000;
const server = app.listen(port, '0.0.0.0', () => {
    console.log("🚀 Serveur prêt sur le port " + port);
});

// Gestion du Chat en temps réel (WebSockets)
const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
    ws.on('message', (data) => {
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data.toString());
            }
        });
    });
});
