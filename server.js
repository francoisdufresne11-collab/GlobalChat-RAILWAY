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

// --- STOCKAGE DE L'HISTORIQUE ---
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
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
        });

        fs.unlinkSync(req.file.path);

        // ✅ On renvoie aussi le mimetype pour que le frontend sache quoi afficher
        res.json({
            url: response.data.trim(),
            name: req.file.originalname,
            mimetype: req.file.mimetype
        });

    } catch (error) {
        console.error("Erreur upload:", error.message);
        res.status(500).json({ error: "Erreur serveur lors de l'upload" });
    }
});

const port = process.env.PORT || 3000;
const server = app.listen(port, '0.0.0.0', () => {
    console.log("🚀 Serveur prêt sur le port " + port);
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    // Envoi de l'historique dès la connexion
    ws.send(JSON.stringify({ type: 'history', data: history }));

    ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        history.push(message);
        if (history.length > 100) history.shift();

        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    });

    ws.on('error', (err) => {
        console.error("WebSocket error:", err.message);
    });
});
