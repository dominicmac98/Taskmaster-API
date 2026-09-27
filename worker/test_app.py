import unittest
from unittest.mock import patch, Mock
import requests
from app import app


class WorkerTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_health_headers(self):
        response = self.client.get('/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers['X-Content-Type-Options'], 'nosniff')
        self.assertEqual(response.headers['Cache-Control'], 'no-store')

    def test_bad_payload_is_rejected(self):
        for body in ([], {}, {'user': {}, 'task_id': '1'}):
            self.assertEqual(self.client.post('/jobs', json=body).status_code, 400)

    @patch('app.requests.post')
    def test_webhook_success(self, post):
        post.return_value = Mock(status_code=204)
        response = self.client.post('/jobs', json={'user': 'alice', 'task_id': '1'})
        self.assertEqual(response.status_code, 202)
        self.assertIn('alice', response.json['message'])
        self.assertEqual(post.call_args.kwargs['timeout'], 5)
        self.assertFalse(post.call_args.kwargs['allow_redirects'])

    @patch('app.requests.post')
    def test_upstream_errors_are_not_reported_as_success(self, post):
        post.return_value = Mock(status_code=500)
        self.assertEqual(self.client.post('/jobs', json={'user': 'alice', 'task_id': '1'}).status_code, 502)
        post.side_effect = requests.Timeout('internal connection details')
        response = self.client.post('/jobs', json={'user': 'alice', 'task_id': '1'})
        self.assertEqual(response.status_code, 502)
        self.assertNotIn('internal connection', response.get_data(as_text=True))


if __name__ == '__main__':
    unittest.main()
