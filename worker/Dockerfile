FROM node:18

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg

WORKDIR /app

# Copy Node dependencies
COPY package*.json ./
RUN npm install

# Create Python virtual environment and install dependencies
RUN python3 -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"

COPY requirements.txt ./
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Copy rest of worker code
COPY . .

EXPOSE 3001

CMD ["node", "worker.js"]
