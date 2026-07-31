import {
  useEffect,
  useRef,
  useState,
} from "react";

import styles from "./EditProfileModal.module.css";

import {
  updateProfile,
  checkUsernameAvailability,
} from "../../services/authService";

import {
  useToastContext,
} from "../ui/toast/ToastProvider";

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const USERNAME_DEBOUNCE_MS = 800;
const BIO_MAX_LENGTH = 160;

const normalizeUsername = (
  value
) =>
  String(value || "")
    .trim()
    .toLowerCase();

const getAvailabilityValue = (
  response
) =>
  response?.available ??
  response?.data?.available ??
  response?.data?.data?.available ??
  false;

const getAvailabilityMessage = (
  response,
  available
) =>
  response?.message ||
  response?.data?.message ||
  response?.data?.data?.message ||
  (available
    ? "Username is available"
    : "Username is already taken");

const EditProfileModal = ({
  user,
  onClose,
  onUpdated,
}) => {
  const toast =
    useToastContext();

  const requestIdRef =
    useRef(0);

  const lastCheckedUsernameRef =
    useRef("");

  const originalUsernameRef =
    useRef(
      normalizeUsername(
        user?.username
      )
    );

  const [
    formData,
    setFormData,
  ] = useState(() => ({
    name:
      String(user?.name || ""),
    username:
      normalizeUsername(
        user?.username
      ),
    bio:
      String(user?.bio || ""),
  }));

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    usernameStatus,
    setUsernameStatus,
  ] = useState(() => ({
    checking: false,
    available: true,
    message:
      "Current username",
  }));

  const originalUsername =
    originalUsernameRef.current;

  /* =========================
     LOCK PAGE SCROLL
  ========================= */

  useEffect(() => {
    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, []);

  /* =========================
     KEYBOARD CLOSE
  ========================= */

  useEffect(() => {
    const handleKeyDown = (
      event
    ) => {
      if (
        event.key === "Escape" &&
        !loading
      ) {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    loading,
    onClose,
  ]);

  /* =========================
     INPUT CHANGE
  ========================= */

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    if (name === "username") {
      const cleanedUsername =
        value
          .toLowerCase()
          .replace(
            /[^a-z0-9._]/g,
            ""
          )
          .slice(
            0,
            USERNAME_MAX_LENGTH
          );

      /*
       * Pending response invalidate.
       */
      requestIdRef.current += 1;

      setFormData(
        (previous) => ({
          ...previous,
          username:
            cleanedUsername,
        })
      );

      /*
       * Typing సమయంలో checking state
       * immediate ga set cheyyamu.
       * Anduke page/modal blink avvadu.
       */
      if (
        normalizeUsername(
          cleanedUsername
        ) === originalUsername
      ) {
        setUsernameStatus({
          checking: false,
          available: true,
          message:
            "Current username",
        });
      } else {
        setUsernameStatus({
          checking: false,
          available: null,
          message: "",
        });
      }

      return;
    }

    if (name === "bio") {
      setFormData(
        (previous) => ({
          ...previous,
          bio: value.slice(
            0,
            BIO_MAX_LENGTH
          ),
        })
      );

      return;
    }

    setFormData(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  };

  /* =========================
     DEBOUNCED USERNAME CHECK
  ========================= */

  useEffect(() => {
    const username =
      normalizeUsername(
        formData.username
      );

    requestIdRef.current += 1;

    const currentRequestId =
      requestIdRef.current;

    if (!username) {
      lastCheckedUsernameRef.current =
        "";

      setUsernameStatus({
        checking: false,
        available: false,
        message:
          "Username is required",
      });

      return undefined;
    }

    if (
      username ===
      originalUsername
    ) {
      lastCheckedUsernameRef.current =
        username;

      setUsernameStatus({
        checking: false,
        available: true,
        message:
          "Current username",
      });

      return undefined;
    }

    if (
      username.length <
      USERNAME_MIN_LENGTH
    ) {
      lastCheckedUsernameRef.current =
        "";

      setUsernameStatus({
        checking: false,
        available: false,
        message:
          `Username must be at least ${USERNAME_MIN_LENGTH} characters`,
      });

      return undefined;
    }

    if (
      username.length >
      USERNAME_MAX_LENGTH
    ) {
      lastCheckedUsernameRef.current =
        "";

      setUsernameStatus({
        checking: false,
        available: false,
        message:
          `Username cannot exceed ${USERNAME_MAX_LENGTH} characters`,
      });

      return undefined;
    }

    if (
      !/^[a-z0-9._]+$/.test(
        username
      )
    ) {
      lastCheckedUsernameRef.current =
        "";

      setUsernameStatus({
        checking: false,
        available: false,
        message:
          "Use only letters, numbers, dots and underscores",
      });

      return undefined;
    }

    if (
      lastCheckedUsernameRef.current ===
      username &&
      usernameStatus.available !==
      null
    ) {
      return undefined;
    }

    const timer =
      window.setTimeout(
        async () => {
          /*
           * Typing stop ayina 800ms
           * tarvatha matrame checking.
           */
          setUsernameStatus(
            (previous) => ({
              ...previous,
              checking: true,
            })
          );

          try {
            const response =
              await checkUsernameAvailability(
                username
              );

            if (
              currentRequestId !==
              requestIdRef.current
            ) {
              return;
            }

            const available =
              Boolean(
                getAvailabilityValue(
                  response
                )
              );

            lastCheckedUsernameRef.current =
              username;

            setUsernameStatus({
              checking: false,
              available,
              message:
                getAvailabilityMessage(
                  response,
                  available
                ),
            });
          } catch (error) {
            if (
              currentRequestId !==
              requestIdRef.current
            ) {
              return;
            }

            console.error(
              "USERNAME CHECK ERROR:",
              error?.response?.data ||
              error?.message
            );

            lastCheckedUsernameRef.current =
              "";

            setUsernameStatus({
              checking: false,
              available: null,
              message:
                "Unable to check username right now",
            });
          }
        },
        USERNAME_DEBOUNCE_MS
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    formData.username,
    originalUsername,
  ]);

  /* =========================
     SUBMIT
  ========================= */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (loading) {
        return;
      }

      const cleanName =
        formData.name.trim();

      const cleanUsername =
        normalizeUsername(
          formData.username
        );

      const cleanBio =
        formData.bio.trim();

      if (!cleanName) {
        toast.warning(
          "Name cannot be empty"
        );

        return;
      }

      if (!cleanUsername) {
        toast.warning(
          "Username is required"
        );

        return;
      }

      if (
        cleanUsername.length <
        USERNAME_MIN_LENGTH
      ) {
        toast.warning(
          `Username must be at least ${USERNAME_MIN_LENGTH} characters`
        );

        return;
      }

      if (
        !/^[a-z0-9._]+$/.test(
          cleanUsername
        )
      ) {
        toast.warning(
          "Use only letters, numbers, dots and underscores"
        );

        return;
      }

      if (
        usernameStatus.checking
      ) {
        toast.info(
          "Please wait while we check the username"
        );

        return;
      }

      if (
        cleanUsername !==
        originalUsername &&
        usernameStatus.available !==
        true
      ) {
        toast.warning(
          usernameStatus.message ||
          "Please choose an available username"
        );

        return;
      }

      try {
        setLoading(true);

        const response =
          await updateProfile({
            name: cleanName,
            username:
              cleanUsername,
            bio: cleanBio,
          });

        const updatedUser =
          response?.user ||
          response?.data?.user ||
          response?.data?.data?.user;

        if (!updatedUser) {
          throw new Error(
            "Updated user data was not returned"
          );
        }

        localStorage.setItem(
          "user",
          JSON.stringify(
            updatedUser
          )
        );

        onUpdated?.(
          updatedUser
        );

        toast.success(
          response?.message ||
          response?.data?.message ||
          "Profile updated successfully"
        );

        onClose();
      } catch (error) {
        const errorData =
          error?.response?.data;

        console.error(
          "PROFILE UPDATE ERROR:",
          errorData ||
          error?.message
        );

        if (
          errorData?.field ===
          "username"
        ) {
          lastCheckedUsernameRef.current =
            cleanUsername;

          setUsernameStatus({
            checking: false,
            available: false,
            message:
              errorData.message ||
              "Username is already taken",
          });
        }

        toast.error(
          errorData?.message ||
          error?.message ||
          "Profile update failed"
        );
      } finally {
        setLoading(false);
      }
    };

  /* =========================
     STATUS UI
  ========================= */

  const usernameMessageClass =
    usernameStatus.checking
      ? styles.usernameChecking
      : usernameStatus.available ===
        true
        ? styles.usernameAvailable
        : usernameStatus.available ===
          false
          ? styles.usernameTaken
          : styles.usernameNeutral;

  const usernameMessage =
    usernameStatus.checking
      ? "Checking username..."
      : usernameStatus.available ===
        true
        ? `✓ ${usernameStatus.message}`
        : usernameStatus.available ===
          false
          ? `✕ ${usernameStatus.message}`
          : usernameStatus.message;

  const usernameChanged =
    normalizeUsername(
      formData.username
    ) !== originalUsername;

  const submitDisabled =
    loading ||
    usernameStatus.checking ||
    (
      usernameChanged &&
      usernameStatus.available !==
      true
    );

  return (
    <div
      className={
        styles.overlay
      }
      onMouseDown={(
        event
      ) => {
        if (
          event.target ===
          event.currentTarget &&
          !loading
        ) {
          onClose();
        }
      }}
    >
      <div
        className={
          styles.modal
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
        onMouseDown={(
          event
        ) => {
          event.stopPropagation();
        }}
      >
        <div
          className={
            styles.header
          }
        >
          <h2
            id="edit-profile-title"
          >
            Edit Profile
          </h2>

          <button
            type="button"
            onClick={
              onClose
            }
            disabled={
              loading
            }
            aria-label="Close edit profile"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={
            handleSubmit
          }
          autoComplete="off"
          noValidate
        >
          <div
            className={
              styles.field
            }
          >
            <label
              htmlFor="edit-profile-name"
            >
              Name
            </label>

            <input
              id="edit-profile-name"
              type="text"
              name="name"
              placeholder="Name"
              value={
                formData.name
              }
              onChange={
                handleChange
              }
              maxLength={50}
              disabled={
                loading
              }
              autoComplete="off"
            />
          </div>

          <div
            className={
              styles.field
            }
          >
            <label
              htmlFor="edit-profile-username"
            >
              Username
            </label>

            <input
              id="edit-profile-username"
              type="text"
              name="profile_username"
              placeholder="Username"
              value={
                formData.username
              }
              onChange={(
                event
              ) =>
                handleChange({
                  target: {
                    name:
                      "username",
                    value:
                      event.target
                        .value,
                  },
                })
              }
              maxLength={
                USERNAME_MAX_LENGTH
              }
              disabled={
                loading
              }
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
            />

            <p
              className={`${styles.usernameMessage} ${usernameMessageClass}`}
              role={
                usernameStatus.available ===
                  false
                  ? "alert"
                  : "status"
              }
              aria-live="polite"
            >
              {usernameMessage ||
                "\u00A0"}
            </p>
          </div>

          <div
            className={
              styles.field
            }
          >
            <label
              htmlFor="edit-profile-bio"
            >
              Bio
            </label>

            <textarea
              id="edit-profile-bio"
              rows="4"
              name="bio"
              placeholder="Tell people about yourself"
              value={
                formData.bio
              }
              onChange={
                handleChange
              }
              maxLength={
                BIO_MAX_LENGTH
              }
              disabled={
                loading
              }
            />

            <span
              className={
                styles.counter
              }
            >
              {formData.bio.length}/
              {BIO_MAX_LENGTH}
            </span>
          </div>

          <div
            className={
              styles.buttons
            }
          >
            <button
              type="button"
              onClick={
                onClose
              }
              className={
                styles.cancel
              }
              disabled={
                loading
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              className={
                styles.save
              }
              disabled={
                submitDisabled
              }
            >
              {loading
                ? "Saving..."
                : usernameStatus.checking
                  ? "Checking..."
                  : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;