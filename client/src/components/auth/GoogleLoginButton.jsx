import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { googleLogin } from "../../services/authService";

const GoogleLoginButton = ({
  disabled = false,
}) => {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleSuccess = async (
    credentialResponse
  ) => {
    try {
      const credential =
        credentialResponse?.credential;

      if (!credential) {
        throw new Error(
          "Google credential missing"
        );
      }

      const response =
        await googleLogin({
          credential,
        });

      if (
        !response?.token ||
        !response?.user
      ) {
        throw new Error(
          "Invalid Google login response"
        );
      }

      localStorage.setItem(
        "token",
        response.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(
          response.user
        )
      );

      setUser(response.user);

      navigate("/home", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "GOOGLE LOGIN ERROR:",
        error.response?.data ||
        error.message
      );
    }
  };

  return (
    <div
      style={{
        pointerEvents: disabled
          ? "none"
          : "auto",
        opacity: disabled
          ? 0.6
          : 1,
      }}
    >
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => {
          console.error(
            "Google login failed"
          );
        }}
        useOneTap={false}
      />
    </div>
  );
};

export default GoogleLoginButton;