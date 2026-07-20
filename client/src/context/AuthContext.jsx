import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  disconnectSocket,
} from "../socket/socket";

const AuthContext =
  createContext(null);

/* =========================
   READ STORED USER
========================= */

const getStoredUser = () => {
  try {
    const storedUser =
      localStorage.getItem("user");

    if (!storedUser) {
      return null;
    }

    const parsedUser =
      JSON.parse(storedUser);

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

/* =========================
   CLEAR CHAT CACHE
========================= */

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
          localStorage.key(index);

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
  const [
    user,
    setUserState,
  ] = useState(
    () => getStoredUser()
  );

  /*
   * Components can continue using:
   *
   * setUser(response.user)
   *
   * User state and localStorage are
   * updated together automatically.
   */
  const setUser = useCallback(
    (nextUser) => {
      setUserState(
        (previousUser) => {
          const resolvedUser =
            typeof nextUser ===
              "function"
              ? nextUser(
                previousUser
              )
              : nextUser;

          try {
            if (resolvedUser) {
              localStorage.setItem(
                "user",
                JSON.stringify(
                  resolvedUser
                )
              );
            } else {
              localStorage.removeItem(
                "user"
              );
            }
          } catch (error) {
            console.error(
              "Unable to store user:",
              error
            );
          }

          return resolvedUser;
        }
      );
    },
    []
  );

  /* =========================
     LOGOUT
  ========================= */

  const logout = useCallback(
    () => {
      /*
       * Disconnect before removing
       * authentication information.
       */
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

      setUserState(null);
    },
    []
  );

  /* =========================
     DEFENSIVE SOCKET CLEANUP
  ========================= */

  useEffect(() => {
    const token =
      localStorage.getItem(
        "token"
      );

    if (!user || !token) {
      disconnectSocket();
    }
  }, [user]);

  /* =========================
     MULTI-TAB AUTH SYNC
  ========================= */

  useEffect(() => {
    const handleStorageChange = (
      event
    ) => {
      /*
       * Logout performed in another tab.
       */
      if (
        event.key === "token" &&
        !event.newValue
      ) {
        disconnectSocket();
        setUserState(null);

        return;
      }

      /*
       * User data changed in another tab.
       */
      if (
        event.key !== "user"
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
          JSON.parse(
            event.newValue
          );

        if (
          !updatedUser ||
          typeof updatedUser !==
          "object"
        ) {
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

  const isAuthenticated =
    Boolean(
      user &&
      localStorage.getItem(
        "token"
      )
    );

  const contextValue =
    useMemo(
      () => ({
        user,
        setUser,
        logout,
        isAuthenticated,
      }),
      [
        user,
        setUser,
        logout,
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

/* =========================
   AUTH HOOK
========================= */

export const useAuth = () => {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
};