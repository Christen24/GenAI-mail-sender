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
- **Ready to Deploy:** Configured for deployment on Render with Gunicorn.

## Project Structure

```
email-generator/
├── app.py                # Flask backend (Auth, API routes)
├── .env                  # Environment variables (ALL keys)
├── requirements.txt      # Python dependencies
├── Procfile              # Render deployment command
├── OAUTH_SETUP.md        # Guide to get Google keys
├── DEPLOYMENT_GUIDE.md   # Guide to deploy on Render
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
Follow the instructions in `OAUTH_SETUP.md` exactly. This is not optional.  
This guide will help you get your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

> Crucially: You must add  
> - `http://127.0.0.1:5000` to your **Authorized JavaScript origins**, and  
> - `http://127.0.0.1:5000/auth-callback` to your **Authorized redirect URIs** in the Google Cloud Console.

### 5. Set Up Environment Variables
Create a file named `.env` in the root directory.  
Copy the contents of the `env.example` file (or see below) into it.

**Environment Variables:**
- `GEMINI_API_KEY`: Add your API key from Google AI Studio.
- `FLASK_SECRET_KEY`: Run `python -c "import os; print(os.urandom(24).hex())"` in your terminal and paste the result.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: Paste the keys from Step 4.
- `SENDER_EMAIL` / `SENDER_PASSWORD` (Fallback Account):

> **IMPORTANT:** If using Gmail, you must use an "App Password".  
> Go to your Google Account → Security → 2-Step Verification (must be ON).  
> Go to "App Passwords", generate a new password for "Mail", and use that 16-character password here.

### 6. Run the Application
```bash
python app.py
```
The application will be available at: [http://127.0.0.1:5000](http://127.0.0.1:5000)

---

## Deployment to Render

### 1. Push to GitHub
- Create a `.gitignore` file and add `.env` and `venv/` to it.
- Push your project to a new GitHub repository.
- Remember to update the "Deploy to Render" button at the top of this file with your repo's URL!

### 2. Deploy on Render
- Click the "Deploy to Render" button at the top of this README.  
  **OR**: Go to Render → Create a new **Web Service**, and connect your GitHub repository.

**Build Command:**
```
pip install -r requirements.txt
```

**Start Command:**
```
gunicorn app:app
```

### 3. Add Environment Variables
In your Render service dashboard, go to the "Environment" tab and add all 6 keys from your `.env` file:
```
GEMINI_API_KEY
FLASK_SECRET_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
SENDER_EMAIL
SENDER_PASSWORD
```

### 5. Configure Google Cloud for Production
Go back to your Google Cloud Console → Credentials.

Add your live Render URL (e.g., `https://ai-email-app.onrender.com`) to **Authorized JavaScript origins**.  
Add your callback URL (e.g., `https://ai-email-app.onrender.com/auth-callback`) to **Authorized redirect URIs**.


Page link:https://ai-email-assistant-u2tw.onrender.com/
