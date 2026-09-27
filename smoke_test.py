"""Exercise the real API -> MongoDB and API -> worker -> webhook paths."""
import json
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from uuid import uuid4

BASE = 'http://localhost:8080'


def call(path, method='GET', data=None, token=None, expected=200):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    body = json.dumps(data).encode() if data is not None else None
    request = Request(BASE + path, data=body, headers=headers, method=method)
    try:
        response = urlopen(request, timeout=10)
    except HTTPError as error:
        response = error
    assert response.status == expected, (path, response.status, expected)
    assert response.headers.get('X-Content-Type-Options') == 'nosniff'
    assert response.headers.get('X-Powered-By') is None
    return json.load(response)


suffix = uuid4().hex[:8]
alice = 'alice_' + suffix
bob = 'bob_' + suffix
call('/health')
call('/tasks', expected=401)
alice_token = call('/login', 'POST', {'user': alice})['token']
bob_token = call('/login', 'POST', {'user': bob})['token']
task = call('/tasks', 'POST', {'title': 'Security lab smoke test', 'owner': bob}, alice_token, 201)
assert task['owner'] == alice
assert any(t['_id'] == task['_id'] for t in call('/tasks', token=alice_token))
assert not any(t['_id'] == task['_id'] for t in call('/tasks', token=bob_token))
call('/tasks/' + task['_id'] + '/remind', 'POST', token=bob_token, expected=404)
reminder = call('/tasks/' + task['_id'] + '/remind', 'POST', token=alice_token)
assert reminder['status'] == 'queued'
assert alice in reminder['message']
print('PASS: health, authentication, task persistence, owner isolation and reminder delivery')
