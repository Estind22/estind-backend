import { google } from "googleapis";

/**
 * Create OAuth client
 */
export const getOAuthClient = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_AUTH_CLIENT_ID,
    process.env.GOOGLE_AUTH_CLIENT_SECRET,
    process.env.GOOGLE_AUTH_REDIRECT_URI
  );
};

/**
 * Generate Google OAuth URL (popup friendly)
 */
export const generateGoogleAuthUrl = ({ state, scopes }) => {
  const oauth2Client = getOAuthClient();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
    state
  });
};

/**
 * Exchange code → tokens
 */
export const getTokensFromCode = async (code) => {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};

/**
 * Get Google user info (email)
 */
export const getGoogleUserInfo = async (oauthClient) => {
  const oauth2 = google.oauth2({
    version: "v2",
    auth: oauthClient
  });

  const { data } = await oauth2.userinfo.get();
  return data;
};

