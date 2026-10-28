# 👁️ BlindEYE

**An AI-powered assistive wearable for visually impaired users.**

BlindEYE is a headset that lets the wearer *ask* about the world around them. Press a button, speak a question, and the device captures what's in front of you, understands it with AI, and answers out loud, in real time.

---

## ✨ Features

- 🎙️ **Voice questions**: press a button and speak naturally
- 📷 **Scene understanding**: the camera captures the scene and a vision model describes it
- 🔊 **Spoken answers**: responses are converted to speech and played back through the headset
- 🚧 **Object detection & distance estimation** (YOLOv8): alerts for nearby obstacles
- 🧩 **Session pairing**: audio and image uploads are matched by `session_id`

---

## 🏗️ Architecture

```
┌──────────────┐   photo    ┌───────────────────────────────┐
│  ESP32-CAM   │──────────▶ │                               │
│  (OV2640)    │ /upload/   │       Flask Server            │
└──────────────┘   image    │                               │
                            │  faster-whisper (STT)         │
┌──────────────┐   audio    │  Gemini (vision + answer)     │
│  ESP32-S3    │──────────▶ │  gTTS (text-to-speech)        │
│  INMP441 mic │ /upload/   │  Cloudinary (audio delivery)  │
│  MAX98357A   │◀────────── │                               │
└──────────────┘  audio URL └───────────────────────────────┘
```

**Pipeline:**

1. Button press → ESP32-CAM sends a photo to `/upload/image`
2. Button press → ESP32-S3 records audio (I2S → WAV) and sends it to `/upload/audio`
3. Server pairs both uploads by `session_id`
4. Speech → text with **faster-whisper**
5. Image + question → answer with **Gemini** vision
6. Answer → speech with **gTTS**, uploaded to **Cloudinary**
7. ESP32-S3 downloads and plays the audio through the amplifier

---

## 🔧 Hardware

| Component | Role |
|---|---|
| ESP32-S3 | Audio board (mic input, speaker output, button) |
| ESP32-CAM / OV2640 | Image capture |
| INMP441 | I2S MEMS microphone |
| MAX98357A | I2S amplifier / speaker driver |
| Tactile button | Trigger (GPIO21 → GND, `INPUT_PULLUP`) |

> The microphone and amplifier use **separate I2S pins** (no shared clocks).
> Mic runs on `I2S_NUM_1`.

The headset enclosure is designed in **CadQuery / Blender** (`build_assembly.py`) and 3D printed (Blender → Cura → UltiMaker).

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- ffmpeg (in your `PATH`)
- Arduino IDE or PlatformIO
- Accounts / keys: Google Gemini, Cloudinary
- ngrok (to expose the local server to the devices)

### 1. Clone

```bash
git clone https://github.com/<your-username>/blindeye.git
cd blindeye
```

### 2. Server setup

```bash
cd server
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file:

```env
GEMINI_API_KEY=your_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

### 3. Run

```bash
python server.py
ngrok http 5000
```

Copy the ngrok URL into the firmware config of both boards.

### 4. Flash the firmware

- `firmware/esp32-cam/`: image capture
- `firmware/esp32-s3/`: audio capture and playback

Set your Wi-Fi credentials and the server URL, then upload.

---

## 📡 API

| Endpoint | Method | Description |
|---|---|---|
| `/upload/image` | POST | Receives a JPEG from the ESP32-CAM |
| `/upload/audio` | POST | Receives a WAV from the ESP32-S3, triggers the pipeline |

Both boards share the session ID `liveSession1`.

---

## 📁 Project Structure

```
blindeye/
├── server/            # Flask backend (STT, vision, TTS)
├── firmware/
│   ├── esp32-cam/     # Camera firmware
│   └── esp32-s3/      # Mic + speaker firmware
├── detection/         # YOLOv8 object detection + distance estimation
├── enclosure/         # CadQuery / Blender 3D models
└── README.md
```

> Adjust folder names to match your repository.

---

## 🗺️ Roadmap

- [x] End-to-end voice + vision pipeline
- [x] Separate I2S buses for mic and amplifier
- [ ] YOLOv8 obstacle detection with distance alerts
- [ ] Multi-session support (replace the fixed session ID)
- [ ] Final headset enclosure
- [ ] Offline / on-device fallback

---

## 👥 Team

Built by the **BlindEYE** team, led by **Katia** (co-founder & tech lead).

## 📄 License

MIT: see [LICENSE](LICENSE).
