import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Check,
  LoaderCircle,
  X,
} from "lucide-react";

import {
  checkUsernameAvailability,
  updateProfile,
} from "../../services/authService";

import {
  useToastContext,
} from "../ui/toast/ToastProvider";

import styles from "./EditProfileModal.module.css";

const NAME_MAX_LENGTH = 50;
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const USERNAME_DEBOUNCE_MS = 650;
const BIO_MAX_LENGTH = 160;

const normalizeUsername = (
  value
) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeFormData = (
  user
) => ({
  name: String(
    user?.name || ""
  ),
  username:
    normalizeUsername(
      user?.username
    ),
  bio: String(
    user?.bio || ""
  ),
});

const getAvailabilityValue = (
  response
) =>
  response?.available ??
  response?.data?.available ??
  response?.data?.data
    ?.available ??
  false;

const getAvailabilityMessage = (
  response,
  available
) =>
  response?.message ||
  response?.data?.message ||
  response?.data?.data
    ?.message ||
  (
    available
      ? "Username is available"
      : "Username is already taken"
  );

const getUpdatedUser = (
  response
) =>
  response?.user ||
  response?.data?.user ||
  response?.data?.data?.user ||
  null;

const EditProfileModal = ({
  user,
  onClose,
  onUpdated,
}) => {
  const toast =
    useToastContext();

  const modalRef =
    useRef(null);

  const nameInputRef =
    useRef(null);

  const requestIdRef =
    useRef(0);

  const lastCheckedUsernameRef =
    useRef("");

  const originalForm =
    useMemo(
      () =>
        normalizeFormData(
          user
        ),
      [user]
    );

  const originalUsername =
    originalForm.username;

  const [
    formData,
    setFormData,
  ] = useState(
    originalForm
  );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    usernameStatus,
    setUsernameStatus,
  ] = useState({
    checking: false,
    available: true,
    message:
      "Current username",
  });

  const cleanForm =
    useMemo(
      () => ({
        name:
          formData.name.trim(),

        username:
          normalizeUsername(
            formData.username
          ),

        bio:
          formData.bio.trim(),
      }),
      [formData]
    );

  const hasChanges =
    cleanForm.name !==
    originalForm.name.trim() ||
    cleanForm.username !==
    originalForm.username ||
    cleanForm.bio !==
    originalForm.bio.trim();

  const usernameChanged =
    cleanForm.username !==
    originalUsername;

  const requestClose = () => {
    if (saving) {
      return;
    }

    if (
      hasChanges &&
      !window.confirm(
        "Discard your unsaved changes?"
      )
    ) {
      return;
    }

    onClose();
  };

  /* =====================================
     BODY SCROLL LOCK + INITIAL FOCUS
  ===================================== */

  useEffect(() => {
    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style
      .overflow = "hidden";

    const focusTimer =
      window.setTimeout(
        () => {
          nameInputRef.current
            ?.focus();
        },
        80
      );

    return () => {
      document.body.style
        .overflow =
        previousOverflow;

      window.clearTimeout(
        focusTimer
      );
    };
  }, []);

  /* =====================================
     ESCAPE + FOCUS TRAP
  ===================================== */

  useEffect(() => {
    const handleKeyDown = (
      event
    ) => {
      if (
        event.key === "Escape"
      ) {
        event.preventDefault();
        requestClose();
        return;
      }

      if (
        event.key !== "Tab" ||
        !modalRef.current
      ) {
        return;
      }

      const focusableElements =
        modalRef.current
          .querySelectorAll(
            [
              "button:not([disabled])",
              "input:not([disabled])",
              "textarea:not([disabled])",
              "[tabindex]:not([tabindex='-1'])",
            ].join(",")
          );

      if (
        focusableElements
          .length === 0
      ) {
        return;
      }

      const firstElement =
        focusableElements[0];

      const lastElement =
        focusableElements[
        focusableElements
          .length - 1
        ];

      if (
        event.shiftKey &&
        document.activeElement ===
        firstElement
      ) {
        event.preventDefault();
        lastElement.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement ===
        lastElement
      ) {
        event.preventDefault();
        firstElement.focus();
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
    saving,
    hasChanges,
  ]);

  /* =====================================
     INPUT CHANGE
  ===================================== */

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    if (
      name === "username"
    ) {
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

      requestIdRef.current += 1;

      setFormData(
        (previous) => ({
          ...previous,
          username:
            cleanedUsername,
        })
      );

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
          bio:
            value.slice(
              0,
              BIO_MAX_LENGTH
            ),
        })
      );

      return;
    }

    if (name === "name") {
      setFormData(
        (previous) => ({
          ...previous,
          name:
            value.slice(
              0,
              NAME_MAX_LENGTH
            ),
        })
      );
    }
  };

  /* =====================================
     USERNAME AVAILABILITY CHECK
  ===================================== */

  useEffect(() => {
    const username =
      normalizeUsername(
        formData.username
      );

    requestIdRef.current += 1;

    const currentRequestId =
      requestIdRef.current;

    if (!username) {
      lastCheckedUsernameRef
        .current = "";

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
      lastCheckedUsernameRef
        .current = username;

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
      lastCheckedUsernameRef
        .current = "";

      setUsernameStatus({
        checking: false,
        available: false,
        message:
          `Username must be at least ${USERNAME_MIN_LENGTH} characters`,
      });

      return undefined;
    }

    if (
      !/^[a-z0-9._]+$/.test(
        username
      )
    ) {
      lastCheckedUsernameRef
        .current = "";

      setUsernameStatus({
        checking: false,
        available: false,
        message:
          "Use only letters, numbers, dots and underscores",
      });

      return undefined;
    }

    if (
      lastCheckedUsernameRef
        .current === username &&
      usernameStatus.available !==
      null
    ) {
      return undefined;
    }

    const timer =
      window.setTimeout(
        async () => {
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

            lastCheckedUsernameRef
              .current = username;

            setUsernameStatus({
              checking: false,
              available,
              message:
                getAvailabilityMessage(
                  response,
                  available
                ),
            });
          } catch (
          checkError
          ) {
            if (
              currentRequestId !==
              requestIdRef.current
            ) {
              return;
            }

            console.error(
              "USERNAME CHECK ERROR:",
              checkError
                ?.response?.data ||
              checkError?.message
            );

            lastCheckedUsernameRef
              .current = "";

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

  /* =====================================
     SUBMIT
  ===================================== */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (
        saving ||
        !hasChanges
      ) {
        return;
      }

      if (!cleanForm.name) {
        toast.warning(
          "Name cannot be empty"
        );

        nameInputRef.current
          ?.focus();

        return;
      }

      if (
        cleanForm.name.length >
        NAME_MAX_LENGTH
      ) {
        toast.warning(
          `Name cannot exceed ${NAME_MAX_LENGTH} characters`
        );

        return;
      }

      if (
        cleanForm.username
          .length <
        USERNAME_MIN_LENGTH
      ) {
        toast.warning(
          `Username must be at least ${USERNAME_MIN_LENGTH} characters`
        );

        return;
      }

      if (
        !/^[a-z0-9._]+$/.test(
          cleanForm.username
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
        usernameChanged &&
        usernameStatus.available !==
        true
      ) {
        toast.warning(
          usernameStatus.message ||
          "Choose an available username"
        );

        return;
      }

      try {
        setSaving(true);

        const response =
          await updateProfile({
            name:
              cleanForm.name,

            username:
              cleanForm.username,

            bio:
              cleanForm.bio,
          });

        const updatedUser =
          getUpdatedUser(
            response
          );

        if (!updatedUser) {
          throw new Error(
            "Updated user data was not returned"
          );
        }

        const mergedUser = {
          ...user,
          ...updatedUser,
        };

        try {
          localStorage.setItem(
            "user",
            JSON.stringify(
              mergedUser
            )
          );
        } catch (
        storageError
        ) {
          console.error(
            "PROFILE STORAGE ERROR:",
            storageError
          );
        }

        onUpdated?.(
          mergedUser
        );

        window.dispatchEvent(
          new CustomEvent(
            "profile:updated",
            {
              detail:
                mergedUser,
            }
          )
        );

        toast.success(
          response?.message ||
          response?.data
            ?.message ||
          "Profile updated successfully"
        );

        onClose();
      } catch (
      updateError
      ) {
        const errorData =
          updateError
            ?.response?.data;

        console.error(
          "PROFILE UPDATE ERROR:",
          errorData ||
          updateError?.message
        );

        if (
          errorData?.field ===
          "username"
        ) {
          lastCheckedUsernameRef
            .current =
            cleanForm.username;

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
          updateError?.message ||
          "Profile update failed"
        );
      } finally {
        setSaving(false);
      }
    };

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

  const submitDisabled =
    saving ||
    !hasChanges ||
    !cleanForm.name ||
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
          event.currentTarget
        ) {
          requestClose();
        }
      }}
      role="presentation"
    >
      <section
        ref={modalRef}
        className={
          styles.modal
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
        aria-describedby="edit-profile-description"
        onMouseDown={(
          event
        ) => {
          event.stopPropagation();
        }}
      >
        <header
          className={
            styles.header
          }
        >
          <div>
            <span
              className={
                styles.eyebrow
              }
            >
              Account details
            </span>

            <h2
              id="edit-profile-title"
            >
              Edit Profile
            </h2>

            <p
              id="edit-profile-description"
            >
              Keep your public
              information accurate.
            </p>
          </div>

          <button
            type="button"
            className={
              styles.closeButton
            }
            onClick={
              requestClose
            }
            disabled={saving}
            aria-label="Close edit profile"
          >
            <X
              size={19}
              aria-hidden="true"
            />
          </button>
        </header>

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
            <div
              className={
                styles.labelRow
              }
            >
              <label
                htmlFor="edit-profile-name"
              >
                Name
              </label>

              <span>
                {formData.name.length}/
                {NAME_MAX_LENGTH}
              </span>
            </div>

            <input
              ref={nameInputRef}
              id="edit-profile-name"
              type="text"
              name="name"
              placeholder="Your name"
              value={
                formData.name
              }
              onChange={
                handleChange
              }
              maxLength={
                NAME_MAX_LENGTH
              }
              disabled={saving}
              autoComplete="name"
            />
          </div>

          <div
            className={
              styles.field
            }
          >
            <div
              className={
                styles.labelRow
              }
            >
              <label
                htmlFor="edit-profile-username"
              >
                Username
              </label>

              <span>
                {
                  formData
                    .username
                    .length
                }
                /
                {
                  USERNAME_MAX_LENGTH
                }
              </span>
            </div>

            <div
              className={
                styles.usernameInput
              }
            >
              <span
                className={
                  styles.usernamePrefix
                }
                aria-hidden="true"
              >
                @
              </span>

              <input
                id="edit-profile-username"
                type="text"
                name="username"
                placeholder="username"
                value={
                  formData.username
                }
                onChange={
                  handleChange
                }
                maxLength={
                  USERNAME_MAX_LENGTH
                }
                disabled={saving}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />

              {usernameStatus
                .checking && (
                  <LoaderCircle
                    size={17}
                    className={
                      styles.statusSpinner
                    }
                    aria-hidden="true"
                  />
                )}

              {!usernameStatus
                .checking &&
                usernameChanged &&
                usernameStatus
                  .available ===
                true && (
                  <Check
                    size={18}
                    className={
                      styles.availableIcon
                    }
                    aria-hidden="true"
                  />
                )}
            </div>

            <p
              className={`${styles.usernameMessage} ${usernameMessageClass}`}
              role={
                usernameStatus
                  .available ===
                  false
                  ? "alert"
                  : "status"
              }
              aria-live="polite"
            >
              {usernameStatus
                .checking
                ? "Checking username..."
                : usernameStatus
                  .message ||
                "\u00A0"}
            </p>
          </div>

          <div
            className={
              styles.field
            }
          >
            <div
              className={
                styles.labelRow
              }
            >
              <label
                htmlFor="edit-profile-bio"
              >
                Bio
              </label>

              <span>
                {formData.bio.length}/
                {BIO_MAX_LENGTH}
              </span>
            </div>

            <textarea
              id="edit-profile-bio"
              rows={4}
              name="bio"
              placeholder="Tell people something about yourself"
              value={
                formData.bio
              }
              onChange={
                handleChange
              }
              maxLength={
                BIO_MAX_LENGTH
              }
              disabled={saving}
            />
          </div>

          <footer
            className={
              styles.buttons
            }
          >
            <button
              type="button"
              className={
                styles.cancel
              }
              onClick={
                requestClose
              }
              disabled={saving}
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
              {saving && (
                <LoaderCircle
                  size={17}
                  className={
                    styles.saveSpinner
                  }
                  aria-hidden="true"
                />
              )}

              <span>
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </span>
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
};

export default EditProfileModal;