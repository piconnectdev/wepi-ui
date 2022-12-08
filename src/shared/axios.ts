import axios from "axios";
import { httpBase } from "./env";
export const DEV_URL = `${httpBase}/api/v3`;
//export const DEV_URL = `http://localhost:8536/api/v3`
export const PROD_URL = `${httpBase}/api/v3`;
const isDev = process.env.NODE_ENV === "development";

export default axios.create({
  baseURL: isDev ? DEV_URL : PROD_URL,
});
