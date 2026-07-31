import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  Link,
} from "react-router-dom";

import AuthLayout from "../../../layouts/auth-layout";
import Logo from "../../../components/ui/logo";
import Input from "../../../components/ui/input";
import Button from "../../../components/ui/button";

import GoogleLoginButton from "../../../components/auth/GoogleLoginButton";

import {
  useToastContext,
} from "../../../components/ui/toast/ToastProvider";

import {
  registerUser,
  checkUsernameAvailability,
} from "../../../services/authService";

import styles from "./Register.module.css";

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const USERNAME_DEBOUNCE_MS = 800;

const getUsernameAvailability = (
  response
) => {
  return (
    response?.available ??
    response?.data?.available ??
    response?.data?.data?.available ??
    false
  );
};

const getUsernameMessage = (
  response,
  available
) => {
  return (
    response?.message ||
    response?.data?.message ||
    response?.data?.data?.message ||
    (available
      ? "Username is available"
      : "Username is already taken")
  );
};

const Register = () => {
  const navigate =
    useNavigate();

  const toast =
    useToastContext();

  /*
   * Latest username request ni track
   * chesthundi. Old API response vachina
   * current username state ni overwrite
   * cheyyakunda prevent chesthundi.
   */
  const usernameRequestRef =
    useRef(0);

  const lastCheckedUsernameRef =
    useRef("");

  const [
    formData,
    setFormData,
  ] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  /*
   * Registration submit loading matrame.
   * Username checking kosam idi use cheyyamu.
   */
  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    usernameStatus,
    setUsernameStatus,
  ] = useState({
    checking: false,
    available: null,
    message: "",
  });

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
      /*
       * Username input enter chesthunappude
       * normalize chestham.
       *
       * Invalid characters UI lo enter
       * avvakunda prevent chesthundi.
       */
      const cleanUsername =
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

      setFormData(
        (previous) => ({
          ...previous,
          username:
            cleanUsername,
        })
      );

      /*
       * Previous username result immediate
       * ga clear chestham. Main page loading
       * or page loader trigger avvadu.
       */
      setUsernameStatus({
        checking: false,
        available: null,
        message: "",
      });

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
     USERNAME AVAILABILITY
     DEBOUNCED CHECK
  ========================= */

  useEffect(() => {
    const username =
      formData.username
        .trim()
        .toLowerCase();

    /*
     * Previous pending request stale
     * response ni invalidate chestham.
     */
    usernameRequestRef.current += 1;

    const currentRequestId =
      usernameRequestRef.current;

    if (!username) {
      lastCheckedUsernameRef.current =
        "";

      setUsernameStatus({
        checking: false,
        available: null,
        message: "",
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
        available: null,
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

    /*
     * Same username already successfully
     * check ayithe duplicate API call vaddu.
     */
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
           * Main visible message ni
           * "Checking..." ga marchamu.
           * Kabatti form/page blink avvadu.
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

            /*
             * User meanwhile vere username
             * type chesunte old response ignore.
             */
            if (
              currentRequestId !==
              usernameRequestRef.current
            ) {
              return;
            }

            const available =
              Boolean(
                getUsernameAvailability(
                  response
                )
              );

            lastCheckedUsernameRef.current =
              username;

            setUsernameStatus({
              checking: false,
              available,
              message:
                getUsernameMessage(
                  response,
                  available
                ),
            });
          } catch (error) {
            if (
              currentRequestId !==
              usernameRequestRef.current
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
  ]);

  /* =========================
     REGISTER
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
        formData.username
          .trim()
          .toLowerCase();

      const cleanEmail =
        formData.email
          .trim()
          .toLowerCase();

      if (
        !cleanName ||
        !cleanUsername ||
        !cleanEmail ||
        !formData.password ||
        !formData.confirmPassword
      ) {
        toast.warning(
          "Please fill in all fields"
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
        usernameStatus.available !==
        true
      ) {
        toast.warning(
          usernameStatus.message ||
          "Please choose an available username"
        );

        return;
      }

      if (
        formData.password !==
        formData.confirmPassword
      ) {
        toast.warning(
          "Passwords do not match"
        );

        return;
      }

      if (
        formData.password.length <
        8
      ) {
        toast.warning(
          "Password must be at least 8 characters"
        );

        return;
      }

      if (
        !/[A-Z]/.test(
          formData.password
        )
      ) {
        toast.warning(
          "Password must contain at least one uppercase letter"
        );

        return;
      }

      if (
        !/[a-z]/.test(
          formData.password
        )
      ) {
        toast.warning(
          "Password must contain at least one lowercase letter"
        );

        return;
      }

      if (
        !/\d/.test(
          formData.password
        )
      ) {
        toast.warning(
          "Password must contain at least one number"
        );

        return;
      }

      try {
        setLoading(true);

        const response =
          await registerUser({
            name: cleanName,
            username:
              cleanUsername,
            email: cleanEmail,
            password:
              formData.password,
          });

        if (
          response
            ?.requiresVerification
        ) {
          toast.success(
            response?.message ||
            "Verification code sent to your email"
          );

          navigate(
            "/otp",
            {
              replace: true,

              state: {
                email:
                  cleanEmail,
              },
            }
          );

          return;
        }

        toast.success(
          response?.message ||
          "Account created successfully"
        );

        navigate(
          "/",
          {
            replace: true,
          }
        );
      } catch (error) {
        console.error(
          "REGISTER ERROR:",
          error?.response?.data ||
          error?.message
        );

        const errorData =
          error?.response?.data;

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
          "Unable to create account"
        );
      } finally {
        setLoading(false);
      }
    };

  /* =========================
     USERNAME STATUS UI
  ========================= */

  const usernameMessageClass =
    usernameStatus.available ===
      true
      ? styles.usernameAvailable
      : usernameStatus.available ===
        false
        ? styles.usernameTaken
        : styles.usernameNeutral;

  const usernameMessage =
    usernameStatus.available ===
      true
      ? `✓ ${usernameStatus.message}`
      : usernameStatus.available ===
        false
        ? `✕ ${usernameStatus.message}`
        : usernameStatus.message;

  return (
    <AuthLayout>
      <div
        className={
          styles.container
        }
      >
        <Logo size="xl" />

        <div
          className={
            styles.heading
          }
        >
          <h1>
            Create Account
          </h1>

          <p>
            Join Nexora and connect
            with friends
          </p>
        </div>

        <form
          className={
            styles.form
          }
          onSubmit={
            handleSubmit
          }
          noValidate
        >
          <Input
            label="Full Name"
            name="name"
            value={
              formData.name
            }
            onChange={
              handleChange
            }
            placeholder="Enter your full name"
            autoComplete="name"
            disabled={loading}
          />

          <div
            className={
              styles.usernameField
            }
          >
            <Input
              label="Username"
              name="username"
              value={
                formData.username
              }
              onChange={
                handleChange
              }
              placeholder="Choose username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              disabled={loading}
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

          <Input
            label="Email Address"
            name="email"
            type="email"
            value={
              formData.email
            }
            onChange={
              handleChange
            }
            placeholder="Enter your email"
            autoComplete="email"
            disabled={loading}
          />

          <Input
            label="Password"
            name="password"
            type="password"
            value={
              formData.password
            }
            onChange={
              handleChange
            }
            placeholder="Create password"
            autoComplete="new-password"
            disabled={loading}
          />

          <Input
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            value={
              formData.confirmPassword
            }
            onChange={
              handleChange
            }
            placeholder="Confirm password"
            autoComplete="new-password"
            disabled={loading}
          />

          <Button
            fullWidth
            type="submit"
            disabled={
              loading ||
              usernameStatus.checking ||
              usernameStatus.available ===
              false
            }
          >
            {loading
              ? "Creating Account..."
              : usernameStatus.checking
                ? "Checking Username..."
                : "Create Account"}
          </Button>
        </form>

        <div
          className={
            styles.divider
          }
        >
          <span>OR</span>
        </div>

        <div
          className={
            styles.googleLogin
          }
        >
          <GoogleLoginButton />
        </div>

        <p
          className={
            styles.footer
          }
        >
          Already have an
          account?{" "}

          <Link to="/">
            Login
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default Register;