import whisper
import sys

audio_file = sys.argv[1]  # Get the audio file from command line

# Load a small, fast model
model = whisper.load_model("tiny")  

# Transcribe
result = model.transcribe(audio_file)

print("Transcription:")
print(result["text"])
