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

// Sécurité : On définit le chemin absolu vers ton dossier
const publicPath = path.resolve(__dirname);
app.use(express.static(publicPath));

const upload = multer({ dest: 'uploads/' });
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// ROUTE PRINCIPALE : C'est ici qu'on règle le "Not Found"
app.get('/', (req, res) => {
    // On force le nom EXACT que l'on voit sur ton GitHub
    const htmlFile = path.join(publicPath, 'GlobalChat-RAILWAY.html');
    
    if (fs.existsSync(htmlFile)) {
        res.sendFile(htmlFile);
    } else {
        // Ce message s'affichera si le fichier est mal nommé sur GitHub
        res.status(404).send("Erreur : Le fichier GlobalChat-RAILWAY.html est introuvable sur le serveur.");
    }
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
        console.error("Erreur Upload:", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Port dynamique pour Render (obligatoire)
const port = process.env.PORT || 3000;
const server = app.listen(port, '0.0.0.0', () => {
    console.log("🚀 Serveur en ligne sur le port " + port);
});

// WebSocket pour le chat en temps réel
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
