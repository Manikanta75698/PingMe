import api from "./api";

export const getUsers = () => {
  return api.get("/users");
};

export const getExploreUsers = ({
  search = "",
  page = 1,
  limit = 12,
} = {}) => {
  return api.get("/users/explore", {
    params: {
      search,
      page,
      limit,
    },
  });
};