import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  getProfile,
} from "../services/authService";

import {
  connectSocket,
  disconnectSocket,
  refreshSocketAuth,
} from "../socket/socket";

const AuthContext =
  createContext(null);

/* =========================
   STORAGE HELPERS
========================= */

const getStoredToken = () => {
  try {
    return (
      localStorage
        .getItem("token")
        ?.trim() || ""
    );
  } catch (error) {
    console.error(
      "Unable to read stored token:",
      error
    );

    return "";
  }
};

const getStoredUser = () => {
  try {
    const storedUser =
      localStorage.getItem(
        "user"
      );

    if (!storedUser) {
      return null;
    }

    const parsedUser =
      JSON.parse(
        storedUser
      );

    if (
      !parsedUser ||
      typeof parsedUser !==
        "object"
    ) {
      localStorage.removeItem(
        "user"
      );

      return null;
    }

    return parsedUser;
  } catch (error) {
    console.error(
      "Unable to read stored user:",
      error
    );

    localStorage.removeItem(
      "user"
    );

    return null;
  }
};

const storeUser = (
  nextUser
) => {
  try {
    if (nextUser) {
      localStorage.setItem(
        "user",
        JSON.stringify(
          nextUser
        )
      );

      return;
    }

    localStorage.removeItem(
      "user"
    );
  } catch (error) {
    console.error(
      "Unable to store user:",
      error
    );
  }
};

/* =========================
   USER NORMALIZER
========================= */

const normalizeUser = (
  value
) => {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return null;
  }

  /*
   * Different backend response shapes:
   *
   * response.user
   * response.data.user
   * response.profile
   * response.data
   */
  const candidate =
    value?.user ||
    value?.profile ||
    value?.data?.user ||
    value?.data?.profile ||
    value?.data ||
    value;

  if (
    !candidate ||
    typeof candidate !==
      "object" ||
    Array.isArray(candidate)
  ) {
    return null;
  }

  const profilePic =
    candidate.profilePic ||
    candidate.avatar ||
    candidate.photoURL ||
    "";

  return {
    ...candidate,

    profilePic,

    avatar:
      candidate.avatar ||
      profilePic,

    photoURL:
      candidate.photoURL ||
      profilePic,
  };
};

/* =========================
   MERGE USER DATA
========================= */

const mergeUserData = (
  previousUser,
  nextUser
) => {
  const normalizedNextUser =
    normalizeUser(
      nextUser
    );

  if (!normalizedNextUser) {
    return previousUser ||
      null;
  }

  const mergedUser = {
    ...(previousUser ||
      {}),

    ...normalizedNextUser,
  };

  const profilePic =
    normalizedNextUser
      .profilePic ||
    normalizedNextUser.avatar ||
    normalizedNextUser.photoURL ||
    previousUser?.profilePic ||
    previousUser?.avatar ||
    previousUser?.photoURL ||
    "";

  return {
    ...mergedUser,

    profilePic,

    avatar:
      mergedUser.avatar ||
      profilePic,

    photoURL:
      mergedUser.photoURL ||
      profilePic,
  };
};

/* =========================
   CLEAR CHAT CACHE
========================= */

const clearConversationCache =
  () => {
    try {
      const keysToRemove =
        [];

      for (
        let index = 0;
        index <
        localStorage.length;
        index += 1
      ) {
        const key =
          localStorage.key(
            index
          );

        if (
          key?.startsWith(
            "pingme:conversation:"
          )
        ) {
          keysToRemove.push(
            key
          );
        }
      }

      keysToRemove.forEach(
        (key) => {
          localStorage.removeItem(
            key
          );
        }
      );
    } catch (error) {
      console.error(
        "Unable to clear chat cache:",
        error
      );
    }
  };

/* =========================
   AUTH PROVIDER
========================= */

export const AuthProvider = ({
  children,
}) => {
  const initialProfileLoadedRef =
    useRef(false);

  const [
    user,
    setUserState,
  ] = useState(() => {
    const storedUser =
      getStoredUser();

    return normalizeUser(
      storedUser
    );
  });

  const [
    profileLoading,
    setProfileLoading,
  ] = useState(false);

  /* =========================
     SET USER
  ========================= */

  const setUser =
    useCallback(
      (nextUser) => {
        setUserState(
          (previousUser) => {
            const resolvedValue =
              typeof nextUser ===
                "function"
                ? nextUser(
                  previousUser
                )
                : nextUser;

            if (
              resolvedValue ===
              null
            ) {
              storeUser(null);
              return null;
            }

            const mergedUser =
              mergeUserData(
                previousUser,
                resolvedValue
              );

            storeUser(
              mergedUser
            );

            return mergedUser;
          }
        );
      },
      []
    );

  /* =========================
     REFRESH PROFILE
  ========================= */

  const refreshProfile =
    useCallback(
      async ({
        silent = true,
      } = {}) => {
        const token =
          getStoredToken();

        if (!token) {
          return null;
        }

        if (!silent) {
          setProfileLoading(
            true
          );
        }

        try {
          const response =
            await getProfile();

          const freshUser =
            normalizeUser(
              response
            );

          if (!freshUser) {
            throw new Error(
              "Invalid profile response"
            );
          }

          let updatedUser =
            null;

          setUserState(
            (previousUser) => {
              updatedUser =
                mergeUserData(
                  previousUser,
                  freshUser
                );

              storeUser(
                updatedUser
              );

              return updatedUser;
            }
          );

          return updatedUser;
        } catch (
          error
        ) {
          console.error(
            "REFRESH PROFILE ERROR:",
            error.response?.data ||
            error.message
          );

          /*
           * 401 handling api interceptor
           * already chesthe ikkada logout
           * duplicate ga cheyyamu.
           */
          return null;
        } finally {
          if (!silent) {
            setProfileLoading(
              false
            );
          }
        }
      },
      []
    );

  /* =========================
     INITIAL PROFILE SYNC
  ========================= */

  useEffect(() => {
    const token =
      getStoredToken();

    if (
      !token ||
      initialProfileLoadedRef
        .current
    ) {
      return;
    }

    initialProfileLoadedRef.current =
      true;

    refreshSocketAuth();
    connectSocket();

    /*
     * App load ayinappudu backend
     * nunchi latest profile fetch.
     *
     * Sidebar, Header, Stories anni
     * updated profilePic use chestayi.
     */
    void refreshProfile({
      silent: true,
    });
  }, [refreshProfile]);

  /* =========================
     USER UPDATE EVENT
  ========================= */

  useEffect(() => {
    const handleUserUpdated = (
      event
    ) => {
      const updatedUser =
        event?.detail;

      if (
        !updatedUser ||
        typeof updatedUser !==
          "object"
      ) {
        return;
      }

      setUser(
        updatedUser
      );
    };

    window.addEventListener(
      "auth:user-updated",
      handleUserUpdated
    );

    return () => {
      window.removeEventListener(
        "auth:user-updated",
        handleUserUpdated
      );
    };
  }, [setUser]);

  /* =========================
     LOGOUT
  ========================= */

  const logout =
    useCallback(() => {
      disconnectSocket();

      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "user"
      );

      sessionStorage.removeItem(
        "authRedirecting"
      );

      clearConversationCache();

      initialProfileLoadedRef.current =
        false;

      setUserState(null);
    }, []);

  /* =========================
     DEFENSIVE SOCKET CLEANUP
  ========================= */

  useEffect(() => {
    const token =
      getStoredToken();

    if (!user || !token) {
      disconnectSocket();
      return;
    }

    refreshSocketAuth();
    connectSocket();
  }, [user]);

  /* =========================
     MULTI-TAB AUTH SYNC
  ========================= */

  useEffect(() => {
    const handleStorageChange = (
      event
    ) => {
      if (
        event.key ===
          "token" &&
        !event.newValue
      ) {
        disconnectSocket();

        initialProfileLoadedRef.current =
          false;

        setUserState(null);

        return;
      }

      if (
        event.key !==
        "user"
      ) {
        return;
      }

      if (!event.newValue) {
        disconnectSocket();

        setUserState(null);

        return;
      }

      try {
        const updatedUser =
          normalizeUser(
            JSON.parse(
              event.newValue
            )
          );

        if (!updatedUser) {
          throw new Error(
            "Invalid stored user"
          );
        }

        setUserState(
          updatedUser
        );
      } catch (error) {
        console.error(
          "Unable to sync stored user:",
          error
        );

        disconnectSocket();

        localStorage.removeItem(
          "token"
        );

        localStorage.removeItem(
          "user"
        );

        initialProfileLoadedRef.current =
          false;

        setUserState(null);
      }
    };

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorageChange
      );
    };
  }, []);

  /* =========================
     AUTH STATUS
  ========================= */

  const isAuthenticated =
    Boolean(
      user &&
      getStoredToken()
    );

  /* =========================
     CONTEXT VALUE
  ========================= */

  const contextValue =
    useMemo(
      () => ({
        user,

        setUser,

        logout,

        refreshProfile,

        profileLoading,

        isAuthenticated,
      }),
      [
        user,
        setUser,
        logout,
        refreshProfile,
        profileLoading,
        isAuthenticated,
      ]
    );

  return (
    <AuthContext.Provider
      value={
        contextValue
      }
    >
      {children}
    </AuthContext.Provider>
  );
};

/* =========================
   AUTH HOOK
========================= */

export const useAuth = () => {
  const context =
    useContext(
      AuthContext
    );

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
};