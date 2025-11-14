# AI Email Assistant – Deployment (Vercel Version)

## Deployment to Vercel

### 1. Prepare the repo
- Add a `.gitignore` and include:
  ```
  .env
  venv/
  __pycache__/
  *.pyc
  ```
- Ensure no secrets (`.env`) are committed. Rotate keys if they were leaked.

### 2. Push to GitHub
```bash
git init
git add .
git commit -m "Prepare for Vercel deployment"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### 3. Import repo into Vercel
1. Visit https://vercel.com and sign in with GitHub.
2. Click **New Project → Import Git Repository**.
3. Select your repo.
4. Vercel will auto-detect Python (because of `app.py` + `requirements.txt`).

#### Optional: Add `vercel.json` to specify Python runtime
```json
{
  "functions": {
    "app.py": {
      "runtime": "python3.11"
    }
  }
}
```

### 4. Add environment variables in Vercel
In **Vercel Dashboard → Project → Settings → Environment Variables**, add:

```
GEMINI_API_KEY
FLASK_SECRET_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
SENDER_EMAIL
SENDER_PASSWORD
REDIRECT_URI       # https://<your-vercel-domain>/auth-callback
FRONTEND_URL       # https://<your-vercel-domain>
```

### 5. Configure Google Cloud OAuth
Go to **Google Cloud Console → APIs & Services → Credentials → OAuth Client**.

Add:

**Authorized JavaScript origins**
```
https://<your-vercel-domain>
```

**Authorized redirect URIs**
```
https://<your-vercel-domain>/auth-callback
```

(If you use preview deployments, add them too.)

### 6. Test your deployment
- Open your Vercel URL.
- Click **Sign in with Google**.
- Ensure the OAuth flow redirects correctly to your Vercel domain.

---

## Notes
- You do **not** need Gunicorn on Vercel.
- Any time you update environment variables, redeploy.
- If Google OAuth fails with `redirect_uri_mismatch`, double‑check the redirect URI value in both Google Console and Vercel environment variables.
