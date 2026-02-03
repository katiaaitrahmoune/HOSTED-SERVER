require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- Gemini setup ---
const api_key = process.env.API_GEMINI;
const genai = new GoogleGenerativeAI(api_key);
const modelai = genai.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

// --- Paths ---
const imageFile = path.join(__dirname, "image.jpg");
const pythonFile = path.join(__dirname, "tran.py"); 
const audioFile = path.join(__dirname, "audio.wav");

// --- Function to run Python Whisper ---
function transcription() {
    return new Promise((resolve, reject) => {
        exec(`python3 "${pythonFile}" "${audioFile}"`, (error, stdout, stderr) => {
            if (error) return reject(error);
            if (stderr) console.warn("Python warning:", stderr);

            const match = stdout.match(/Transcription:\s*([\s\S]*)/i);
            const text = match ? match[1].trim() : stdout.trim();
            resolve(text);
        });
    });
}

// --- Function to process image with Gemini ---
async function processImage(descriptionText) {
    try {
        const buffer = fs.readFileSync(imageFile);
        const base64 = buffer.toString("base64");

        console.log("Image loaded, base64 length:", base64.length);

        const result = await modelai.generateContent([
            { text: descriptionText }, 
            { inlineData: { mimeType: "image/jpeg", data: base64 } }
        ]);

        console.log("Gemini description:", result.response.text());
    } catch (err) {
        console.error("Error processing image:", err);
    }
}

// --- Main flow ---
async function main() {
    try {
        const text = await transcription();
        console.log("Transcribed text:", text);

        await processImage(text);
    } catch (err) {
        console.error("Error:", err);
    }
}

main();
