# Deploy to Fly.io

This project is configured for deployment on Fly.io using Docker.

## Prerequisites

1. Install [flyctl](https://fly.io/docs/getting-started/installing-flyctl/):
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. Sign up for a [Fly.io account](https://fly.io/app/sign-up/)

3. Authenticate with Fly.io:
   ```bash
   fly auth login
   ```

## Deploy

From the project root (`frontend-preparation/`), run:

```bash
fly deploy
```

The first time you run this, Fly.io will:
- Create a new app (using the name from `fly.toml`)
- Build the Docker image
- Deploy to Fly.io

Subsequent deployments will update the existing app.

## View the App

After deployment, view your app with:

```bash
fly open
```

Or find your app URL:

```bash
fly status
```

## Logs

View deployment or runtime logs:

```bash
fly logs
```

## Configuration

The deployment is configured in `fly.toml`:
- App name: `question-trainer`
- Region: `lax` (Los Angeles)
- Machine: 512MB RAM, 1 shared CPU
- Port: 3000

To change the app name or other settings, edit `fly.toml` and redeploy.

## How It Works

1. **Dockerfile** builds both the backend and frontend
2. The backend serves both API requests (`/api/*`) and static frontend files
3. Frontend routing is handled by serving `index.html` for all non-API routes
