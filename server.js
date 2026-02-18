const WebSocket = require('ws');
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static(__dirname));

const upload = multer({ dest: 'uploads/' });
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// --- SYSTÈME D'HISTORIQUE ---
let history = []; 

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

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
        res.json({ url: response.data.trim() });
    } catch (error) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

const port = process.env.PORT || 3000;
const server = app.listen(port, '0.0.0.0', () => {
    console.log("🚀 Serveur prêt sur le port " + port);
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    // ENVOI DE L'HISTORIQUE au nouveau connecté
    ws.send(JSON.stringify({ type: 'history', data: history }));

    ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        // Ajouter au début de l'historique et limiter à 50 messages
        history.push(message);
        if (history.length > 50) history.shift();

        // Diffuser à tout le monde
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    });
});
