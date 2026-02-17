require('dotenv').config();
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip'); // ✅ added

const app = express();
const upload = multer({ dest: "uploads/" });

// ------------------ ROUTE ------------------
app.post("/process", upload.fields([{ name: "audio" }, { name: "image" }]), async (req, res) => {
  try {
    const zipPath = req.files["audio"][0].path; // ZIP file
    const imageFile = req.files["image"][0].path;

    // ---------- UNZIP ----------
    const zip = new AdmZip(zipPath);
    const extractPath = path.join(__dirname, "uploads", "extracted");

    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true });
    }

    zip.extractAllTo(extractPath, true);

    // Since ZIP always contains ONE wav file
    const extractedFiles = fs.readdirSync(extractPath);
    const wavPath = path.join(extractPath, extractedFiles[0]);

    // ---------- SEND TO WORKER ----------
    const form = new FormData();
    form.append('audio', fs.createReadStream(wavPath));
    form.append('image', fs.createReadStream(imageFile));

    const workerRes = await axios.post(
      'https://seminationalized-floretty-shirl.ngrok-free.dev/process',
      form,
      {
        headers: form.getHeaders(),
        responseType: 'arraybuffer'
      }
    );

    res.set('Content-Type', 'audio/wav');
    res.send(Buffer.from(workerRes.data));

    // ---------- CLEANUP ----------
    fs.unlinkSync(zipPath);
    fs.unlinkSync(imageFile);
    fs.rmSync(extractPath, { recursive: true, force: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", error: err.toString() });
  }
});

// ------------------ HEALTHCHECK ------------------
app.get("/", (req, res) => res.send("BlindEye API Running"));

// ------------------ START SERVER ------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
