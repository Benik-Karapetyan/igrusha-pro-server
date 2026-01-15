const sgMail = require("@sendgrid/mail");
const config = require("config");

sgMail.setApiKey(config.get("sendGridApiKey"));

const sendVerificationEmail = async (email, verificationCode) => {
  const msg = {
    to: email,
    from: config.get("emailFrom"),
    subject: "Verify Your Email - igrusha.pro",
    text: `Hello Dear User,\n\nThank you for registering at igrusha.pro!\n\nTo complete your registration, enter this verification code in the app:\n\n${verificationCode}\n\nThis code will expire in 24 hours.\n\nIf you didn't create an account, please ignore this email.\n\nBest regards,\nigrusha.pro Team`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #4CAF50;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              margin: 20px 0;
              background-color: #4CAF50;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
            }
            .footer {
              margin-top: 20px;
              text-align: center;
              color: #777;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to igrusha.pro!</h1>
            </div>
            <div class="content">
              <p>Hello Dear User,</p>
              <p>Thank you for registering at <strong>igrusha.pro</strong>!</p>
              <p>To complete your registration, enter this verification code in the app:</p>
              <div style="text-align: center;">
                <div
                  style="
                    display: inline-block;
                    padding: 12px 24px;
                    margin: 16px 0;
                    background-color: #ffffff;
                    border: 1px dashed #4CAF50;
                    border-radius: 6px;
                    font-size: 20px;
                    font-weight: bold;
                    letter-spacing: 2px;
                    color: #4CAF50;
                  "
                >
                  ${verificationCode}
                </div>
              </div>
              <p><strong>Note:</strong> This verification code will expire in 24 hours.</p>
              <p>If you didn't create an account with us, please ignore this email.</p>
              <p>Best regards,<br>The igrusha.pro Team</p>
            </div>
            <div class="footer">
              <p>&copy; 2026 igrusha.pro. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error("Error sending verification email:", error);
    if (error.response) {
      console.error("SendGrid error details:", error.response.body);
    }
    throw new Error("Failed to send verification email");
  }
};

const sendPasswordResetEmail = async (email, resetToken, userName) => {
  const frontendUrl = config.get("frontendUrl");
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

  const msg = {
    to: email,
    from: config.get("emailFrom"),
    subject: "Password Reset Request - igrusha.pro",
    text: `Hello ${userName},\n\nYou requested to reset your password.\n\nClick the link below to reset your password:\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nigrusha.pro Team`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #FF5722;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              margin: 20px 0;
              background-color: #FF5722;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
            }
            .footer {
              margin-top: 20px;
              text-align: center;
              color: #777;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              <p>We received a request to reset your password for your <strong>igrusha.pro</strong> account.</p>
              <p>Click the button below to reset your password:</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #FF5722;">${resetUrl}</p>
              <p><strong>Note:</strong> This link will expire in 1 hour.</p>
              <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
              <p>Best regards,<br>The igrusha.pro Team</p>
            </div>
            <div class="footer">
              <p>&copy; 2026 igrusha.pro. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    if (error.response) {
      console.error("SendGrid error details:", error.response.body);
    }
    throw new Error("Failed to send password reset email");
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
