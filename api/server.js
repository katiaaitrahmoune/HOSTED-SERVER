require('dotenv').config();
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const cors = require('cors');

const app = express();
const upload = multer({ dest: 'uploads/' });
app.use(cors());

// ------------------ SESSION STORE ------------------
const sessions = {};
const SESSION_TTL = 60_000; // 1 minute timeout

function cleanSession(id) {
  const s = sessions[id];
  if (!s) return;
  clearTimeout(s.timer);
  if (s.audio && fs.existsSync(s.audio)) fs.unlinkSync(s.audio);
  if (s.image && fs.existsSync(s.image)) fs.unlinkSync(s.image);
  delete sessions[id];
}

function getOrCreate(id) {
  if (!sessions[id]) {
    sessions[id] = {
      audio: null,
      image: null,
      resolve: null,
      timer: setTimeout(() => {
        const s = sessions[id];
        if (s?.resolve) s.resolve({ timeout: true });
        cleanSession(id);
      }, SESSION_TTL),
    };
  }
  return sessions[id];
}

// ------------------ UPLOAD AUDIO ------------------
app.post('/upload/audio', upload.single('audio'), async (req, res) => {
  const id = req.query.session_id;
  if (!id) return res.status(400).json({ error: 'missing session_id' });

  const session = getOrCreate(id);
  session.audio = req.file.path;

  if (session.image) {
    // image already here → process immediately
    const result = await processSession(session, id);
    if (!result) return res.status(500).json({ error: 'processing failed' });
    return res.json({ url: result });
  }

  // wait for image to arrive
  const result = await new Promise((resolve) => {
    session.resolve = resolve;
  });

  if (!result || result.timeout) {
    return res.status(408).json({ error: 'timeout waiting for image' });
  }

  return res.json({ url: result });
});

// ------------------ UPLOAD IMAGE ------------------
app.post('/upload/image', upload.single('image'), async (req, res) => {
  const id = req.query.session_id;
  if (!id) return res.status(400).json({ error: 'missing session_id' });

  const session = getOrCreate(id);
  session.image = req.file.path;

  if (session.audio) {
    // audio already waiting → trigger processing
    res.status(200).json({ status: 'processing' });
    const result = await processSession(session, id);
    if (session.resolve) session.resolve(result);
    return;
  }

  // audio not here yet
  res.status(202).json({ status: 'waiting_for_audio' });
});

// ------------------ WORKER CALL ------------------
async function processSession(session, id) {
  const { audio: audioPath, image: imagePath } = session;

  try {
    const form = new FormData();
    form.append('audio', fs.createReadStream(audioPath));
    form.append('image', fs.createReadStream(imagePath));

    const workerRes = await axios.post(`${process.env.WORKER_URL}/process`, form, {
      headers: {
        ...form.getHeaders(),
        'ngrok-skip-browser-warning': 'true'
      },
      responseType: 'json'
    });

    return workerRes.data.url; // Cloudinary URL

  } catch (err) {
    console.error('Worker error:', err.message);
    return null;
  } finally {
    cleanSession(id);
  }
}

// ------------------ HEALTHCHECK ------------------
app.get('/', (req, res) => res.send('BlindEye API Running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));