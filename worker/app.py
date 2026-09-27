import os
import yaml
import requests
from flask import Flask, request, jsonify, render_template_string

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024
WEBHOOK_URL = os.environ.get('WEBHOOK_URL', 'http://localhost:9000/hook')

with open(os.path.join(os.path.dirname(__file__), 'config.yml'), encoding='utf-8') as f:
    CONFIG = yaml.safe_load(f)

TEMPLATE = 'Reminder for {{ user }}: task {{ task_id }} is due soon.'


@app.after_request
def security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Content-Security-Policy'] = "default-src 'none'; frame-ancestors 'none'; form-action 'none'; base-uri 'none'"
    response.headers['Cross-Origin-Resource-Policy'] = 'same-origin'
    response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
    response.headers['Referrer-Policy'] = 'no-referrer'
    response.headers['Cache-Control'] = 'no-store'
    return response


@app.get('/health')
def health():
    return jsonify(status='ok')


@app.post('/jobs')
def create_job():
    body = request.get_json(silent=True)
    if not isinstance(body, dict) or any(
        not isinstance(body.get(key), str) or not 1 <= len(body[key]) <= 64
        for key in ('user', 'task_id')
    ):
        return jsonify(error='user and task_id are required strings'), 400
    message = render_template_string(TEMPLATE, user=body['user'], task_id=body['task_id'])
    try:
        response = requests.post(WEBHOOK_URL, json={'text': message}, timeout=5, allow_redirects=False)
        if not 200 <= response.status_code < 300:
            return jsonify(error='webhook unavailable'), 502
    except requests.RequestException:
        return jsonify(error='webhook unavailable'), 502
    return jsonify(status='queued', message=message), 202


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
