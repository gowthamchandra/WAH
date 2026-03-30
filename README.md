# Safety Checklist Portal

Fresh rebuild of the ladder safety checklist app.

## Project structure

- `backend/`: Express API with MongoDB save route
- `frontend/`: Static checklist UI

## Backend setup

```bash
cd backend
npm install
npm start
```

If port `5000` is already in use, change `PORT` in `backend/.env` to another port such as `5001`.

## Frontend setup

Serve the `frontend` folder with any simple static server.

```bash
cd frontend
python3 -m http.server 3000
```

Then open:

```text
http://localhost:3000
```

If you changed the backend port, update the `API URL` field in the page before submitting.

## API endpoints

- `GET /api/health`
- `POST /api/submit`
- `GET /api/responses`

## Deployment

### GitHub Pages for the frontend

GitHub Pages can host only the static app in `frontend/`. The backend must be deployed separately on a Node.js host.

1. Push this repository to GitHub.
2. In GitHub, enable Pages with `Source: GitHub Actions`.
3. In GitHub repository `Settings -> Secrets and variables -> Actions -> Variables`, add:
   - `API_BASE_URL=https://api.yourdomain.com`
   - `CUSTOM_DOMAIN=yourdomain.com` if you want a custom frontend domain
4. Push to `main`.

The workflow at [`.github/workflows/deploy-frontend-pages.yml`](/Users/gowtham/Downloads/W@H/.github/workflows/deploy-frontend-pages.yml) will publish the `frontend/` folder on pushes to `main`.

### Custom domain

You have two workable setups:

1. `yourdomain.com` for the frontend and `api.yourdomain.com` for the backend
2. A single backend host that serves the frontend and `/api/*` from the same domain

For split-domain hosting, set these backend environment variables:

```bash
MONGO_URI=your_mongodb_connection_string
PORT=5001
HOST=0.0.0.0
ALLOWED_ORIGINS=https://yourname.github.io,https://yourdomain.com
```

If you use GitHub Pages with a custom domain, add that domain to GitHub Pages settings and include it in `ALLOWED_ORIGINS`.

### Render for the backend

[`render.yaml`](/Users/gowtham/Downloads/W@H/render.yaml) is included for deploying the backend on Render.

1. Create a new Render Blueprint from your GitHub repository.
2. Select the generated `safety-checklist-api` service.
3. In Render environment variables, set:
   - `MONGO_URI`
   - `ALLOWED_ORIGINS`
4. Deploy.
