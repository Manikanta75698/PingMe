import api from "./api";

export const getStories = async () => {
  const response = await api.get("/stories");
  return response.data;
};