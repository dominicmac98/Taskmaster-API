# Keep the legacy application dependencies for the initial baseline.
# This Python 3.6 patch release and matching packaging tools can still resolve them.
FROM python:3.6.15-buster
WORKDIR /app
COPY requirements.txt .
RUN python -m pip install --no-cache-dir pip==21.3.1 setuptools==59.6.0 wheel==0.37.1 \
    && python -m pip install --no-cache-dir -r requirements.txt
COPY app.py config.yml ./
EXPOSE 5000
CMD ["gunicorn", "-b", "0.0.0.0:5000", "app:app"]
