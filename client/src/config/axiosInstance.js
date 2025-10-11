// config/axiosInstance.js
import axios from "axios";

const BASE_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:6600/api";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Important if you're using cookies or sessions
  // headers: {
  //   "Content-Type": "application/json",
  // },
});

export default axiosInstance;
