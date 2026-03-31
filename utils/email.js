const sgMail = require("@sendgrid/mail");
const config = require("config");
const winston = require("winston");

sgMail.setApiKey(config.get("sendGridApiKey"));

const SUPPORTED_LOCALES = ["am", "ru", "en"];

const normalizeLocale = (locale = "am") => {
  if (typeof locale !== "string") return "am";

  const baseLocale = locale.toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LOCALES.includes(baseLocale) ? baseLocale : "am";
};

const EMAIL_COPY_BY_LOCALE = {
  am: {
    verification: {
      subject: "Հաստատեք Ձեր Էլ. Փոստը",
      title: "Բարի Գալուստ Igrusha Pro!",
      greeting: "Բարև Սիրելի Օգտատեր,",
      thanks: "Շնորհակալություն igrusha.pro կայքում գրանցվելու համար։",
      instruction:
        "Գրանցումն ավարտելու համար կայքում մուտքագրեք այս հաստատման կոդը՝",
      noteLabel: "Նշում:",
      noteText: "Այս հաստատման կոդը գործում է 24 ժամ։",
      ignore: "Եթե դուք հաշիվ չեք ստեղծել, պարզապես անտեսեք այս նամակը։",
      regards: "Հարգանքով,",
      team: "igrusha.pro թիմ",
      text: (verificationCode) =>
        `Բարև Սիրելի Օգտատեր,\n\nՇնորհակալություն igrusha.pro կայքում գրանցվելու համար։\n\nԳրանցումն ավարտելու համար կայքում մուտքագրեք այս հաստատման կոդը՝\n\n${verificationCode}\n\nԱյս հաստատման կոդը գործում է 24 ժամ։\n\nԵթե դուք հաշիվ չեք ստեղծել, պարզապես անտեսեք այս նամակը։\n\nՀարգանքով,\nigrusha.pro թիմ`,
    },
    reset: {
      subject: "Գաղտնաբառի վերականգնման հարցում",
      title: "Գաղտնաբառի Վերականգնման Հարցում",
      greeting: "Բարև Սիրելի Օգտատեր,",
      intro:
        "Մենք ստացանք ձեր <strong>igrusha.pro</strong> հաշվի գաղտնաբառի վերականգնման հարցում։",
      instruction: "Կայքում մուտքագրեք այս վերականգնման կոդը՝",
      noteLabel: "Նշում:",
      noteText: "Այս կոդը գործում է 1 ժամ։",
      ignore:
        "Եթե դուք գաղտնաբառի վերականգնում չեք պահանջել, պարզապես անտեսեք այս նամակը։ Ձեր գաղտնաբառը չի փոխվի։",
      regards: "Հարգանքով,",
      team: "igrusha.pro թիմ",
      text: (resetToken) =>
        `Բարև Սիրելի Օգտատեր,\n\nՄենք ստացանք ձեր igrusha.pro հաշվի գաղտնաբառի վերականգնման հարցում։\n\nԿայքում մուտքագրեք այս վերականգնման կոդը՝\n\n${resetToken}\n\nԱյս կոդը գործում է 1 ժամ։\n\nԵթե դուք գաղտնաբառի վերականգնում չեք պահանջել, պարզապես անտեսեք այս նամակը։ Ձեր գաղտնաբառը չի փոխվի։\n\nՀարգանքով,\nigrusha.pro թիմ`,
    },
  },
  ru: {
    verification: {
      subject: "Подтвердите Вашу Эл. Почту",
      title: "Добро пожаловать в Igrusha Pro!",
      greeting: "Здравствуйте, Дорогой Пользователь,",
      thanks: "Спасибо за регистрацию на сайте igrusha.pro!",
      instruction:
        "Чтобы завершить регистрацию, введите этот код подтверждения на сайте:",
      noteLabel: "Примечание:",
      noteText: "Этот код подтверждения действителен 24 часа.",
      ignore:
        "Если вы не создавали аккаунт, пожалуйста, проигнорируйте это письмо.",
      regards: "С уважением,",
      team: "Команда igrusha.pro",
      text: (verificationCode) =>
        `Здравствуйте, Дорогой Пользователь,\n\nСпасибо за регистрацию на сайте igrusha.pro!\n\nЧтобы завершить регистрацию, введите этот код подтверждения на сайте:\n\n${verificationCode}\n\nЭтот код подтверждения действителен 24 часа.\n\nЕсли вы не создавали аккаунт, пожалуйста, проигнорируйте это письмо.\n\nС уважением,\nКоманда igrusha.pro`,
    },
    reset: {
      subject: "Запрос на сброс пароля",
      title: "Запрос на сброс пароля",
      greeting: "Здравствуйте, Дорогой Пользователь,",
      intro:
        "Мы получили запрос на сброс пароля для вашего аккаунта <strong>igrusha.pro</strong>.",
      instruction: "Введите этот код сброса на сайте:",
      noteLabel: "Примечание:",
      noteText: "Этот код действителен 1 час.",
      ignore:
        "Если вы не запрашивали сброс пароля, пожалуйста, проигнорируйте это письмо. Ваш пароль останется без изменений.",
      regards: "С уважением,",
      team: "Команда igrusha.pro",
      text: (resetToken) =>
        `Здравствуйте, Дорогой Пользователь,\n\nМы получили запрос на сброс пароля для вашего аккаунта igrusha.pro.\n\nВведите этот код сброса на сайте:\n\n${resetToken}\n\nЭтот код действителен 1 час.\n\nЕсли вы не запрашивали сброс пароля, пожалуйста, проигнорируйте это письмо. Ваш пароль останется без изменений.\n\nС уважением,\nКоманда igrusha.pro`,
    },
  },
  en: {
    verification: {
      subject: "Verify Your Email",
      title: "Welcome to Igrusha Pro!",
      greeting: "Hello Dear User,",
      thanks: "Thank you for registering on the igrusha.pro website!",
      instruction:
        "To complete your registration, enter this verification code on the website:",
      noteLabel: "Note:",
      noteText: "This verification code will expire in 24 hours.",
      ignore:
        "If you didn't create an account with us, please ignore this email.",
      regards: "Best regards,",
      team: "The igrusha.pro Team",
      text: (verificationCode) =>
        `Hello Dear User,\n\nThank you for registering on the igrusha.pro website!\n\nTo complete your registration, enter this verification code on the website:\n\n${verificationCode}\n\nThis verification code will expire in 24 hours.\n\nIf you didn't create an account with us, please ignore this email.\n\nBest regards,\nThe igrusha.pro Team`,
    },
    reset: {
      subject: "Password Reset Request",
      title: "Password Reset Request",
      greeting: "Hello Dear User,",
      intro:
        "We received a request to reset your password for your <strong>igrusha.pro</strong> account.",
      instruction: "Enter this reset code on the website:",
      noteLabel: "Note:",
      noteText: "This code will expire in 1 hour.",
      ignore:
        "If you didn't request a password reset, please ignore this email. Your password will remain unchanged.",
      regards: "Best regards,",
      team: "The igrusha.pro Team",
      text: (resetToken) =>
        `Hello Dear User,\n\nWe received a request to reset your password for your igrusha.pro account.\n\nEnter this reset code on the website:\n\n${resetToken}\n\nThis code will expire in 1 hour.\n\nIf you didn't request a password reset, please ignore this email. Your password will remain unchanged.\n\nBest regards,\nThe igrusha.pro Team`,
    },
  },
};

const sendVerificationEmail = async (
  email,
  verificationCode,
  locale = "am"
) => {
  const selectedLocale = normalizeLocale(locale);
  const localizedVerificationEmail =
    EMAIL_COPY_BY_LOCALE[selectedLocale].verification;

  const msg = {
    to: email,
    from: { email: config.get("emailFrom"), name: "Igrusha Pro" },
    subject: localizedVerificationEmail.subject,
    text: localizedVerificationEmail.text(verificationCode),
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
              color: #ffffff !important;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 5px 5px;
              font-size: 16px;
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
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${localizedVerificationEmail.title}</h1>
            </div>
            <div class="content">
              <p>${localizedVerificationEmail.greeting}</p>
              <p>${localizedVerificationEmail.thanks}</p>
              <p>${localizedVerificationEmail.instruction}</p>
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
              <p><strong>${localizedVerificationEmail.noteLabel}</strong> ${localizedVerificationEmail.noteText}</p>
              <p>${localizedVerificationEmail.ignore}</p>
              <p>${localizedVerificationEmail.regards}<br>${localizedVerificationEmail.team}</p>
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
  } catch (error) {
    winston.error("SendGrid verification email failed", {
      message: error.message,
      statusCode: error.response?.statusCode || error.code,
      errors: error.response?.body?.errors,
      to: email,
      from: config.get("emailFrom"),
    });
    throw new Error("Failed to send verification email");
  }
};

const sendPasswordResetEmail = async (email, resetToken, locale = "am") => {
  const selectedLocale = normalizeLocale(locale);
  const localizedResetEmail = EMAIL_COPY_BY_LOCALE[selectedLocale].reset;

  const msg = {
    to: email,
    from: { email: config.get("emailFrom"), name: "Igrusha Pro" },
    subject: localizedResetEmail.subject,
    text: localizedResetEmail.text(resetToken),
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
              <h1>${localizedResetEmail.title}</h1>
            </div>
            <div class="content">
              <p>${localizedResetEmail.greeting}</p>
              <p>${localizedResetEmail.intro}</p>
              <p>${localizedResetEmail.instruction}</p>
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
                  ${resetToken}
                </div>
              </div>
              <p><strong>${localizedResetEmail.noteLabel}</strong> ${localizedResetEmail.noteText}</p>
              <p>${localizedResetEmail.ignore}</p>
              <p>${localizedResetEmail.regards}<br>${localizedResetEmail.team}</p>
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
  } catch (error) {
    winston.error("SendGrid password reset email failed", {
      message: error.message,
      statusCode: error.response?.statusCode || error.code,
      errors: error.response?.body?.errors,
      to: email,
      from: config.get("emailFrom"),
    });
    throw new Error("Failed to send password reset email");
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
