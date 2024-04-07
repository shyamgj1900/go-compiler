import axios from "axios";

const API = axios.create({
  baseURL: "",
  // Uncomment to run the backend server locally
  // baseURL: "http://localhost:3000",
});

export const executeCode = async (language, sourceCode) => {
  const response = await API.post("/api/v1/execute", {
    language: language,
    content: sourceCode,
  });
  return response.data;
};
