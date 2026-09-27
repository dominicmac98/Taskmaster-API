# Taskmaster API - Lab 4

This is my repository for ISAC 385 Lab 4. It was forked from [rkinsella-emu/Taskmaster-API](https://github.com/rkinsella-emu/Taskmaster-API).

The lab is about checking old packages for security issues, updating them, and running the scans again.

## What is in the project

- `api` has the Node.js application.
- `worker` has the Python reminder service.
- MongoDB stores the tasks.
- `.github/workflows/devsecops-pipeline.yml` runs the security checks.

## What changed

Old packages were updated, and packages the app did not need were removed. The app and worker were also changed so they run without root access. Only the app's port is available on the local computer.

GitHub Actions runs Snyk, OWASP Dependency-Check, and ZAP. It also runs tests to check that tasks and reminders still work.

The Snyk token is saved as a repository secret named `SNYK_TOKEN`.

## Results

[Run 4, attempt 2](https://github.com/dominicmac98/Taskmaster-API/actions/runs/36340386940) passed all four jobs. Snyk reported no high or critical vulnerabilities. Dependency-Check reported zero findings, and ZAP had one informational result about responses not being cached.

The package changes and scan results are in [REMEDIATION.md](REMEDIATION.md).

## Run it locally

Docker and Docker Compose v2 with include support are needed. In a Bash terminal, run:

```bash
export JWT_SECRET="$(openssl rand -hex 32)"
docker compose up --build --detach
curl --fail http://localhost:8080/health
python3 smoke_test.py
```

The app uses `http://localhost:8080`. To stop it and remove the lab database data:

```bash
docker compose down --volumes
```

This app is for the lab. Its demo login only asks for a username, so it should stay on the local computer.
