import axios from "axios";
import backend_url, { USERNAME, PASSWORD, CLIENT_ID, CLIENT_SECRET } from "../config/env.ts";

const TOKEN_KEY = 'access_token';
const TOKEN_TIME_KEY = 'access_token_time';
const TOKEN_DURATION = 60 * 60 * 1000;

export const getToken = async (): Promise<string | null> => {
  const token = localStorage.getItem(TOKEN_KEY);
  const tokenTime = localStorage.getItem(TOKEN_TIME_KEY);

  console.log("Token", token, tokenTime);

  if (token && tokenTime) {
    const elapsed = Date.now() - Number(tokenTime);
    if (elapsed < TOKEN_DURATION) return token;
  }

  const params = new URLSearchParams();
  params.append("grant_type", "password");
  params.append("username", USERNAME);
  params.append("password", PASSWORD);
  params.append("client_id", CLIENT_ID);
  params.append("client_secret", CLIENT_SECRET);

  try {
    const res = await axios.post(`${backend_url}o/token/`, params);
    const newToken = res.data.access_token;

    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(TOKEN_TIME_KEY, String(Date.now()));

    return newToken;
  } catch (err) {
    console.error("Erro ao obter token:", err);
    return null;
  }
};
