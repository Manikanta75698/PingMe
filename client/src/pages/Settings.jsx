import "./Settings.css";
import { useState, useRef } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import axios from "axios";
import toast from "react-hot-toast";

export default function Settings() {

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const [name, setName] = useState(
    user.name || ""
  );

  const [username, setUsername] = useState(
    user.username || ""
  );

  const [bio, setBio] = useState(
    user.bio || ""
  );

  const [email] = useState(
    user.email || ""
  );

  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef(null);

  const saveProfile = async () => {

    try {

      setLoading(true);

      const res = await axios.put(
        "https://pingme-api-new.onrender.com/api/users/update",
        {
          name,
          username,
          bio,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      localStorage.setItem(
        "user",
        JSON.stringify(res.data.user)
      );

      toast.success(res.data.message);

    } catch (error) {

      toast.error(
        error.response?.data?.message ||
        "Profile update failed"
      );

    } finally {

      setLoading(false);

    }

  };

  const changePhoto = async (e) => {

    const file = e.target.files[0];

    if (!file) return;

    try {

      const formData = new FormData();

      formData.append(
        "profilePic",
        file
      );

      const res = await axios.put(
        "https://pingme-api-new.onrender.com/api/users/upload",
        formData,
        {
          headers: {
            Authorization:
              `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const updatedUser = {
        ...user,
        profilePic: res.data.profilePic,
      };

      localStorage.setItem(
        "user",
        JSON.stringify(updatedUser)
      );

      toast.success(
        "Profile picture updated"
      );

      window.location.reload();

    } catch (error) {

      toast.error("Upload failed");

    }

  };

  return (

    <div className="settings-page">

      {/* LEFT MENU */}

      <aside className="settings-sidebar">

        <h2>
          ⚙ Settings
        </h2>

        <ul>

          <li className="active">
            👤 Account
          </li>

          <li>
            🔐 Security
          </li>

          <li>
            🎨 Appearance
          </li>

          <li>
            🔔 Notifications
          </li>

          <li>
            🔒 Privacy
          </li>

          <li>
            🚪 Logout
          </li>

        </ul>

      </aside>

      {/* RIGHT */}

      <main className="settings-content">

        <Card className="settings-card">

          <h1>
            Account Settings
          </h1>

          <p>
            Manage your PingMe account information.
          </p>

          <div className="profile-area">

            <img
              src={
                user.profilePic ||
                "/avatar.png"
              }
              alt="Profile"
              className="profile-image"
            />

            <>
              <Button
                variant="outline"
                onClick={() =>
                  fileInputRef.current.click()
                }
              >
                Change Photo
              </Button>

              <input
                type="file"
                accept="image/*"
                hidden
                ref={fileInputRef}
                onChange={changePhoto}
              />
            </>

          </div>

          <Input
            label="Full Name"
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
          />

          <Input
            label="Username"
            value={username}
            onChange={(e) =>
              setUsername(e.target.value)
            }
          />

          <div className="form-group">

            <label>
              Bio
            </label>

            <textarea
              rows={4}
              value={bio}
              placeholder="Tell something about yourself..."
              onChange={(e) =>
                setBio(e.target.value)
              }
            />

          </div>

          <Input
            label="Email"
            value={email}
            disabled
          />

          <Button
            fullWidth
            className="save-btn"
            loading={loading}
            onClick={saveProfile}
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>

        </Card>

      </main>

    </div>

  );

}