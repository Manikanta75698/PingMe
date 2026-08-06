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

/* =====================================
   STORAGE HELPERS
===================================== */

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
      JSON.parse(storedUser);

    if (
      !parsedUser ||
      typeof parsedUser !==
      "object" ||
      Array.isArray(parsedUser)
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

    try {
      localStorage.removeItem(
        "user"
      );
    } catch {
      // Storage unavailable.
    }

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

/* =====================================
   USER HELPERS
===================================== */

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

const mergeUserData = (
  previousUser,
  nextUser
) => {
  const normalizedNextUser =
    normalizeUser(nextUser);

  if (!normalizedNextUser) {
    return (
      previousUser || null
    );
  }

  const mergedUser = {
    ...(previousUser || {}),
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

/* =====================================
   CHAT CACHE
===================================== */

const clearConversationCache =
  () => {
    try {
      const keysToRemove = [];

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

/* =====================================
   AUTH PROVIDER
===================================== */

export const AuthProvider = ({
  children,
}) => {
  const mountedRef =
    useRef(true);

  const bootstrapStartedRef =
    useRef(false);

  const [
    token,
    setToken,
  ] = useState(
    getStoredToken
  );

  const [
    user,
    setUserState,
  ] = useState(() =>
    normalizeUser(
      getStoredUser()
    )
  );

  const [
    authReady,
    setAuthReady,
  ] = useState(false);

  const [
    profileLoading,
    setProfileLoading,
  ] = useState(false);

  /* =====================================
     CLEAR SESSION
  ===================================== */

  const clearSession =
    useCallback(
      ({
        clearCache = true,
      } = {}) => {
        disconnectSocket();

        try {
          localStorage.removeItem(
            "token"
          );

          localStorage.removeItem(
            "user"
          );

          sessionStorage.removeItem(
            "authRedirecting"
          );
        } catch (error) {
          console.error(
            "Unable to clear auth storage:",
            error
          );
        }

        if (clearCache) {
          clearConversationCache();
        }

        setToken("");
        setUserState(null);
      },
      []
    );

  /* =====================================
     SET USER
  ===================================== */

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

        /*
         * Login pages token ni storage lo
         * save chesina tarvatha setUser call
         * chesthayi. Local token state kuda
         * immediate ga synchronize chestham.
         */
        setToken(
          getStoredToken()
        );
      },
      []
    );

  /* =====================================
     REFRESH PROFILE
  ===================================== */

  const refreshProfile =
    useCallback(
      async ({
        silent = true,
      } = {}) => {
        const currentToken =
          getStoredToken();

        if (!currentToken) {
          return null;
        }

        if (!silent) {
          setProfileLoading(true);
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

          setToken(
            currentToken
          );

          return updatedUser;
        } catch (error) {
          console.error(
            "REFRESH PROFILE ERROR:",
            error?.response
              ?.data ||
            error?.message
          );

          const status =
            error?.response
              ?.status;

          if (
            status === 401 ||
            status === 403
          ) {
            clearSession({
              clearCache: true,
            });
          }

          return null;
        } finally {
          if (
            !silent &&
            mountedRef.current
          ) {
            setProfileLoading(
              false
            );
          }
        }
      },
      [clearSession]
    );

  /* =====================================
     INITIAL AUTH BOOTSTRAP
  ===================================== */

  useEffect(() => {
    if (
      bootstrapStartedRef.current
    ) {
      return undefined;
    }

    bootstrapStartedRef.current =
      true;

    const bootstrapAuth =
      async () => {
        const storedToken =
          getStoredToken();

        const storedUser =
          normalizeUser(
            getStoredUser()
          );

        if (!storedToken) {
          setToken("");
          setUserState(null);
          setAuthReady(true);

          return;
        }

        setToken(
          storedToken
        );

        if (storedUser) {
          setUserState(
            storedUser
          );

          /*
           * Cached session valid-looking ga
           * undhi kabatti UI immediate ga open
           * avvachu. Latest profile background
           * lo sync avuthundi.
           */
          setAuthReady(true);

          refreshSocketAuth();
          connectSocket();

          void refreshProfile({
            silent: true,
          });

          return;
        }

        /*
         * Token undhi kani stored user ledu.
         * Backend profile tho session verify
         * chesina tarvatha route decision.
         */
        const freshUser =
          await refreshProfile({
            silent: true,
          });

        if (
          mountedRef.current &&
          !freshUser
        ) {
          const latestToken =
            getStoredToken();

          if (!latestToken) {
            setToken("");
            setUserState(null);
          }
        }

        if (
          mountedRef.current
        ) {
          setAuthReady(true);
        }
      };

    void bootstrapAuth();

    return undefined;
  }, [refreshProfile]);

  /* =====================================
     USER UPDATED EVENT
  ===================================== */

  useEffect(() => {
    const handleUserUpdated =
      (event) => {
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

  /* =====================================
     SOCKET LIFECYCLE
  ===================================== */

  const isAuthenticated =
    Boolean(
      user && token
    );

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!isAuthenticated) {
      disconnectSocket();

      return;
    }

    refreshSocketAuth();
    connectSocket();
  }, [
    authReady,
    isAuthenticated,
    token,
  ]);

  /* =====================================
     MULTI-TAB AUTH SYNC
  ===================================== */

  useEffect(() => {
    const handleStorageChange =
      (event) => {
        if (
          event.key ===
          "token"
        ) {
          const nextToken =
            event.newValue
              ?.trim() || "";

          setToken(
            nextToken
          );

          if (!nextToken) {
            disconnectSocket();
            setUserState(null);
          }

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

          setToken(
            getStoredToken()
          );
        } catch (error) {
          console.error(
            "Unable to sync stored user:",
            error
          );

          clearSession({
            clearCache: true,
          });
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
  }, [clearSession]);

  /* =====================================
     LOGOUT
  ===================================== */

  const logout =
    useCallback(() => {
      clearSession({
        clearCache: true,
      });

      setAuthReady(true);
    }, [clearSession]);

  /* =====================================
     MOUNT CLEANUP
  ===================================== */

  useEffect(() => {
    mountedRef.current =
      true;

    return () => {
      mountedRef.current =
        false;

      disconnectSocket();
    };
  }, []);

  /* =====================================
     CONTEXT VALUE
  ===================================== */

  const contextValue =
    useMemo(
      () => ({
        user,
        token,

        setUser,
        logout,

        refreshProfile,
        profileLoading,

        authReady,
        isAuthenticated,
      }),
      [
        user,
        token,
        setUser,
        logout,
        refreshProfile,
        profileLoading,
        authReady,
        isAuthenticated,
      ]
    );

  return (
    <AuthContext.Provider
      value={contextValue}
    >
      {children}
    </AuthContext.Provider>
  );
};

/* =====================================
   AUTH HOOK
===================================== */

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