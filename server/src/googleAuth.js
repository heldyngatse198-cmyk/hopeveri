const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '');

async function verifyGoogleToken(idToken) {
  if (!idToken) {
    throw new Error('Token Google manquant');
  }

  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID || '',
  });

  const payload = ticket.getPayload();
  return {
    email: payload?.email,
    name: payload?.name,
    picture: payload?.picture,
    sub: payload?.sub,
  };
}

module.exports = { verifyGoogleToken };
