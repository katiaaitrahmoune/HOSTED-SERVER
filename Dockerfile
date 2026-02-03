# Use Python 3.11 slim image
FROM python:3.11-slim

# Install dependencies for Python + Node + ffmpeg
RUN apt-get update && apt-get install -y \
    curl \
    ffmpeg \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Set working directory
WORKDIR /app

# Copy project files
COPY package.json package-lock.json requirements.txt server.js tran.py audio.wav image.jpg ./

# Upgrade pip and install Python packages
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Install Node packages
RUN npm install

# Default command
CMD ["node", "server.js"]
