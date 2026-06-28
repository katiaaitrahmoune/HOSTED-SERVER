require('dotenv').config();

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const https = require('https');
const googleTTS = require('google-tts-api');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const upload = multer({ dest: "temp/" }); // temporary storage for uploads

// ------------------ WHISPER ------------------
async function runWhisper(audioPath) {
  return new Promise((resolve, reject) => {
    exec(`python tran.py "${audioPath}"`, (err, stdout) => {
      if (err) return reject(err);
      const match = stdout.match(/Transcription:\s*([\s\S]*)/);
      resolve(match ? match[1].trim() : stdout.trim());
    });
  });
}

// ------------------ GEMINI ------------------
async function processImage(text, imagePath) {
  const genai = new GoogleGenerativeAI(process.env.API_GEMINI);

  const model = genai.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    systemInstruction: `
      Your name is BlindEye. You help visually impaired users by describing images clearly and concisely.
      Always start with "Hi I'm BlindEye".
      Keep your response under 200 characters.
      Use simple language, only describe visible objects.
    `,
  });

  const buffer = fs.readFileSync(imagePath);
  const base64 = buffer.toString("base64");

  const result = await model.generateContent([
    { text: text },
    { inlineData: { mimeType: "image/jpeg", data: base64 } }
  ]);

  let resText = result.response.text().trim();

  if (!resText.startsWith("Hi I'm BlindEye")) {
    resText = "Hi I'm BlindEye. " + resText;
  }

  if (resText.length > 200) {
    resText = resText.substring(0, 197) + "...";
  }

  return resText;
}

// ------------------ TTS ------------------
async function textToWav(text) {
  return new Promise((resolve, reject) => {
    const mp3File = path.join(__dirname, `temp-${Date.now()}.mp3`);
    const wavFile = path.join(__dirname, `response-${Date.now()}.wav`);

    const url = googleTTS.getAudioUrl(text, { lang: "en", slow: false });
    const file = fs.createWriteStream(mp3File);

    https.get(url, res => {
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

// ------------------ API ENDPOINT ------------------
app.post('/process', upload.fields([{ name: 'audio' }, { name: 'image' }]), async (req, res) => {
  try {
    const audioPath = req.files['audio'][0].path;
    const imagePath = req.files['image'][0].path;

    // Process files
    const transcription = await runWhisper(audioPath);
    console.log("Whisper done");
    const geminiText = await processImage(transcription, imagePath);
    console.log("Gemini done");
    const wavPath = await textToWav(geminiText);
    console.log("TTS done");

    // Send WAV back
    const wavBuffer = fs.readFileSync(wavPath);
    res.set('Content-Type', 'audio/wav');
    res.send(wavBuffer);

    // Cleanup
    fs.unlinkSync(audioPath);
    fs.unlinkSync(imagePath);
    fs.unlinkSync(wavPath);

  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// ------------------ START SERVER ------------------
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Worker running on port ${PORT}`));
