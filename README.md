# TaskMaster-API security practice lab

Practice fork of [rkinsella-emu/Taskmaster-API](https://github.com/rkinsella-emu/Taskmaster-API) for ISAC 385 Lab 4.

| Component | Runtime | Dependencies |
| --- | --- | --- |
| API | Node.js 24.21.0 | Express 5.2.1, Mongoose 9.10.2, jsonwebtoken 9.0.3 |
| Worker | Python 3.12.14 | Flask 3.1.3, PyYAML 6.0.3, requests 2.34.2, Gunicorn 26.2.0 |
| Database | MongoDB 8.0.32 | Private Compose network |

This remains an isolated practice application. Its demonstration login accepts a user name without a password and is enabled only by the lab Compose configuration. Do not expose it publicly.

## Run the lab

Requires current Docker Engine and Docker Compose v2 with include support.

```bash
export JWT_SECRET="$(openssl rand -hex 32)"
docker compose up --build --detach
curl --fail http://localhost:8080/health
python3 smoke_test.py
docker compose down --volumes
```

The API and worker bind to loopback ports 8080 and 5000. The database and test webhook have no published ports. The internal network prevents external outbound access at runtime. The webhook is a local test receiver so the complete reminder path can be exercised without a third-party service.

## Security workflow

The workflow runs for pushes and pull requests to main and by manual dispatch.

- Snyk scans the Node and installed Python dependency trees and blocks high/critical findings.
- OWASP Dependency-Check scans both complete inventories and blocks CVSS 7 or higher.
- Node and Python tests check authentication handling, ownership, headers, and upstream errors.
- A Docker Compose smoke test checks real task persistence and reminder delivery.
- ZAP scans localhost:8080 and saves HTML/JSON/Markdown evidence.
- Node CycloneDX SBOM, package inventories, scan reports and runtime logs are uploaded as artifacts.

Save your own Snyk API token as the GitHub Actions repository secret named `SNYK_TOKEN`. Without it, the two Snyk jobs fail explicitly; a missing scan is never reported as a pass. Secrets are also unavailable to pull requests from unrelated forks.

ZAP cacheability rule 10049 is retained as INFO: `Cache-Control: no-store` is intentional for private API data. All other new ZAP warnings still fail the job. The scan is a passive unauthenticated baseline, not proof that all authenticated routes or business logic are safe.

## Reproduce dependency installation

```bash
cd api
npm ci --ignore-scripts
npm test
npm audit --audit-level=high
cd ../worker
python -m pip install --only-binary=:all: --require-hashes -r requirements.txt
python -m unittest -v test_app
```

`api/package-lock.json` commits exact transitive versions and integrity hashes. `worker/requirements.in` lists direct dependencies; `requirements.txt` locks all transitive versions with SHA-256 hashes. Regenerate the Python lock deliberately with pip-tools 7.6.1 using Python 3.12, review the changes, then rescan.

See [REMEDIATION.md](REMEDIATION.md) for baseline evidence and package changes.
