import "./Settings.css";

export default function Settings() {

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

        <div className="settings-card">

          <h1>
            Account Settings
          </h1>

          <p>
            Manage your PingMe account information.
          </p>

          <div className="profile-area">

            <img
              src="/avatar.png"
              alt="Profile"
              className="profile-image"
            />

            <button>
              Change Photo
            </button>

          </div>

          <div className="form-group">

            <label>
              Full Name
            </label>

            <input
              type="text"
              placeholder="Your Name"
            />

          </div>

          <div className="form-group">

            <label>
              Username
            </label>

            <input
              type="text"
              placeholder="@username"
            />

          </div>

          <div className="form-group">

            <label>
              Bio
            </label>

            <textarea
              rows="4"
              placeholder="Tell something about yourself..."
            />

          </div>

          <div className="form-group">

            <label>
              Email
            </label>

            <input
              type="email"
              placeholder="email@example.com"
            />

          </div>

          <button className="save-btn">
            Save Changes
          </button>

        </div>

      </main>

    </div>

  );

}