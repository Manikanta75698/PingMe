import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  disconnectSocket,
} from "../socket/socket";

const AuthContext =
  createContext(null);

const getStoredUser = () => {
  try {
    const storedUser =
      localStorage.getItem("user");

    return storedUser
      ? JSON.parse(storedUser)
      : null;
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

const clearConversationCache = () => {
  try {
    const keysToRemove = [];

    for (
      let index = 0;
      index < localStorage.length;
      index += 1
    ) {
      const key =
        localStorage.key(index);

      if (
        key?.startsWith(
          "pingme:conversation:"
        )
      ) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error(
      "Unable to clear chat cache:",
      error
    );
  }
};

export const AuthProvider = ({
  children,
}) => {
  const [
    user,
    setUser,
  ] = useState(
    () => getStoredUser()
  );

  /* =========================
     LOGOUT
  ========================= */

  const logout = useCallback(() => {
    /*
     * Token clear cheyyadam mundu
     * active socket disconnect cheyyali.
     */
    disconnectSocket();

    localStorage.removeItem(
      "token"
    );

    localStorage.removeItem(
      "user"
    );

    clearConversationCache();

    setUser(null);
  }, []);

  /* =========================
     DEFENSIVE SOCKET CLEANUP
  ========================= */

  useEffect(() => {
    const token =
      localStorage.getItem("token");

    /*
     * Vere component direct ga user/token
     * clear chesina socket close avutundi.
     */
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
       * Vere tab lo token remove ayithe
       * current tab socket kuda close.
       */
      if (
        event.key === "token" &&
        !event.newValue
      ) {
        disconnectSocket();
        setUser(null);

        return;
      }

      /*
       * Vere tab lo user data change/logout
       * ayithe current tab state sync.
       */
      if (event.key !== "user") {
        return;
      }

      if (!event.newValue) {
        disconnectSocket();
        setUser(null);

        return;
      }

      try {
        const updatedUser =
          JSON.parse(
            event.newValue
          );

        setUser(updatedUser);
      } catch (error) {
        console.error(
          "Unable to sync stored user:",
          error
        );

        disconnectSocket();
        setUser(null);
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

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

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