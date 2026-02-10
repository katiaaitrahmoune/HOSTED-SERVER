require('dotenv').config();
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const app = express(); // ✅ app must be defined
const upload = multer({ dest: "uploads/" }); // make sure uploads/ folder exists

// ------------------ ROUTE ------------------
app.post("/process", upload.fields([{ name: "audio" }, { name: "image" }]), async (req, res) => {
  try {
    const audioFile = req.files["audio"][0].path;
    const imageFile = req.files["image"][0].path;

    const form = new FormData();
    form.append('audio', fs.createReadStream(audioFile));
    form.append('image', fs.createReadStream(imageFile));

    // Send files to your local worker (ngrok URL)
    const workerRes = await axios.post('https://seminationalized-floretty-shirl.ngrok-free.dev/process', form, {
      headers: form.getHeaders(),
      responseType: 'arraybuffer' // to get WAV as buffer
    });

    // Send the WAV back to the device
    res.set('Content-Type', 'audio/wav');
    res.send(Buffer.from(workerRes.data));

    // Cleanup uploaded files
    fs.unlinkSync(audioFile);
    fs.unlinkSync(imageFile);

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
