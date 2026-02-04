FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    curl \
    ffmpeg \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

WORKDIR /app

COPY package.json package-lock.json requirements.txt ./
COPY server.js tran.py ./

RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

RUN npm install

EXPOSE 3000

CMD ["node", "server.js"]
