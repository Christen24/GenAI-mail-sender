document.addEventListener("DOMContentLoaded", () => {
    // --- State ---
    let currentMode = "compose"; // 'compose' or 'reply'
    let currentUser = null; // Stores user info if logged in

    // --- DOM Element Selection ---
    const themeToggle = document.getElementById("theme-toggle");
    
    // --- Auth Elements ---
    const loginBtn = document.getElementById("login-btn");
    const logoutBtn = document.getElementById("logout-btn");
    const userInfoDiv = document.getElementById("user-info");
    const userNameSpan = document.getElementById("user-name");

    // --- Main Form ---
    const emailForm = document.getElementById("email-form");
    const generateBtn = document.getElementById("generate-btn");
    
    // Tabs
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");
    
    // Compose Fields
    const recipientsList = document.getElementById("recipients-list");
    const addRecipientBtn = document.getElementById("add-recipient-btn");
    const composeSubjectInput = document.getElementById("compose-subject");
    const composeContextInput = document.getElementById("compose-context");
    const csvUpload = document.getElementById("csv-upload"); // NEW
    
    // Reply Fields
    const replyOriginalInput = document.getElementById("reply-original");
    const replyContextInput = document.getElementById("reply-context");
    
    // Shared Generation Fields
    const toneInput = document.getElementById("tone");
    const customToneWrapper = document.getElementById("custom-tone-wrapper");
    const customToneInput = document.getElementById("custom-tone");

    // --- Generated Section (Inside Form) ---
    const generatedSection = document.getElementById("generated-section");
    const generatedEmailTextarea = document.getElementById("generated-email");
    const senderInfo = document.getElementById("sender-info");
    const regenerateBtn = document.getElementById("regenerate-btn");
    const sendBtn = document.getElementById("send-btn");

    // --- Reply-specific fields in the generated section ---
    const replyFieldsWrapper = document.getElementById("reply-fields-wrapper");
    const sendSubjectInput = document.getElementById("send-subject");
    const sendRecipientsList = document.getElementById("send-recipients-list");
    const addSendRecipientBtn = document.getElementById("add-send-recipient-btn");
    const sendCsvUpload = document.getElementById("send-csv-upload"); // NEW

    // --- Popup ---
    const popup = document.getElementById("popup");
    const popupMessage = document.getElementById("popup-message");

    // --- Theme Toggle ---
    const toggleTheme = () => {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
        feather.replace();
    };

    const initTheme = () => {
        const savedTheme = localStorage.getItem("theme") || "light";
        document.documentElement.setAttribute("data-theme", savedTheme);
        feather.replace();
    };

    themeToggle.addEventListener("click", toggleTheme);
    initTheme();

    // --- Auth Functions ---
    const updateAuthUI = () => {
        if (currentUser) {
            // Logged in
            loginBtn.classList.add("hidden");
            userInfoDiv.classList.remove("hidden");
            userNameSpan.textContent = `Logged in as ${currentUser.name}`;
            senderInfo.textContent = `Email will be sent from your account: ${currentUser.email}`;
        } else {
            // Logged out
            loginBtn.classList.remove("hidden");
            userInfoDiv.classList.add("hidden");
            userNameSpan.textContent = "";
            senderInfo.textContent = "Email will be sent from the app owner."; // Default
        }
        feather.replace(); // Refresh icons
    };

    const checkLoginStatus = async () => {
        try {
            const response = await fetch("/check-auth");
            const data = await response.json();
            if (data.logged_in) {
                currentUser = data.user;
            } else {
                currentUser = null;
            }
        } catch (error) {
            console.error("Error checking auth status:", error);
            currentUser = null;
        }
        updateAuthUI();
    };

    loginBtn.addEventListener("click", () => {
        window.location.href = "/login";
    });

    logoutBtn.addEventListener("click", async () => {
        try {
            await fetch("/logout", { method: "POST" });
            currentUser = null;
            updateAuthUI();
            showPopup("Logged out successfully.", "success");
        } catch (error) {
            console.error("Error logging out:", error);
            showPopup("Logout failed.", "error");
        }
    });

    // --- Tab Switching Logic ---
    tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            const targetTab = button.getAttribute("data-tab");
            
            tabButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");
            
            tabContents.forEach(content => {
                content.id === targetTab ? content.classList.remove("hidden") : content.classList.add("hidden");
            });
            
            currentMode = targetTab === "compose-tab" ? "compose" : "reply";
            updateRequiredFields(currentMode);
            
            generatedSection.classList.add("hidden");
            popup.classList.add("hidden");
        });
    });

    // --- Dynamic 'required' attributes ---
    const updateRequiredFields = (mode) => {
        const firstComposeEmail = recipientsList.querySelector('.recipient-email');
        const firstSendEmail = sendRecipientsList.querySelector('.recipient-email');

        if (mode === 'compose') {
            composeSubjectInput.required = true;
            composeContextInput.required = true;
            if (firstComposeEmail) firstComposeEmail.required = true;

            replyOriginalInput.required = false;
            replyContextInput.required = false;
            sendSubjectInput.required = false;
            if (firstSendEmail) firstSendEmail.required = false;

        } else { // reply
            composeSubjectInput.required = false;
            composeContextInput.required = false;
            if (firstComposeEmail) firstComposeEmail.required = false;

            replyOriginalInput.required = true;
            replyContextInput.required = true;
            sendSubjectInput.required = true;
            if (firstSendEmail) firstSendEmail.required = true;
        }
    };

    // --- Dynamic Recipients (for Compose and Send) ---
    const createRecipientRow = (listElement, name = "", email = "", allowRemove = true) => {
        const rowCount = listElement.querySelectorAll('.recipient-row').length;
        if (rowCount >= 100) {
            showPopup("You can add a maximum of 100 recipients.", "error");
            return;
        }

        const row = document.createElement("div");
        row.className = "recipient-row";

        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.placeholder = "Recipient Name (Optional)";
        nameInput.className = "recipient-name";
        nameInput.value = name;

        const emailInput = document.createElement("input");
        emailInput.type = "email";
        emailInput.placeholder = "Recipient Email";
        emailInput.className = "recipient-email";
        emailInput.value = email;
        
        if (listElement === recipientsList) {
             emailInput.required = (rowCount === 0 && currentMode === "compose");
        } else {
             emailInput.required = (rowCount === 0 && currentMode === "reply");
        }


        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "icon-btn remove-recipient-btn";
        removeBtn.innerHTML = '<i data-feather="minus" style="width: 20px;"></i>';
        
        if (allowRemove) {
            removeBtn.addEventListener("click", () => {
                const isFirstRow = listElement.querySelectorAll('.recipient-row').length === 1;
                if (!isFirstRow) {
                    row.remove();
                } else {
                    nameInput.value = "";
                    emailInput.value = "";
                }
            });
        } else {
            removeBtn.disabled = true;
            removeBtn.style.opacity = "0.5";
        }

        row.appendChild(nameInput);
        row.appendChild(emailInput);
        row.appendChild(removeBtn);
        listElement.appendChild(row);

        feather.replace();
    };
    
    const getRecipientsData = (listElement) => {
        const recipients = [];
        const rows = listElement.querySelectorAll(".recipient-row");
        rows.forEach(row => {
            const name = row.querySelector(".recipient-name").value.trim();
            const email = row.querySelector(".recipient-email").value.trim();
            if (email) {
                recipients.push({ name: name, email: email });
            }
        });
        return recipients;
    };

    addRecipientBtn.addEventListener("click", () => createRecipientRow(recipientsList));
    addSendRecipientBtn.addEventListener("click", () => createRecipientRow(sendRecipientsList));

    createRecipientRow(recipientsList);
    // FIX: Removed the stray "Address," line that was here
    createRecipientRow(sendRecipientsList);
    updateRequiredFields(currentMode);

    // --- Custom Tone Visibility ---
    toneInput.addEventListener("change", () => {
        if (toneInput.value === "Custom") {
            customToneWrapper.classList.add("visible");
            customToneInput.required = true;
        } else {
            customToneWrapper.classList.remove("visible");
            customToneInput.required = false;
        }
    });

    // --- Helper: Show/Hide Loader ---
    const showLoader = (button) => {
        button.disabled = true;
        button.querySelector(".btn-text").classList.add("hidden");
        button.querySelector(".spinner").classList.remove("hidden");
    };

    const hideLoader = (button, buttonText) => {
        button.disabled = false;
        button.querySelector(".btn-text").textContent = buttonText;
        button.querySelector(".btn-text").classList.remove("hidden");
        button.querySelector(".spinner").classList.add("hidden");
    };

    // --- Helper: Show Popup ---
    let popupTimeout;
    const showPopup = (message, type = "success") => {
        popupMessage.textContent = message;
        popup.className = "popup";
        popup.classList.add(type);
        popup.classList.remove("hidden");

        if (popupTimeout) clearTimeout(popupTimeout);
        popupTimeout = setTimeout(() => popup.classList.add("hidden"), 3000);
    };

    // --- Helper: Parse Email for Reply ---
    const getReplySubjectAndSender = (originalEmail) => {
        let subject = "";
        let senderEmail = "";

        const subjectMatch = originalEmail.match(/Subject:\s*(.*)/i);
        if (subjectMatch && subjectMatch[1]) {
            subject = subjectMatch[1].trim();
            if (!subject.toLowerCase().startsWith("re:")) {
                subject = "Re: " + subject;
            }
        } else {
            subject = "Re: ";
        }

        const fromMatch = originalEmail.match(/From:.*[<(]([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)[>)]/i);
        if (fromMatch && fromMatch[1]) {
            senderEmail = fromMatch[1].trim();
        } else {
            const emailMatch = originalEmail.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
            if (emailMatch && emailMatch[1]) {
                senderEmail = emailMatch[1];
            }
        }
        return { subject, senderEmail };
    }

    // --- Event Listener: Generate Email ---
    emailForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        showLoader(generateBtn);
        
        const selectedTone = toneInput.value;
        const finalTone = selectedTone === "Custom" ? customToneInput.value : selectedTone;
        let formData = {
            mode: currentMode,
            tone: finalTone
        };
        
        if (currentMode === 'compose') {
            replyFieldsWrapper.classList.add("hidden");
            formData = {
                ...formData,
                recipients: getRecipientsData(recipientsList),
                subject: composeSubjectInput.value,
                context: composeContextInput.value
            };
        } else { // reply
            const { subject, senderEmail } = getReplySubjectAndSender(replyOriginalInput.value);
            replyFieldsWrapper.classList.remove("hidden");
            sendSubjectInput.value = subject;
            
            sendRecipientsList.innerHTML = "";
            if (senderEmail) {
                createRecipientRow(sendRecipientsList, "", senderEmail, true);
            } else {
                createRecipientRow(sendRecipientsList, "", "", true);
            }
            updateRequiredFields('reply');

            formData = {
                ...formData,
                recipients: getRecipientsData(sendRecipientsList),
                subject: subject,
                original_email: replyOriginalInput.value,
                reply_context: replyContextInput.value
            };
        }

        try {
            const response = await fetch("/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!response.ok) throw new Error("Network response was not ok.");
            const data = await response.json();
            
            if (data.error) {
                showPopup(data.error, "error");
            } else {
                generatedEmailTextarea.value = data.generated_email;
                updateAuthUI();
                generatedSection.classList.remove("hidden");
                generatedSection.scrollIntoView({ behavior: "smooth" });
            }

        } catch (error) {
            console.error("Error generating email:", error);
            showPopup("Failed to generate email. Please try again.", "error");
        } finally {
            hideLoader(generateBtn, "Generate Email");
        }
    });

    // --- Event Listener: Regenerate ---
    regenerateBtn.addEventListener("click", () => {
        emailForm.dispatchEvent(new Event("submit"));
    });

    // --- Event Listener: Send Email ---
    sendBtn.addEventListener("click", async () => {
        showLoader(sendBtn);

        let recipients;
        let subject;
        const body = generatedEmailTextarea.value;

        if (currentMode === 'compose') {
            recipients = getRecipientsData(recipientsList);
            subject = composeSubjectInput.value;
        } else { // reply
            recipients = getRecipientsData(sendRecipientsList);
            subject = sendSubjectInput.value;
        }

        if (recipients.length === 0 || recipients[0].email === "") {
            showPopup("Please add at least one recipient email.", "error");
            hideLoader(sendBtn, "Send Email");
            (currentMode === 'compose' ? recipientsList : sendRecipientsList).querySelector('.recipient-email').focus();
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalidEmails = recipients
            .map(r => r.email)
            .filter(email => email && !emailRegex.test(email)); 
        if (invalidEmails.length > 0) {
            showPopup(`Invalid email format for: ${invalidEmails.join(', ')}`, "error");
            hideLoader(sendBtn, "Send Email");
            return;
        }
        if (!subject) {
             showPopup("Subject is required.", "error");
             hideLoader(sendBtn, "Send Email");
             (currentMode === 'compose' ? composeSubjectInput : sendSubjectInput).focus();
             return;
        }
        if (!body) {
            showPopup("Email body cannot be empty.", "error");
            hideLoader(sendBtn, "Send Email");
            generatedEmailTextarea.focus();
            return;
        }
        
        const emailData = {
            recipients: recipients, 
            subject: subject,
            body: body,
        };

        const sendUrl = currentUser ? "/send-oauth-email" : "/send-email";

        try {
            const response = await fetch(sendUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(emailData),
            });
            const data = await response.json();
            if (data.status === "success") {
                const sender = data.sender || (currentUser ? currentUser.email : "the app owner");
                showPopup(`Email sent successfully from ${sender}!`, "success");
                generatedSection.classList.add("hidden");
            } else {
                showPopup(`Error: ${data.message}`, "error");
            }
        } catch (error) {
            console.error("Error sending email:", error);
            showPopup("Failed to send email. Check console for details.", "error");
        } finally {
            hideLoader(sendBtn, "Send Email");
        }
    });
    
    // --- Initial Check on Page Load ---
    checkLoginStatus();

    // --- NEW: CSV UPLOAD LOGIC ---

    const handleCsvUpload = (event, targetListElement) => {
        const file = event.target.files[0];
        if (!file) return;

        if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
            showPopup("Error: Please upload a valid .csv file.", "error");
            event.target.value = null; // Reset file input
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            try {
                const recipients = parseCsv(text);
                if (recipients.length === 0) {
                    showPopup("Error: CSV is empty or headers are incorrect.", "error");
                    return;
                }

                // Clear the existing list
                targetListElement.innerHTML = "";
                
                // Populate with new data
                recipients.forEach(recipient => {
                    // Always allow removal for imported rows
                    createRecipientRow(targetListElement, recipient.name, recipient.email, true);
                });

                // Ensure 'required' is set correctly after import
                updateRequiredFields(currentMode);
                
                showPopup(`Successfully imported ${recipients.length} recipients.`, "success");

            } catch (error) {
                showPopup(`Error parsing CSV: ${error.message}`, "error");
            } finally {
                event.target.value = null; // Reset file input
            }
        };
        reader.readAsText(file);
    };

    const parseCsv = (csvText) => {
        const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== "");
        if (lines.length < 2) return []; // Need at least header + 1 data row

        // Handle commas inside quotes during split
        const splitCsvRow = (row) => {
            const result = [];
            let current = '';
            let inQuote = false;
            for (let i = 0; i < row.length; i++) {
                const char = row[i];
                if (char === '"' && (i === 0 || row[i-1] !== '\\')) {
                    inQuote = !inQuote;
                } else if (char === ',' && !inQuote) {
                    result.push(current.trim().replace(/^"|"$/g, ''));
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim().replace(/^"|"$/g, ''));
            return result;
        };

        const header = splitCsvRow(lines[0]).map(h => h.trim().toLowerCase());
        const nameIndex = header.indexOf('name');
        const emailIndex = header.indexOf('email');

        if (emailIndex === -1) {
            throw new Error("CSV must contain an 'Email' column.");
        }

        const recipients = [];
        for (let i = 1; i < lines.length; i++) {
            const values = splitCsvRow(lines[i]);
            if (values.length <= emailIndex) continue; // Skip malformed rows

            const email = values[emailIndex] ? values[emailIndex].trim() : "";
            const name = (nameIndex !== -1 && values[nameIndex]) ? values[nameIndex].trim() : "";

            if (email) {
                recipients.push({ name, email });
            }
        }
        return recipients;
    };

    // Add event listeners for both CSV upload buttons
    csvUpload.addEventListener("change", (e) => handleCsvUpload(e, recipientsList));
    sendCsvUpload.addEventListener("change", (e) => handleCsvUpload(e, sendRecipientsList));

});