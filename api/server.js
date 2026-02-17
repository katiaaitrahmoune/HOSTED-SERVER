const AdmZip = require("adm-zip");

app.post("/process", upload.fields([{ name: "audio" }, { name: "image" }]), async (req, res) => {
  try {
    const zipPath = req.files["audio"][0].path; // ZIP file
    const imageFile = req.files["image"][0].path;

    // -------- UNZIP ----------
    const zip = new AdmZip(zipPath);
    const extractPath = path.join(__dirname, "uploads", "extracted");

    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true });
    }

    zip.extractAllTo(extractPath, true);

    // Since it always contains ONE wav file
    const extractedFiles = fs.readdirSync(extractPath);
    const audioFilePath = path.join(extractPath, extractedFiles[0]);

    // -------- SEND TO WORKER ----------
    const form = new FormData();
    form.append("audio", fs.createReadStream(audioFilePath));
    form.append("image", fs.createReadStream(imageFile));

    const workerRes = await axios.post(
      "https://seminationalized-floretty-shirl.ngrok-free.dev/process",
      form,
      {
        headers: form.getHeaders(),
        responseType: "arraybuffer"
      }
    );

    res.set("Content-Type", "audio/wav");
    res.send(Buffer.from(workerRes.data));

    // -------- CLEANUP ----------
    fs.unlinkSync(zipPath);
    fs.unlinkSync(imageFile);
    fs.rmSync(extractPath, { recursive: true, force: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", error: err.toString() });
  }
});
