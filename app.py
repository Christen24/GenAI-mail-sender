import os
import smtplib
import re
import json
import base64
import google.generativeai as genai
import secrets # Added for state token
from email.mime.text import MIMEText
from urllib.parse import urlencode # Added as requested
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_cors import CORS
from dotenv import load_dotenv

# --- Google OAuth Imports ---
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# --- Configuration ---

# Flask session secret key (MANDATORY for session)
app.secret_key = os.getenv("FLASK_SECRET_KEY")
if not app.secret_key:
    raise ValueError("FLASK_SECRET_KEY is not set. Generate one with: python -c 'import os; print(os.urandom(24).hex())'")

# Gemini API
try:
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        raise ValueError("GEMINI_API_KEY not found.")
    genai.configure(api_key=gemini_api_key)
    gemini_model = genai.GenerativeModel('gemini-2.5-flash')
    print("Gemini client initialized successfully.")
except Exception as e:
    print(f"Error initializing Gemini client: {e}")
    gemini_model = None

# SMTP Sender Credentials (for default/non-logged-in users)
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD")
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))

# --- Google OAuth 2.0 Configuration ---
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

# Use env-driven value for REDIRECT_URI, fallback to localhost for dev
REDIRECT_URI = os.getenv("REDIRECT_URI", "http://127.0.0.1:5000/auth-callback")

# Scopes: What we are asking the user for permission to do
SCOPES = [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/gmail.send'
]

# Create client_config dict for Flow
client_config = {
    "web": {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": [REDIRECT_URI], # Use the env-driven URI
    }
}


# --- Core Routes ---

@app.route('/')
def home():
    """Serves the main index.html page."""
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate_email():
    """
    Generates email content.
    """
    if not gemini_model:
        return jsonify({"error": "Gemini client is not initialized. Check API key."}), 500

    try:
        data = request.get_json()
        mode = data.get('mode', 'compose')
        tone = data.get('tone', 'professional')
        prompt = ""
        
        if mode == 'compose':
            # --- Compose Mode ---
            subject = data.get('subject', 'No Subject')
            context = data.get('context', 'Please write a default email.')
            name_for_prompt = "[Name]"

            prompt = f"""
            Write a {tone} email to {name_for_prompt}.
            The subject of the email is: "{subject}".
            The core message or context is: "{context}".
            Please generate only the body of the email.
            Start directly with the salutation.
            """

        elif mode == 'reply':
            # --- Reply Mode ---
            original_email = data.get('original_email', 'No original email provided.')
            reply_context = data.get('reply_context', 'Please write a default reply.')
            
            prompt = f"""
            You are an email assistant. A user has received the following email:
            --- ORIGINAL EMAIL ---
            {original_email}
            --- END ORIGINAL EMAIL ---

            The user wants to reply with the following key points, in a {tone} tone:
            --- USER'S REPLY CONTEXT ---
            {reply_context}
            --- END USER'S REPLY CONTEXT ---

            Please generate a {tone} reply email.
            Generate only the body of the reply.
            Do not include the "Subject:" line.
            Start directly with a salutation.
            """
        
        generation_config = genai.types.GenerationConfig(temperature=0.7, max_output_tokens=2048)
        response = gemini_model.generate_content(prompt, generation_config=generation_config)
        
        email_content = response.text.strip()
        
        if not email_content:
             raise Exception("Received empty response from Gemini (possibly due to safety filters).")

        return jsonify({"generated_email": email_content})

    except Exception as e:
        print(f"Error during email generation: {e}")
        fallback_email = ("Dear [Name],\n\n"
                          "This is a sample email generated because the AI service failed.\n\n"
                          "Best regards,\n[Your Name]")
        return jsonify({"generated_email": fallback_email, "warning": f"AI Error: {str(e)}"}), 200

# --- Authentication Routes (NEW) ---

# Removed get_current_redirect_uri() as we now use the global REDIRECT_URI

@app.route("/login")
def login():
    """
    Redirects the user to Google's OAuth 2.0 login page.
    This route now manually constructs the URL as requested.
    """
    # Generate a state token for CSRF protection
    state = secrets.token_urlsafe(16)
    session['state'] = state

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES), # Use the existing SCOPES list
        "access_type": "offline",
        "prompt": "consent",
        "state": state # Include state in the request
    }
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
    
    # debug print (temporary)
    print("DEBUG: Google auth_url redirect_uri ->", REDIRECT_URI)
    return redirect(auth_url)

@app.route('/auth-callback')
def auth_callback():
    """Handles the redirect back from Google after login."""
    state = session.get('state')
    
    if not state or state != request.args.get('state'):
        print("Error: State mismatch.")
        return redirect(url_for('home'))

    flow = Flow.from_client_config(client_config, scopes=SCOPES)
    
    # Use the global REDIRECT_URI consistent with the /login route
    flow.redirect_uri = REDIRECT_URI

    # Enable insecure transport if redirect_uri is localhost
    if '127.0.0.1' in REDIRECT_URI or 'localhost' in REDIRECT_URI:
        os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

    try:
        flow.fetch_token(authorization_response=request.url)
        creds = flow.credentials
        
        session['credentials'] = {
            'token': creds.token,
            'refresh_token': creds.refresh_token,
            'token_uri': creds.token_uri,
            'client_id': creds.client_id,
            'client_secret': creds.client_secret,
            'scopes': creds.scopes
        }
        
        creds_obj = Credentials(**session['credentials'])
        service = build('oauth2', 'v2', credentials=creds_obj)
        user_info = service.userinfo().get().execute()
        
        session['user_info'] = {
            'name': user_info.get('name', 'User'),
            'email': user_info.get('email', '')
        }

    except Exception as e:
        print(f"Error during OAuth callback: {e}")
    finally:
        if 'OAUTHLIB_INSECURE_TRANSPORT' in os.environ:
            del os.environ['OAUTHLIB_INSECURE_TRANSPORT']

    return redirect(url_for('home'))

@app.route('/logout', methods=['POST'])
def logout():
    """Clears the user's session."""
    session.clear()
    return jsonify({"status": "logged_out"})

@app.route('/check-auth', methods=['GET'])
def check_auth():
    """Checks if a user is currently logged in."""
    if 'credentials' in session and 'user_info' in session:
        return jsonify({"logged_in": True, "user": session['user_info']})
    else:
        return jsonify({"logged_in": False})

# --- Email Sending Routes (OLD and NEW) ---

@app.route('/send-email', methods=['POST'])
def send_email_smtp():
    """
    (FALLBACK) Sends email using the server's .env SMTP credentials.
    NOW PERFORMS A MAIL MERGE.
    """
    
    # --- THIS IS THE CRITICAL CHECK ---
    # This check prevents the server from crashing.
    if not SENDER_EMAIL or not SENDER_PASSWORD:
        print("ERROR: SENDER_EMAIL or SENDER_PASSWORD not set in environment.")
        return jsonify({
            "status": "error", 
            "message": "Server error: The app owner has not configured the default sender."
        }), 500
    # --- END CHECK ---

    try:
        data = request.get_json()
        recipients = data.get('recipients', [])
        subject = data.get('subject')
        template_body = data.get('body')

        if not recipients or not subject or not template_body:
             return jsonify({"status": "error", "message": "Missing recipients, subject, or body."}), 400

        # Start the server connection once
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            
            # Loop through each recipient and send a personalized email
            for recipient in recipients:
                name = recipient.get('name', 'there').strip()
                email = recipient.get('email', '').strip()

                if not email:
                    continue 

                effective_name = name if name else "there"
                personalized_body = re.sub(r'\[Name\]', effective_name, template_body, flags=re.IGNORECASE)

                msg = MIMEText(personalized_body, 'plain', 'utf-8')
                msg['Subject'] = subject
                msg['From'] = SENDER_EMAIL
                msg['To'] = email
                
                server.sendmail(SENDER_EMAIL, [email], msg.as_string()) 
        
        return jsonify({"status": "success", "sender": SENDER_EMAIL})

    except Exception as e:
        print(f"Error in /send-email: {e}")
        return jsonify({"status": "error", "message": f"Server Error: {str(e)}"}), 500

@app.route('/send-oauth-email', methods=['POST'])
def send_email_oauth():
    """
    (NEW) Sends email using the LOGGED-IN USER'S Gmail account via OAuth.
    NOW PERFORMS A MAIL MERGE.
    """
    if 'credentials' not in session:
        return jsonify({"status": "error", "message": "User not authenticated."}), 401

    try:
        creds = Credentials(**session['credentials'])
        service = build('gmail', 'v1', credentials=creds)
        
        data = request.get_json()
        recipients = data.get('recipients', [])
        subject = data.get('subject')
        template_body = data.get('body')

        if not recipients or not subject or not template_body:
             return jsonify({"status": "error", "message": "Missing recipients, subject, or body."}), 400

        # Loop through each recipient and send a personalized email
        for recipient in recipients:
            name = recipient.get('name', 'there').strip()
            email = recipient.get('email', '').strip()
            
            if not email:
                continue

            effective_name = name if name else "there"
            personalized_body = re.sub(r'\[Name\]', effective_name, template_body, flags=re.IGNORECASE)

            message = MIMEText(personalized_body, 'plain', 'utf-8')
            message['To'] = email
            message['From'] = session['user_info']['email']
            message['Subject'] = subject
            
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
            create_message = {'raw': raw_message}

            service.users().messages().send(userId='me', body=create_message).execute()
        
        return jsonify({"status": "success", "sender": session['user_info']['email']})

    except HttpError as error:
        print(f"An error occurred: {error}")
        return jsonify({"status": "error", "message": f"Gmail API Error: {error}"}), 500
    except Exception as e:
        print(f"Error in /send-oauth-email: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == '__main__':
    # Ensure debug=False when deploying to production
    app.run(host='0.0.0.0', port=int(os.getenv("PORT", 5000)), debug=True)
