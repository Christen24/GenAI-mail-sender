# OAUTH_SETUP.md
Guide — How to create Google OAuth 2.0 credentials for the AI Email Assistant app
=================================================================================

This guide shows step-by-step how to create Google OAuth credentials (Client ID & Client Secret),
configure the OAuth consent screen, and set the correct redirect URIs for both **local development**
and **Vercel production**.

> **Before you begin:** you need a Google account and access to Google Cloud Console:
> https://console.cloud.google.com

---

## 1) Create (or select) a Google Cloud Project
1. Open Google Cloud Console.
2. In the top-left project selector, click **New Project** (or select an existing project).
3. Give it a recognizable name (e.g., `ai-email-assistant-prod`) and click **Create**.

---

## 2) Enable the necessary APIs
1. In the Cloud Console, go to **APIs & Services → Library**.
2. Enable the following APIs if you intend to use them:
   - **Gmail API** (if you plan to send emails via Gmail API; optional if using SMTP)
   - **Google People API** (optional, for fetching profile data)
   - If you only use SMTP + OAuth for consent, enabling Gmail API is still recommended.
3. Click **Enable** for each API you need.

---

## 3) Configure the OAuth consent screen
1. Go to **APIs & Services → OAuth consent screen**.
2. Choose **External** (if app will be used by Gmail accounts outside your organization) and click **Create**.
3. Fill in the app details:
   - **App name**: AI Email Assistant (or your preferred name)
   - **User support email**: your email
   - **Developer contact email**: your email
4. Scopes: for basic sign-in and sending mail via Gmail API, you may need:
   - `openid`, `email`, `profile` (for sign-in)
   - `https://www.googleapis.com/auth/gmail.send` (if using Gmail API to send mail)
   > Only request scopes your app actually needs — requesting sensitive scopes requires verification.
5. Save and continue.

**Testing vs Production:**
- While developing, the app can stay in **Testing** mode. In this mode, only **Test users** can sign in; add your Google account(s) under **Test users**.
- To allow any Google user to sign in, you must publish the app to **Production**. Publishing may require Google verification if you use sensitive scopes (like Gmail send).

---

## 4) Create OAuth 2.0 Client ID (Web application)
1. Go to **APIs & Services → Credentials**.
2. Click **Create Credentials → OAuth client ID**.
3. Choose **Web application** as the Application type.
4. Give it a name (e.g., `AI Email Assistant - Vercel`).

**Authorized JavaScript origins (add both local and production):**
- Local dev:
  - `http://127.0.0.1:5000`
  - `http://localhost:5000`
- Vercel production (example; replace with your actual domain):
  - `https://mail-sender-azure.vercel.app`
- (Optional) Vercel preview domains if you use them:
  - `https://mail-sender-git-main-christens-projects-591e5f06.vercel.app`
  - `https://mail-sender-qivfotvx4-christens-projects-591e5f06.vercel.app`

**Authorized redirect URIs (must match exactly what your app sends):**
- Local dev:
  - `http://127.0.0.1:5000/auth-callback`
  - `http://localhost:5000/auth-callback`
- Vercel production:
  - `https://mail-sender-azure.vercel.app/auth-callback`
- Example preview redirects (optional):
  - `https://mail-sender-git-main-christens-projects-591e5f06.vercel.app/auth-callback`

5. Click **Create**. Google will produce **Client ID** and **Client Secret**.

---

## 5) Add the credentials to Vercel (and local .env)
**On Vercel** (recommended for production):
1. Go to your Vercel project → **Settings → Environment Variables**.
2. Add the following keys (Production and Preview where applicable):
   - `GOOGLE_CLIENT_ID` = *your client id*
   - `GOOGLE_CLIENT_SECRET` = *your client secret*
   - `REDIRECT_URI` = `https://<your-vercel-domain>/auth-callback`  (exact domain)
   - `FRONTEND_URL` = `https://<your-vercel-domain>`

**Locally (for development)**:
Create a `.env` file in your repo root (do NOT commit it). Include:
```
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
REDIRECT_URI=http://127.0.0.1:5000/auth-callback
FRONTEND_URL=http://127.0.0.1:5000
```

---

## 6) Update your app code to use env vars
Ensure your app builds the Google auth URL using environment variables, not hard-coded `127.0.0.1`. Example (Flask):

```python
import os
from urllib.parse import urlencode
from flask import redirect

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
REDIRECT_URI = os.getenv("REDIRECT_URI", "http://127.0.0.1:5000/auth-callback")

def build_google_auth_url():
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent"
    }
    return "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)

@app.route("/login")
def login():
    return redirect(build_google_auth_url())
```

If your frontend constructs the OAuth URL in JavaScript, instead have it call the server `/login` endpoint which returns the correct auth URL (server uses env vars).

---

## 7) Scopes and Gmail send
- If you plan to send mail via Gmail API, request the scope:
  - `https://www.googleapis.com/auth/gmail.send`
- If you only use SMTP with an app password, you **do not** need Gmail API scopes.
- **Warning:** `gmail.send` is a sensitive scope; Google may require verification before publishing the app to Production.

---

## 8) Test users (for Testing mode)
- When OAuth consent screen is in **Testing**, only **Test users** can sign in. Add every Google account you want to test with:
  - OAuth consent screen → Test users → Add user emails
- No redeploy is needed after adding test users.

---

## 9) Common errors & fixes

### redirect_uri_mismatch
- Error: Google shows `redirect_uri_mismatch`.
- Fix: The `redirect_uri` parameter sent in the auth request must exactly match one of the URIs configured in Google Console. Check character-by-character (https vs http, trailing slash, domain spelling).

### invalid_client
- Error: `invalid_client` when redirecting to Google's auth endpoint.
- Fix: Ensure `GOOGLE_CLIENT_ID` in your environment matches the Client ID in Google Console.

### access_denied / consent required
- Error: User denies consent or required scopes are not accepted.
- Fix: Ensure the consent screen has required scopes and user approves them. For sensitive scopes, Google may require verification.

### app is not verified / unverified app screen
- If you see an **unverified app** screen, users can still proceed if they are added as test users (for Testing). To remove the warning for all users, submit for verification — required for sensitive scopes.

---

## 10) Rotating & securing credentials
- Never commit Client ID/Secret or `.env` to Git.
- If a secret is leaked, click **Revoke** in Google Cloud Console and create a new client secret, then update Vercel env vars.
- Use Vercel Environment Variables for production secrets — do not store secrets in code.

---

## 11) Optional: Using App Passwords (SMTP fallback)
If your app sends via SMTP when a user is not signed in:
- For Gmail, enable 2-Step Verification on the account.
- Generate an **App Password** (Security → App passwords).
- Use the generated 16-character password as `SENDER_PASSWORD` in env.

---

## 12) Final checklist (before testing)
- [ ] OAuth Client created (Web application)
- [ ] `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` added to Vercel
- [ ] `REDIRECT_URI` set to your Vercel callback URL
- [ ] Consent screen configured and Test users added (if testing)
- [ ] App code uses env vars for redirect URI (no hard-coded 127.0.0.1)
- [ ] If using Gmail API, scopes include `gmail.send` and you understand verification requirements

---

## 13) Useful references
- Google OAuth docs: https://developers.google.com/identity/protocols/oauth2
- Gmail API docs: https://developers.google.com/gmail/api

---

If you want, I can:
- generate the exact `REDIRECT_URI` and `FRONTEND_URL` strings for your Vercel domain (paste your domain and I'll format them),
- or create the small `/login` Flask route snippet and client-side change you should paste into your repo. 
