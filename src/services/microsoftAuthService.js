import axios from "axios";
import qs from "qs";

export const AUTH_BASE = "https://login.microsoftonline.com/common/oauth2/v2.0";

export const generateMicrosoftAuthUrl = ({ state, scopes }) => {
  const params = qs.stringify({
    client_id: process.env.MS_CLIENT_ID,
    response_type: "code",
    redirect_uri: process.env.MS_REDIRECT_URI,
    response_mode: "query",
    scope: scopes.join(" "),
    state
  });

  return `${AUTH_BASE}/authorize?${params}`;
};

export const getMicrosoftTokens = async (code) => {
    // console.log("OAuth token called");

  const response = await axios.post(
    `${AUTH_BASE}/token`,
    qs.stringify({
      client_id: process.env.MS_CLIENT_ID,
      client_secret: process.env.MS_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.MS_REDIRECT_URI
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  // console.log("Token Response: ", response);

  return response.data;
};

/**
 * Get Microsoft user info (email)
 */
export const getMicrosoftUserInfo = async (tokens) => {

    // fetch user profile
    const me = await axios.get(
      "https://graph.microsoft.com/v1.0/me",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      }
    );
  return me;
};
