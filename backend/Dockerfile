FROM python:3.11-slim

# Install ffmpeg for ffprobe and curl for healthcheck
RUN apt-get update && apt-get install -y ffmpeg curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 1699

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "1699"]

