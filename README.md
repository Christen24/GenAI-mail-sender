# AI Email Assistant

This is a full-stack web application that uses the Gemini AI to generate personalized emails, allows users to sign in with Google to send from their own accounts, and supports mail-merge functionality from a CSV upload.

## Features

- **AI-Powered:** Uses Google's Gemini (gemini-2.5-flash) to generate email content.
- **Google OAuth 2.0:** Allows users to "Sign in with Google" to securely send emails from their own accounts.
- **Fallback Sender:** If a user is not signed in, emails are sent from a pre-configured server account (via SMTP).
- **Mail Merge:** Automatically personalizes emails by replacing [Name] with the recipient's name for batch sending.
- **CSV Upload:** Users can upload a CSV file of names and emails to populate the recipient list instantly.
- **Compose & Reply Modes:** Supports drafting new emails or generating replies based on pasted email content.
- **Modern UI:** Clean, responsive, single-card design with light/dark modes.
- **Ready to Deploy:** Configured for deployment on Vercel.

## Project Structure

```
email-generator/
├── app.py                # Flask backend (Auth, API routes)
├── .env                  # Environment variables (ALL keys)
├── requirements.txt      # Python dependencies
├── OAUTH_SETUP.md        # Guide to get Google keys
├── DEPLOYMENT_GUIDE.md   # Deployment guides
├── templates/
│   └── index.html        # Frontend HTML
├── static/
│   ├── style.css         # Frontend CSS
│   └── script.js         # Frontend JavaScript
└── README.md             # This file
```

## How to Run Locally

### 1. Clone the Repository
```bash
git clone <repository-url>
cd email-generator
```

### 2. Create a Virtual Environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Set Up Google Credentials
Follow the instructions in `OAUTH_SETUP.md` exactly.  
This is not optional.

You must add:
- `http://127.0.0.1:5000` → Authorized JavaScript origins  
- `http://127.0.0.1:5000/auth-callback` → Authorized redirect URIs

### 5. Set Up Environment Variables
Create a `.env` file and add:

- `GEMINI_API_KEY`
- `FLASK_SECRET_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SENDER_EMAIL`
- `SENDER_PASSWORD`

> If using Gmail, you MUST use an App Password.

### 6. Run the App
```bash
python app.py
```
Open: http://127.0.0.1:5000

---

# Deployment to Vercel

## 1. Prepare the repo
Include a `.gitignore`:

```
.env
venv/
__pycache__/
*.pyc
```

## 2. Push to GitHub
```bash
git init
git add .
git commit -m "Prepare for Vercel deployment"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo>.git
git push -u origin main
```

## 3. Import into Vercel
- Go to https://vercel.com  
- Click **New Project → Import GitHub repo**
- Vercel auto-detects Python using `requirements.txt` + `app.py`

### Optional `vercel.json`
```json
{
  "functions": {
    "app.py": {
      "runtime": "python3.11"
    }
  }
}
```

## 4. Add Environment Variables on Vercel

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

## 5. Configure Google OAuth (Production)

### Authorized JavaScript origins
```
https://<your-vercel-domain>
```

### Authorized redirect URIs
```
https://<your-vercel-domain>/auth-callback
```

Add preview URLs too if you want.

If OAuth is in Testing mode, add your Google account under **Test Users**.

## 6. Test Deployment
Open your Vercel URL → Click **Sign in with Google** → Should work correctly.

---

