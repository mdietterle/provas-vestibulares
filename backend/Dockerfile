FROM python:3.12-slim

# tesseract-ocr: required by pytesseract (used by the seed scripts that OCR exam PDFs)
# ca-certificates: obrigatório pro sslrootcert=system do DATABASE_URL (CockroachDB
# Cloud exige TLS verify-full contra a CA do sistema; sem esse pacote a imagem slim
# não tem /etc/ssl/certs e a conexão falha com "SSL error: certificate verify failed")
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
