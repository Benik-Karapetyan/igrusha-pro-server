# Email Verification System - Setup Guide

## 🎉 What Was Implemented

A complete email verification system has been added to your igrusha-pro server with the following features:

### ✅ Completed Features:

1. **User Model Updates**

   - Added `isVerified` field (boolean)
   - Added `verificationToken` field (string)
   - Added `verificationTokenExpiry` field (date)

2. **Email Service** (`utils/email.js`)

   - SendGrid integration
   - Beautiful HTML email templates
   - Verification email function
   - Password reset email function (for future use)

3. **Modified Sign-Up Flow**

   - Generates unique verification token on registration
   - Sends verification email automatically
   - Does NOT auto-login user (requires email verification first)
   - Deletes user if email fails to send

4. **New Endpoints**

   - `GET /api/auth/verify-email?token=xxx` - Verify email with token
   - `POST /api/auth/resend-verification` - Resend verification email

5. **Modified Sign-In Flow**
   - Checks if user's email is verified
   - Blocks unverified users from signing in
   - Returns helpful error message with `emailNotVerified` flag

---

## 🚀 Setup Instructions

### Step 1: Install Dependencies

Run this command to install the SendGrid package:

```bash
pnpm install
```

This will install `@sendgrid/mail` which has been added to your `package.json`.

---

### Step 2: Create SendGrid Account

1. Go to [SendGrid.com](https://sendgrid.com)
2. Sign up for a **free account** (no credit card required)
3. Verify your email address

---

### Step 3: Get SendGrid API Key

1. Log in to SendGrid dashboard
2. Go to **Settings** → **API Keys**
3. Click **Create API Key**
4. Name it: `igrusha-pro-server`
5. Select **Full Access** permissions
6. Click **Create & View**
7. **COPY THE API KEY** (you won't see it again!)

---

### Step 4: Verify Your Sender Email

**Important:** SendGrid requires you to verify the email address you'll send from.

#### Option A: Single Sender Verification (Easiest for Testing)

1. Go to **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Add email: `noreply@igrusha.pro` (or any email you control)
4. Fill in the form
5. Check your email and click the verification link

#### Option B: Domain Authentication (Best for Production)

1. Go to **Settings** → **Sender Authentication**
2. Click **Authenticate Your Domain**
3. Follow the steps to add DNS records to your domain
4. This allows you to send from any email @ igrusha.pro

---

### Step 5: Set Environment Variables

You need to set these environment variables:

```bash
export igrusha_pro_sendGridApiKey="YOUR_SENDGRID_API_KEY_HERE"
export igrusha_pro_emailFrom="noreply@igrusha.pro"
export igrusha_pro_frontendUrl="http://localhost:3000"
```

**For production**, set these in your hosting environment:

- Heroku: `heroku config:set igrusha_pro_sendGridApiKey=xxx`
- AWS: Set in environment variables
- Docker: Add to docker-compose.yml

---

### Step 6: Update Frontend URL

Update `config/development.json` if your frontend runs on a different port:

```json
{
  "frontendUrl": "http://localhost:3000"
}
```

For production, set the environment variable:

```bash
export igrusha_pro_frontendUrl="https://igrusha.pro"
```

---

## 📧 How It Works

### User Registration Flow:

1. **User submits registration**

   ```
   POST /api/auth/sign-up
   {
     "firstName": "John",
     "lastName": "Doe",
     "email": "user@example.com",
     "phone": "123456789012",
     "password": "SecurePass123!",
     "termsAndConditions": true
   }
   ```

2. **Server response:**

   ```json
   {
     "message": "Registration successful! Please check your email to verify your account.",
     "email": "user@example.com"
   }
   ```

3. **User receives email** with verification link:

   ```
   http://localhost:3000/verify-email?token=abc123...
   ```

4. **User clicks link** → Frontend calls:

   ```
   GET /api/auth/verify-email?token=abc123...
   ```

5. **Server verifies** and responds:

   ```json
   {
     "message": "Email verified successfully! You can now sign in.",
     "verified": true
   }
   ```

6. **User can now sign in**

---

### Sign-In with Unverified Email:

If user tries to sign in without verifying:

```
POST /api/auth/sign-in
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

Response (403 Forbidden):

```json
{
  "message": "Please verify your email before signing in. Check your inbox for the verification link.",
  "emailNotVerified": true
}
```

---

### Resend Verification Email:

If user didn't receive the email:

```
POST /api/auth/resend-verification
{
  "email": "user@example.com"
}
```

Response:

```json
{
  "message": "Verification email has been resent. Please check your inbox."
}
```

---

## 🎨 Email Template

The verification email includes:

- Professional HTML design
- Clear call-to-action button
- Plaintext fallback
- 24-hour expiration notice
- igrusha.pro branding

Preview:

```
┌─────────────────────────────────┐
│   Welcome to igrusha.pro!       │
├─────────────────────────────────┤
│                                 │
│ Hello John,                     │
│                                 │
│ Thank you for registering!      │
│                                 │
│   [Verify Email Address]        │
│                                 │
│ Link expires in 24 hours        │
│                                 │
└─────────────────────────────────┘
```

---

## 🧪 Testing

### Test the Complete Flow:

1. **Start your server:**

   ```bash
   export igrusha_pro_sendGridApiKey="your-key"
   export igrusha_pro_emailFrom="noreply@igrusha.pro"
   export igrusha_pro_frontendUrl="http://localhost:3000"
   nodemon
   ```

2. **Register a new user:**

   ```bash
   curl -X POST http://localhost:3001/api/auth/sign-up \
     -H "Content-Type: application/json" \
     -d '{
       "firstName": "Test",
       "lastName": "User",
       "email": "your-real-email@example.com",
       "phone": "123456789012",
       "password": "Test1234!",
       "termsAndConditions": true
     }'
   ```

3. **Check your email inbox** for verification email

4. **Copy the token** from the email link

5. **Verify email:**

   ```bash
   curl http://localhost:3001/api/auth/verify-email?token=YOUR_TOKEN_HERE
   ```

6. **Try to sign in:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/sign-in \
     -H "Content-Type: application/json" \
     -d '{
       "email": "your-real-email@example.com",
       "password": "Test1234!"
     }'
   ```

---

## 🛠️ Frontend Integration

### 1. Update Registration Flow

After sign-up, show a message:

```jsx
"Registration successful! We've sent a verification email to {email}.
Please check your inbox and click the verification link."
```

### 2. Create Verification Page

Create a page at `/verify-email` that:

- Gets the `token` from URL query params
- Calls `GET /api/auth/verify-email?token={token}`
- Shows success or error message

Example (React):

```jsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying");
  const token = searchParams.get("token");

  useEffect(() => {
    if (token) {
      fetch(`/api/auth/verify-email?token=${token}`)
        .then((res) => res.json())
        .then((data) => {
          setStatus("success");
        })
        .catch((err) => {
          setStatus("error");
        });
    }
  }, [token]);

  if (status === "verifying") return <div>Verifying your email...</div>;
  if (status === "success")
    return <div>✅ Email verified! You can now sign in.</div>;
  return <div>❌ Verification failed. Please try again.</div>;
}
```

### 3. Handle Unverified Sign-In

When sign-in returns 403 with `emailNotVerified`:

```jsx
if (response.status === 403 && data.emailNotVerified) {
  showMessage("Please verify your email first. Check your inbox.");
  showResendButton(); // Allow user to resend verification
}
```

### 4. Add Resend Verification Button

```jsx
function resendVerification(email) {
  fetch("/api/auth/resend-verification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
    .then((res) => res.json())
    .then((data) => {
      showMessage(data.message);
    });
}
```

---

## 🔒 Security Features

- ✅ Tokens are cryptographically secure (32 random bytes)
- ✅ Tokens expire after 24 hours
- ✅ Tokens are single-use (deleted after verification)
- ✅ User is deleted if email fails to send
- ✅ Prevents sign-in without verification
- ✅ No sensitive data in email links

---

## 📊 Database Changes

Existing users in your database will have `isVerified: false` by default. You have two options:

### Option 1: Verify All Existing Users (Recommended for Development)

```javascript
// Run this in MongoDB shell or create a migration script
db.users.updateMany(
  { isVerified: { $exists: false } },
  { $set: { isVerified: true } }
);
```

### Option 2: Force Existing Users to Verify

They'll need to use the "resend verification" endpoint.

---

## 🐛 Troubleshooting

### "Failed to send verification email"

- Check SendGrid API key is correct
- Verify sender email is verified in SendGrid
- Check SendGrid dashboard for error details

### "Invalid or expired verification token"

- Token might have expired (24 hours)
- User should request a new verification email
- Check token wasn't modified

### Emails going to spam

- Complete domain authentication in SendGrid
- Use a professional "from" address
- Avoid spam trigger words in email content

### Environment variables not loading

- Make sure to restart nodemon after setting env vars
- Check variable names match: `igrusha_pro_sendGridApiKey`
- For production, set in hosting provider's dashboard

---

## 🎯 Next Steps

1. ✅ Install dependencies: `pnpm install`
2. ✅ Create SendGrid account
3. ✅ Get API key
4. ✅ Verify sender email
5. ✅ Set environment variables
6. ✅ Test with a real email
7. ⏭️ Update your frontend to handle verification flow
8. ⏭️ Deploy to production with production environment variables

---

## 📝 API Endpoints Summary

| Method | Endpoint                           | Description                                 | Auth Required |
| ------ | ---------------------------------- | ------------------------------------------- | ------------- |
| POST   | `/api/auth/sign-up`                | Register new user, sends verification email | No            |
| GET    | `/api/auth/verify-email?token=xxx` | Verify email with token                     | No            |
| POST   | `/api/auth/resend-verification`    | Resend verification email                   | No            |
| POST   | `/api/auth/sign-in`                | Sign in (requires verified email)           | No            |
| GET    | `/api/auth/me`                     | Get current user                            | Yes           |

---

## 🎨 Customization

### Change Email Template

Edit `utils/email.js` → `sendVerificationEmail` function

### Change Token Expiry Time

Default is 24 hours. Change in:

- `routes/auth.js` line 128: `24 * 60 * 60 * 1000`
- `routes/auth.js` line 101: `24 * 60 * 60 * 1000`

### Change Sender Email

Update environment variable:

```bash
export igrusha_pro_emailFrom="support@igrusha.pro"
```

---

## 💰 SendGrid Pricing Reminder

- **Free:** 100 emails/day (3,000/month) - Perfect for starting
- **If you need more:** Consider AWS SES for better pricing at scale

---

## ✅ Checklist

Before going to production:

- [ ] SendGrid account created
- [ ] Domain authentication completed (not just single sender)
- [ ] Production environment variables set
- [ ] Frontend verification page created
- [ ] Frontend handles unverified sign-in
- [ ] Tested complete flow end-to-end
- [ ] Existing users migrated or verified
- [ ] Email templates reviewed and approved
- [ ] Monitoring/logging in place for email failures

---

## 🆘 Need Help?

Common issues and solutions documented above. If you encounter other issues:

1. Check SendGrid dashboard for email delivery logs
2. Check server console for error messages
3. Verify all environment variables are set correctly
4. Test with a real email address (not a temporary one)

---

**You're all set!** 🎉

The email verification system is fully implemented and ready to use. Just complete the setup steps above and you'll be sending verification emails in no time!
