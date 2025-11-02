FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Expose port
EXPOSE 5000

# Set environment variable (can be overridden)
ENV VIDEO_SERVER_PATH=/video

# Run the application
CMD ["python", "app.py"]

