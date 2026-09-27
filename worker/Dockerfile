FROM python:3.12.14-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app
COPY requirements.txt .
RUN python -m pip install --no-cache-dir --only-binary=:all: --require-hashes -r requirements.txt \
    && python -m pip check \
    && groupadd --gid 10001 app \
    && useradd --uid 10001 --gid app --create-home app
COPY app.py config.yml ./
USER 10001:10001
EXPOSE 5000
CMD ["gunicorn", "--worker-tmp-dir", "/tmp", "--bind", "0.0.0.0:5000", "app:app"]
