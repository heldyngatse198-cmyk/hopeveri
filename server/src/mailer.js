const nodemailer = require('nodemailer');

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM,
  FRONTEND_URL,
} = process.env;

let transporterPromise = null;

async function initTransporter() {
  if (transporterPromise) return transporterPromise;

  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT),
        secure: SMTP_SECURE === 'true' || SMTP_SECURE === '1',
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      })
    );
  } else {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Les variables SMTP_HOST, SMTP_PORT, SMTP_USER et SMTP_PASS doivent être définies en production.');
    }

    transporterPromise = nodemailer.createTestAccount().then((testAccount) => {
      console.warn('Aucun SMTP configuré, utilisation d’un compte Nodemailer Ethereal pour le développement.');
      return nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    });
  }

  return transporterPromise;
}

function getFrontendUrl() {
  return (FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
}

async function sendConfirmationEmail(email, token) {
  const transporter = await initTransporter();
  const confirmUrl = `${getFrontendUrl()}/confirm-email?token=${encodeURIComponent(token)}`;
  const subject = 'Confirmez votre email HopeVeri';
  const text = `Bonjour,

Merci de vous être inscrit(e) sur HopeVeri.

Veuillez confirmer votre adresse email en cliquant sur le lien suivant :
${confirmUrl}

Ce lien expire dans 24 heures.

Si vous n'avez pas demandé cet enregistrement, ignorez cet e-mail.
`;
  const html = `<p>Bonjour,</p>
<p>Merci de vous être inscrit(e) sur <strong>HopeVeri</strong>.</p>
<p>Cliquez sur le lien ci-dessous pour confirmer votre adresse email :</p>
<p><a href="${confirmUrl}">${confirmUrl}</a></p>
<p>Ce lien expire dans 24 heures.</p>
<p>Si vous n'avez pas demandé cet enregistrement, ignorez cet email.</p>`;

  const info = await transporter.sendMail({
    from: EMAIL_FROM || SMTP_USER || 'no-reply@hopeveri.com',
    to: email,
    subject,
    text,
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log('Email de confirmation envoyé (aperçu Ethereal) :', previewUrl);
  }
}

module.exports = { sendConfirmationEmail };
