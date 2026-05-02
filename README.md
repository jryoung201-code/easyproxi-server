# EasyProxi Server

Backend server for EasyProxi — handles proxying, API keys, usage tracking, and status.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | None | Server info |
| GET | `/api/status` | None | Uptime + status |
| GET | `/api/user` | `x-api-key` header | User info |
| POST | `/api/usage` | `x-api-key` header | Track usage |
| GET | `/api/proxy?url=...` | None | Proxy a URL |

## Deploy to Render (Free)

1. Push this folder to a **new GitHub repo** (e.g. `easyproxi-server`)
2. Go to [render.com](https://render.com) and sign up free
3. Click **New → Web Service**
4. Connect your GitHub repo
5. Set these settings:
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
6. Click **Deploy**
7. Once live, go to **Settings → Custom Domains** and add `server.easyproxi.online`
8. Add the CNAME record to your DNS pointing to Render's URL

## Update your frontend

In `script.js`, change `/api/proxy` to:
```
https://server.easyproxi.online/api/proxy
```
