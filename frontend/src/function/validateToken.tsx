import axios from "axios";
import backend_url, { CLIENT_ID, CLIENT_SECRET } from "../config/env.ts";

const TOKEN_KEY = "access_token";
const REFRESH_KEY = "refresh_token";
const TOKEN_TIME_KEY = "access_token_time";
const TOKEN_DURATION = 60 * 60 * 1000; // 1h

export const getToken = async (): Promise<string | null> => {
  const token = localStorage.getItem(TOKEN_KEY);
  const tokenTime = localStorage.getItem(TOKEN_TIME_KEY);

  if (token && tokenTime) {
    const elapsed = Date.now() - Number(tokenTime);
    if (elapsed < TOKEN_DURATION) {
      return token;
    }
  }

  const refresh = localStorage.getItem(REFRESH_KEY);
  if (refresh) {
    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", refresh);
    params.append("client_id", CLIENT_ID);
    params.append("client_secret", CLIENT_SECRET);

    try {
      const res = await axios.post(`${backend_url}o/token/`, params);
      const newToken = res.data.access_token;

      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(TOKEN_TIME_KEY, String(Date.now()));
      localStorage.setItem(REFRESH_KEY, res.data.refresh_token);

      return newToken;
    } catch (err) {
      console.error("❌ Erro ao renovar token:", err);
      logout();
      return null;
    }
  }

  logout();
  return null;
};

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(TOKEN_TIME_KEY);
};
