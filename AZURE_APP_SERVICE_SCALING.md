# Azure App Service: Multi-Instance + Low-Downtime Setup

This backend currently supports App Service health checks at `GET /health`.
Use this runbook to remove single-instance downtime risk and deploy safely from a repo where backend code is in `backend/`.

## 1) Fix the startup command for subfolder deployment

For your current App Service setup (Linux, Node 20, GitHub Actions deployment of the backend repo root), set Startup Command so Azure runs the backend service from the repository root:

- Linux App Service Startup Command:
  - `npm start`

Only use `cd backend && npm start` if Azure is deploying the monorepo root and the backend lives in a `backend/` subfolder inside the package.

Rule of thumb:

- If `/home/site/wwwroot/package.json` is the backend package: use `npm start`
- If backend is under `/home/site/wwwroot/backend/package.json`: use `cd backend && npm start`

Set it in Portal:
- App Service -> Configuration -> General settings -> Startup Command

Or set it with Azure CLI:

```bash
az webapp config set \
  --resource-group <RESOURCE_GROUP> \
  --name <APP_NAME> \
  --startup-file "npm start"
```

## 2) Enable Health Check

Configure Health Check so bad instances are removed automatically.

Portal:
- App Service -> Monitoring -> Health check
- Path: `/health`

CLI:

```bash
az webapp config set \
  --resource-group <RESOURCE_GROUP> \
  --name <APP_NAME> \
  --health-check-path "/health"
```

## 3) Scale out to multiple instances

Single instance always has planned maintenance restart risk. Set instance count >= 2.

Portal:
- App Service Plan -> Scale out (App Service plan)
- Manual scale: set instance count to at least 2

CLI (example = 2 instances):

```bash
az appservice plan update \
  --resource-group <RESOURCE_GROUP> \
  --name <APP_SERVICE_PLAN> \
  --number-of-workers 2
```

## 4) Keep workers warm

Enable Always On to reduce cold starts after restarts and swaps.

Portal:
- App Service -> Configuration -> General settings -> Always On = On

CLI:

```bash
az webapp config set \
  --resource-group <RESOURCE_GROUP> \
  --name <APP_NAME> \
  --always-on true
```

## 5) Use deployment slots for near-zero downtime releases

Use `staging` slot and swap into production after validation.

Create slot:

```bash
az webapp deployment slot create \
  --resource-group <RESOURCE_GROUP> \
  --name <APP_NAME> \
  --slot staging
```

Deploy to `staging`, run smoke tests (`/health`, auth flow), then swap:

```bash
az webapp deployment slot swap \
  --resource-group <RESOURCE_GROUP> \
  --name <APP_NAME> \
  --slot staging \
  --target-slot production
```

## 6) Recommended app settings

Set these in App Service -> Configuration -> Application settings:

- `NODE_ENV=production`
- `WEBSITE_HEALTHCHECK_MAXPINGFAILURES=2` (optional: faster unhealthy-instance eviction)

Do not commit secrets in `.env`. Configure all production secrets in App Service settings.

## 7) Quick verification checklist

After changes:

1. Hit `https://<APP_NAME>.azurewebsites.net/health` and confirm 200.
2. In Metrics, verify requests are served without spikes in 5xx during restart windows.
3. Confirm instance count is >= 2.
4. Test deployment slot swap and verify no user-visible outage.

## 8) ContainerTimeout quick fix playbook

Symptom:

- App Service shows `ContainerTimeout` and startup fails after ~230 seconds.

Most common cause for this repository shape:

- Startup command points to wrong folder, so Node never starts the backend process that listens on `PORT`.

Immediate checks:

1. Confirm Startup Command matches actual deployment structure (see section 1).
2. Ensure App Service app setting `PORT` is not manually overridden to a conflicting value.
3. Confirm app binds to `process.env.PORT` (already implemented in backend).
4. Verify logs for startup errors.

Enable and stream logs:

```bash
az webapp log config \
  --resource-group <RESOURCE_GROUP> \
  --name <APP_NAME> \
  --application-logging true \
  --level information

az webapp log tail \
  --resource-group <RESOURCE_GROUP> \
  --name <APP_NAME>
```

Check current startup configuration:

```bash
az webapp config show \
  --resource-group <RESOURCE_GROUP> \
  --name <APP_NAME> \
  --query "appCommandLine"
```

Apply one of these (pick one only):

```bash
# Option A: backend deployed at site root
az webapp config set \
  --resource-group <RESOURCE_GROUP> \
  --name <APP_NAME> \
  --startup-file "npm start"

# Option B: repo root deployed, backend in subfolder
az webapp config set \
  --resource-group <RESOURCE_GROUP> \
  --name <APP_NAME> \
  --startup-file "cd backend && npm start"
```

Restart after startup-command change:

```bash
az webapp restart \
  --resource-group <RESOURCE_GROUP> \
  --name <APP_NAME>
```

## What changed in code

`backend/app.js` now includes graceful shutdown handlers for `SIGTERM` and `SIGINT`, allowing in-flight requests to complete before process exit. This helps during App Service restarts, scale events, and slot operations.
