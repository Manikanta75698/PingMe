import { useNavigate } from "react-router-dom";

function Chat() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div style={{ padding: "30px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>PingMe Chat 💬</h1>

        <button
          onClick={handleLogout}
          style={{
            padding: "10px 15px",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>

      <p>Welcome to PingMe!</p>
    </div>
  );
}

export default Chat;