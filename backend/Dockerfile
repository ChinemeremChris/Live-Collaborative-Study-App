FROM python:3.12-slim

WORKDIR /backend

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

RUN useradd --create-home appuser

COPY . .

RUN chown -R appuser:appuser /backend

USER appuser

CMD ["uvicorn", "app.app:app", "--host", "0.0.0.0", "--port", "8000"]