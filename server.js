require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const express = require('express');
const multer = require('multer');
const https = require('https');
const ffmpeg = require('fluent-ffmpeg');
const googleTTS = require('google-tts-api');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({ dest: "uploads/" });

const api_key = process.env.API_GEMINI;
const genai = new GoogleGenerativeAI(api_key);

const modelai = genai.getGenerativeModel({
  model: "gemini-2.5-flash-lite",
  systemInstruction: ` Your name is BlindEye. You help visually impaired users by describing images clearly and concisely. Always start with "Hi I'm BlindEye".**Keep your response under 200 characters**, short and polite,using simple language, only describing visible objects in the image. `,
});


// ----- Run Whisper Python -----
function runWhisper(audioPath) {
  return new Promise((resolve, reject) => {
    exec(`python3 tran.py "${audioPath}"`,
      { maxBuffer: 1024 * 1024 * 10 },
      (error, stdout) => {
        if (error) return reject(error);

        const match = stdout.match(/Transcription:\s*([\s\S]*)/);
        resolve(match ? match[1].trim() : stdout.trim());
      });
  });
}

// ----- Send Image + Text to Gemini -----
async function processImageWithGemini(text, imagePath) {
  const buffer = fs.readFileSync(imagePath);
  const base64 = buffer.toString("base64");

  const result = await modelai.generateContent([
    { text: text },
    { inlineData: { mimeType: "image/jpeg", data: base64 } },
  ]);

  return result.response.text();
}

// ----- Convert Text → REAL WAV -----
function textToRealWav(text) {
  return new Promise((resolve, reject) => {
    const mp3File = "temp.mp3";
    const wavFile = "response.wav";

    const url = googleTTS.getAudioUrl(text, {
      lang: "en",
      slow: false,
      host: "https://translate.google.com",
    });

    const file = fs.createWriteStream(mp3File);

    https.get(url, (res) => {
      res.pipe(file);

      file.on("finish", () => {
        file.close();

        ffmpeg(mp3File)
          .toFormat("wav")
          .audioChannels(1)
          .audioFrequency(16000)
          .audioBitrate(128)
          .on("end", () => {
            fs.unlinkSync(mp3File);
            resolve(wavFile);
          })
          .on("error", reject)
          .save(wavFile);
      });
    });
  });
}

// ===== MAIN ROUTE ESP32 WILL CALL =====

app.post("/process", upload.fields([
  { name: "audio" },
  { name: "image" },
]), async (req, res) => {
  try {
    const audioFile = req.files["audio"][0].path;
    const imageFile = req.files["image"][0].path;

    console.log("Files received from ESP32");

    const transcription = await runWhisper(audioFile);
    console.log("Transcription:", transcription);

    const geminiText = await processImageWithGemini(transcription, imageFile);
    console.log("Gemini reply:", geminiText);

    let safeText = geminiText;

// Force limit to 200 characters max for Google TTS
if (safeText.length > 200) {
  safeText = safeText.substring(0, 197) + "...";
}

const wavPath = await textToRealWav(safeText);

    res.sendFile(path.join(__dirname, wavPath));

  } catch (err) {
    console.error(err);
    res.status(500).send(err.toString());
  }
});

// Simple health route
app.get("/", (req, res) => {
  res.send("BlindEye AI Server Running");
});

app.listen(PORT, () => {
  console.log("Server started on port", PORT);
});
