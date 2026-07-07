import axios from "axios";
import { ApiError } from "../utils/ApiError.js";

const BASE_URL = "https://api.ivrsolutions.in";

/**
 * Sync an agent with IVR Solutions (Add or Update)
 * @param {string} token - IVR API Token
 * @param {object} agentData - { name, email, phonenumber }
 */
export const syncIvrAgent = async (token, agentData) => {
  try {
    const response = await axios.post(`${BASE_URL}/ivrappv2/addagent`, {
      ...agentData,
      token
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response;
  } catch (error) {
    console.error("IVR Sync Agent Error:", error.response?.data || error.message);
    throw new ApiError(error.response?.status || 500, "Failed to sync agent with IVR");
  }
};

/**
 * Toggle agent active status
 * @param {string} token - IVR API Token
 * @param {string} extension - Agent Extension Number
 * @param {boolean} isActive - True to enable, False to disable
 */
export const toggleIvrAgentStatus = async (token, extension, isActive) => {
  try {
    const response = await axios.post(`${BASE_URL}/api/enable_disable_users`, {
      ext_no: extension,
      status: isActive ? "1" : "0",
      token
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error("IVR Toggle Status Error:", error.response?.data || error.message);
    throw new ApiError(error.response?.status || 500, "Failed to toggle agent status");
  }
};

/**
 * Link an agent to a specific DID
 * @param {string} token - IVR API Token
 * @param {string} agentId - IVR Agent ID
 * @param {string} didNumber - Global DID Number
 */
export const linkIvrAgentToDid = async (token, agentId, didNumber) => {
  try {
    const response = await axios.post(`${BASE_URL}/ivrappv2/update_agent_did`, {
      agent_id: agentId,
      did_no: didNumber,
      token
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error("IVR Link DID Error:", error.response?.data || error.message);
    throw new ApiError(error.response?.status || 500, "Failed to link agent to DID");
  }
};

/**
 * Fetch all agents from IVR Solutions
 * @param {string} token - IVR API Token
 */
export const fetchIvrAgents = async (token) => {
  try {
    console.log("[IVR SERVICE] Fetching Agents with token:", token.substring(0, 5) + "...");

    // Try POST with body first (legacy style)
    let response = await axios.post(`${BASE_URL}/api/get_agents`, { token }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log("[IVR SERVICE] POST Agents Response:", JSON.stringify(response.data, null, 2));

    if (response.data?.data) return response.data.data;

    // Fallback to GET if POST returns nothing or error
    response = await axios.get(`${BASE_URL}/api/get_agents`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.data || (response.data.status === "error" && response.data.message?.includes("token"))) {
      throw new ApiError(400, response.data.message || "Invalid IVR API Token");
    }

    return response.data?.data || [];
  } catch (error) {
    console.error("IVR Fetch Agents Error:", error.response?.data || error.message);
    if (error instanceof ApiError) throw error;
    throw new ApiError(error.response?.status || 500, "Failed to fetch agents from IVR");
  }
};

/**
 * Fetch all DIDs from IVR Solutions
 * @param {string} token - IVR API Token
 */
export const fetchIvrDids = async (token) => {
  try {
    console.log("[IVR SERVICE] Fetching DIDs...");

    // Try GET first as DIDs are often read-only
    let response = await axios.get(`${BASE_URL}/api/get_dids`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { token }
    });

    console.log("[IVR SERVICE] GET DIDs Response:", JSON.stringify(response.data, null, 2));

    const dids = response.data?.data || response.data?.dids;
    if (dids) return dids;

    // Fallback to POST
    response = await axios.post(`${BASE_URL}/api/get_dids`, { token }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.data || (response.data.status === "error" && response.data.message?.includes("token"))) {
      throw new ApiError(400, response.data.message || "Invalid IVR API Token");
    }

    return response.data?.data || response.data?.dids || [];
  } catch (error) {
    console.error("IVR Fetch DIDs Error:", error.response?.data || error.message);
    if (error instanceof ApiError) throw error;
    throw new ApiError(error.response?.status || 500, "Failed to fetch DIDs from IVR");
  }
};

/**
 * Fetch call logs for a specific DID (Used for backup sync)
 * @param {string} token - IVR API Token
 * @param {string} didNumber - Global DID Number
 * @param {string} date - Format YYYY-MM-DD
 */
export const fetchIvrLogs = async (token, didNumber, date) => {
  try {
    const response = await axios.post(`${BASE_URL}/api/call_logs`, {
      did_no: didNumber,
      date,
      token
    });
    return response.data;
  } catch (error) {
    console.error("IVR Fetch Logs Error:", error.response?.data || error.message);
    return [];
  }
};

/**
 * Initiate Click to Call
 * @param {string} token - IVR API Token
 * @param {string} didNumber - Global DID Number
 * @param {string} extension - Agent Extension Number
 * @param {string} targetPhone - Customer Phone Number
 */
export const initiateClickToCall = async (token, didNumber, extension, targetPhone) => {
  try {
    const response = await axios.get(`${BASE_URL}/api/c2c_get`, {
      params: {
        token,
        did: didNumber,
        ext_no: extension,
        phone: targetPhone
      }
    });

    if (response.data?.status === "error" || response.data?.status === 400) {
      throw new ApiError(400, response.data.message || "Failed to initiate click to call");
    }

    return response.data;
  } catch (error) {
    console.error("IVR Click To Call Error:", error.response?.data || error.message);
    if (error instanceof ApiError) throw error;
    throw new ApiError(error.response?.status || 500, "Failed to initiate click to call via IVR");
  }
};
