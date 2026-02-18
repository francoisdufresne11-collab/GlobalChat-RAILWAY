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

// Pour que le serveur puisse servir ton fichier HTML
app.use(express.static(__dirname));

const upload = multer({ dest: 'uploads/' });
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// Route pour afficher la page principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'GlobalChat-RAILWAY.html'));
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
        let url = response.data.trim();
        if (!url.startsWith('http')) url = 'https://' + url;
        res.json({ url: url });
    } catch (error) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Port dynamique pour Railway/Render
const port = process.env.PORT || 3000;
const server = app.listen(port, '0.0.0.0', () => {
    console.log("🚀 Serveur en ligne sur le port " + port);
});

const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
    ws.on('message', (data) => {
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) client.send(data.toString());
        });
    });
});