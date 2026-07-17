# Mentor AI Studio — Authentication System

## Overview

Complete OTP-based email authentication with support for Email + Password, Google OAuth, JWT refresh token rotation, and Argon2 password hashing.

## Gmail SMTP Configuration

To enable real email sending (verification codes, password resets, welcome emails):

1. **Enable 2-Factor Authentication** on your Google Account:  
   https://myaccount.google.com/security

2. **Generate an App Password**:  
   https://myaccount.google.com/apppasswords  
   - Select app: **Mail**  
   - Select device: **Other** (name it "Mentor AI Studio")  
   - Copy the 16-character password shown

3. **Edit** `backend/.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your.email@gmail.com
   SMTP_PASSWORD=the-16-char-app-password
   SMTP_FROM_EMAIL=your.email@gmail.com
   SMTP_FROM_NAME=Mentor AI Studio
   ```

4. **Test**: registration OTP emails will now be delivered to the recipient's inbox.

To disable real sending (development), set:
```
SMTP_HOST=mock
```
This logs all email content to the console instead of sending.

## Google OAuth Configuration

1. Go to https://console.cloud.google.com/apis/credentials
2. Create a **new OAuth 2.0 Client ID** of type **Web application**
3. Add **Authorized JavaScript origins**: `http://localhost:5173`
4. Add **Authorized redirect URIs**:  
   `http://localhost:8000/api/v1/auth/callback/google`
5. Copy the **Client ID** and **Client Secret** into `backend/.env`:
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

## Running Locally

### Prerequisites
- Python 3.11+
- Node.js 18+

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate    # Windows
pip install -r requirements.txt
cp .env.example .env     # Edit .env with your config
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env     # Edit if needed (VITE_API_BASE_URL)
npm run dev              # Starts on port 5173
```

### Verification
1. Open http://localhost:5173
2. Click **Create Account** → register with email + password
3. Check console (mock SMTP) or inbox (real SMTP) for the 6-digit OTP
4. Enter OTP → auto-login → redirected to Home
5. Test **Forgot Password** → OTP emailed → reset password → login
6. Test **Google Sign In** (if configured)

## Production Deployment

### Security Checklist
- [ ] Generate strong JWT secrets: `python -c "import secrets; print(secrets.token_urlsafe(48))"`
- [ ] Set `SECURE_COOKIES=true` in `.env`
- [ ] Use PostgreSQL instead of SQLite
- [ ] Enable HTTPS (behind nginx/Caddy/Cloudflare)
- [ ] Configure real Gmail SMTP with App Password
- [ ] Set `SMTP_HOST` to a real SMTP server (not `mock`)

### Environment Variables
All configuration is read from environment variables or `.env`. Key production settings:

| Variable | Production Value |
|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/dbname` |
| `JWT_SECRET` | `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `JWT_REFRESH_SECRET` | (different from JWT_SECRET) |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SECURE_COOKIES` | `true` |
| `CORS_ORIGINS` | `["https://yourdomain.com"]` |

### Database
SQLite is auto-created on startup. For PostgreSQL, set `DATABASE_URL` and the tables are auto-created via `Base.metadata.create_all()`.

## Auth Flow Summary

```
Register → OTP emailed → Verify OTP → Auto-login → Welcome email
Login    → JWT issued → Authenticated
Google   → OAuth callback → Auto-login (email pre-verified)
Forgot   → OTP emailed → Verify OTP → Reset password → Notification email
Logout   → Revoke refresh token → Deactivate session
```

## Security

- **Passwords**: Argon2 (memory-hard, GPU-resistant)
- **OTP**: Argon2-hashed before storage, never stored in plaintext
- **OTP limits**: 5 verify attempts max, 3 resend attempts max, 60s resend cooldown
- **OTP expiry**: 10 minutes, auto-deleted after use or expiry
- **JWT**: HS256, access = 60 min, refresh = 7 days, rotation on every refresh
- **Session logout**: Only the current session is invalidated (not all sessions)
- **Rate limiting**: Auth endpoints: 3-10 requests/minute depending on sensitivity
- **Audit logging**: All auth events (register, login, OTP verify, logout) are logged with AUDIT prefix
