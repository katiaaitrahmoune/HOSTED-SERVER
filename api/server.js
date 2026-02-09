const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

app.post("/process", upload.fields([{ name: "audio" }, { name: "image" }]), async (req, res) => {
  try {
    const audioFile = req.files["audio"][0].path;
    const imageFile = req.files["image"][0].path;

    const form = new FormData();
    form.append('audio', fs.createReadStream(audioFile));
    form.append('image', fs.createReadStream(imageFile));

    // Send files to local worker
    const workerRes = await axios.post('http://YOUR_LOCAL_WORKER_IP:3001/process', form, {
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
