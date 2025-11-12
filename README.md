AI Email Generator & SenderThis is a full-stack web application that uses AI to generate professional emails and send them via SMTP.The backend is built with Flask (Python), and the frontend is custom-built with HTML, CSS, and vanilla JavaScript.FeaturesAI-Powered: Uses OpenAI (gpt-4o-mini) to generate email content based on user prompts.Customizable: User provides recipient name, subject, tone, and context.Editable: The generated email is displayed in a textarea, allowing for edits before sending.Direct Sending: Sends the email using pre-configured SMTP credentials (e.g., Gmail) from a .env file.Modern UI: Clean, responsive, card-based design.Dark Mode: Includes a light/dark theme toggle, with the user's preference saved in local storage.Error Handling: Displays non-intrusive popups for success and error messages.Ready to Deploy: Configured for deployment on platforms like Render using Gunicorn.Project Structureemail-generator/
├── app.py             # Flask backend
├── .env               # Environment variables (API keys, email creds)
├── requirements.txt   # Python dependencies
├── Procfile           # Render deployment command
├── templates/
│   └── index.html     # Frontend HTML
├── static/
│   ├── style.css      # Frontend CSS (includes dark mode)
│   └── script.js      # Frontend JavaScript (API calls, DOM)
└── README.md          # This file
How to Run LocallyClone the Repository:git clone <repository-url>
cd email-generator
Create a Virtual Environment:python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
Install Dependencies:pip install -r requirements.txt
Set Up Environment Variables:Create a file named .env in the root directory.Copy the contents of the provided .env example file into it.OPENAI_API_KEY: Add your API key from OpenAI.SENDER_EMAIL / SENDER_PASSWORD:IMPORTANT: If using Gmail, you must use an "App Password".Go to your Google Account > Security > 2-Step Verification (must be ON).Go to "App Passwords", generate a new password for "Mail" on "Other", and use that 16-character password here.Run the Application:flask run
The application will be available at http://127.0.0.1:5000.Deployment to RenderPush to GitHub: Ensure your project (including the Procfile and requirements.txt) is on GitHub.Create a New "Web Service" on Render and connect your repository.Settings:Build Command: pip install -r requirements.txtStart Command: gunicorn app:app (This is taken from the Procfile).Add Environment Variables:Go to the "Environment" tab for your new service.Add the same key-value pairs from your local .env file:OPENAI_API_KEYSENDER_EMAILSENDER_PASSWORDPYTHON_VERSION (e.g., 3.11.0)Deploy: Click "Manual Deploy" or trigger a deploy by pushing to your main branch.