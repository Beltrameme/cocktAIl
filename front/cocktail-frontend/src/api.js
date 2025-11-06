import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:3000", // your Node backend
});

export const registerUser = (data) => API.post("/register", data);
export const loginUser = (data) => API.post("/login", data);
export const getDrinks = () => API.get("/drinks");
export const sendMessage = (data) => API.post("/chat/user", data);
export const setPreference = (data) => API.post("/preferences", data)

export default API;
