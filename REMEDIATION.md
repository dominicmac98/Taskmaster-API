# Lab 4 remediation record

## Baseline

Baseline commit: `bbb8f92241b492cbcc039886edff40972db129ce`.
[Run 2](https://github.com/dominicmac98/Taskmaster-API/actions/runs/36338336695) produced the Dependency-Check and ZAP reports on September 27, 2026.

Dependency-Check reported **17 critical, 53 high, 37 medium/moderate and 9 low findings** across the dependency report. Counts normalize severity capitalization and treat each reported dependency/advisory entry as a finding; they are not a deduplicated count of CVEs or a claim that every CPE match is reachable.

ZAP reported seven alert types: incomplete CSP (medium); missing CORP, Permissions-Policy, nosniff, and an X-Powered-By disclosure (low); plus two informational cacheability classifications.

The Snyk baseline was blocked by the missing SNYK_TOKEN secret. Do not label it as a completed Snyk scan.

## Package changes

Unused libraries were removed after reviewing both application entry points. This reduces the installed attack surface while preserving the app's task and reminder functions.

| Original Node package | Before | Remediation |
| --- | --- | --- |
| express | 4.16.0 | 5.2.1; includes current body-parser transitively |
| jsonwebtoken | 8.2.0 | 9.0.3; explicit HS256 validation |
| mongoose | 5.0.10 | 9.10.2; callback operations migrated to promises |
| axios | 0.18.0 | Replaced with Node's fetch and a timeout |
| body-parser | 1.18.2 | Direct dependency replaced by express.json |
| lodash | 4.17.4 | Deep merge replaced by an allowlist; owner comes from token |
| moment | 2.19.1 | Replaced by Date.toISOString |
| ejs | 2.5.7 | Removed; not imported or configured |
| handlebars | 4.0.11 | Removed; not imported |
| js-yaml | 3.10.0 | Removed from Node; not imported |
| minimist | 1.2.0 | Removed; not imported |
| node-fetch | 2.6.0 | Removed; native fetch used |
| serialize-javascript | 1.5.0 | Removed; not imported |
| mocha / chai | 5.0.0 / 4.1.2 | Replaced with Node's built-in test/assert modules |

| Original Python package | Before | Remediation |
| --- | --- | --- |
| Flask | 0.12.2 | 3.1.3 |
| PyYAML | 3.12 | 6.0.3; safe_load |
| requests | 2.19.1 | 2.34.2; timeouts, redirect rejection, status validation |
| gunicorn | 19.7.1 | 26.2.0 |
| Jinja2 / Werkzeug / urllib3 | 2.10 / 0.14.1 / 1.22 | Current transitive versions locked in requirements.txt |
| Pillow | 5.2.0 | Removed; no image processing |
| cryptography | 2.1.4 | Removed; no cryptography API use |
| paramiko | 2.4.0 | Removed; no SSH client |
| SQLAlchemy | 1.2.0 | Removed; no SQL database |
| boto3 | 1.4.4 | Removed; no AWS SDK use |

Fresh locks resolve and pin the full remaining dependency trees. No vulnerability suppression file is used by Snyk or Dependency-Check.

## Runtime changes

- Node 8.9.0 -> 24.21.0; Python 3.6.15 -> 3.12.14; MongoDB 3.6 -> 8.0.32.
- API and worker run as non-root with read-only filesystems, dropped Linux capabilities and no-new-privileges.
- Only the API publishes a loopback port (8080) through a bridge network. The worker, database and webhook remain on the internal network with no published ports. The API has outbound access through its bridge.
- Missing JWT_SECRET fails startup. The demo login is disabled unless explicitly enabled; tokens expire in 15 minutes.
- Responses include nosniff, CSP, CORP, Permissions-Policy, Referrer-Policy, DENY framing and no-store. X-Powered-By is disabled.
- Task ownership cannot be overridden through the request body. Reminder requests also verify ownership.
- Raw internal exceptions are not returned to clients; malformed inputs and oversized bodies are rejected.

## Verification and remaining limits

Node tests, Python tests, and the CI smoke test validate the behavior changed during migration. CI records the API/worker numeric user IDs. Scans must be evaluated from the actual run and its artifacts; dependency data changes over time.

Rule 10049 remains visible as INFO in the ZAP report because non-storable responses are expected for this API. Security header warnings are not suppressed. Passive unauthenticated ZAP coverage does not establish authenticated endpoint safety. The demo login and unauthenticated internal worker/database are lab limitations; this configuration is not suitable for public deployment.

Snyk completion depends on the repository owner saving SNYK_TOKEN and rerunning the pipeline. No fully green run or zero-Snyk-finding result is claimed before that happens.
