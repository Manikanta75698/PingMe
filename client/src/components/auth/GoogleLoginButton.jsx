import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import { googleLogin } from "../../services/authService";

const GoogleLoginButton = () => {
  const navigate = useNavigate();

  const { setUser } = useAuth();

  const handleSuccess = async (credentialResponse) => {
    try {
      const response = await googleLogin(
        credentialResponse.credential
      );

      localStorage.setItem(
        "token",
        response.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(response.user)
      );

      setUser(response.user);

      navigate("/home");

    } catch (error) {
      alert(
        error.response?.data?.message ||
        "Google Login Failed"
      );
    }
  };

  const handleError = () => {
    alert("Google Login Failed");
  };

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={handleError}
      theme="outline"
      shape="pill"
      size="large"
      text="continue_with"
    />
  );
};

export default GoogleLoginButton;