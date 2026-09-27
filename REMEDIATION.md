# Lab 4 notes

Original repository: [rkinsella-emu/Taskmaster-API](https://github.com/rkinsella-emu/Taskmaster-API).

## First scan

[Run 2](https://github.com/dominicmac98/Taskmaster-API/actions/runs/36338336695) used commit `bbb8f92`.

Dependency-Check reported:

- 17 critical findings
- 53 high findings
- 37 medium or moderate findings
- 9 low findings

These are entries in the report. The same vulnerability can appear for more than one package.

ZAP reported five alert types above the informational level. They involved missing or incomplete security headers and the server showing its software name. It also reported two informational alert types.

Snyk did not scan during this run because the token had not been saved yet.

## Node package changes

- Express: 4.16.0 to 5.2.1
- jsonwebtoken: 8.2.0 to 9.0.3
- Mongoose: 5.0.10 to 9.10.2
- Axios and node-fetch were replaced with Node's built-in fetch.
- The direct body-parser entry was removed because Express can read JSON requests. Body-parser is still included through Express.
- Lodash was removed. The app now copies only the task fields it needs.
- Moment was replaced with JavaScript's built-in date functions.
- EJS, Handlebars, js-yaml, minimist, and serialize-javascript were removed because the app was not using them.
- Mocha and Chai were replaced with Node's built-in test tools.

The exact installed versions are saved in `api/package-lock.json`.

## Python package changes

- Flask: 0.12.2 to 3.1.3
- PyYAML: 3.12 to 6.0.3, with safe loading for YAML
- Requests: 2.19.1 to 2.34.2
- Gunicorn: 19.7.1 to 26.2.0
- Jinja2: 2.10 to 3.1.6
- Werkzeug: 0.14.1 to 3.1.8
- urllib3: 1.22 to 2.8.0
- Pillow, cryptography, Paramiko, SQLAlchemy, and boto3 were removed because the worker was not using them.

All 14 Python packages are listed with exact versions and hashes in `worker/requirements.txt`.

## Other changes

Node was updated from 8.9.0 to 24.21.0, Python from 3.6.15 to 3.12.14, and MongoDB from 3.6 to 8.0.32.

The app and worker run without root access. Their filesystems are read-only. The worker and database do not have ports open on the host computer. The app is only available through the local port 8080.

The app checks task ownership, uses expiring login tokens, adds security headers, and hides detailed internal errors. Reminder requests also check who owns the task.

## Final results

[Run 4, attempt 2](https://github.com/dominicmac98/Taskmaster-API/actions/runs/36340386940) used commit `4929cad`. All four jobs passed.

- Snyk checked 98 Node dependencies and 14 Python dependencies. It reported no high or critical vulnerabilities.
- Dependency-Check reported zero findings and no analysis errors.
- ZAP had no alerts above the informational level. One result remained because private responses use `Cache-Control: no-store`.
- Five Node tests and four Python tests passed.
- The smoke test passed for task storage, task ownership, and reminders.

Only the two Snyk jobs were rerun in attempt 2 after the token was saved. GitHub kept the passing Dependency-Check and ZAP results from attempt 1.

## Limits

Snyk was set to check high and critical findings. The ZAP scan was a passive scan without login. These results do not mean every possible security issue was tested.

Dependency-Check's optional Sonatype OSS Index check was disabled because its credentials were not set up. The other main checks completed.

The demo login does not verify a password, and the internal worker and database still depend on network isolation. This is a local lab setup.
