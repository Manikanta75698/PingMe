import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./Profile.css";

function Profile() {
  const { id } = useParams();

  const [profile, setProfile] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [editData, setEditData] = useState({
    name: "",
    username: "",
    bio: "",
  });

  const [newProfilePic, setNewProfilePic] = useState(null);
  const [previewPic, setPreviewPic] = useState("");

  const currentUser = JSON.parse(
    localStorage.getItem("user")
  );

  const isOwnProfile =
    currentUser?.id === id ||
    currentUser?._id === id;


  useEffect(() => {

    const fetchProfile = async () => {
      try {

        const res = await axios.get(
          `https://pingme-api-new.onrender.com/api/users/${id}`,
          {
            headers: {
              Authorization:
                `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );


        setProfile(res.data.user);

        setIsFollowing(
          res.data.user.isFollowing
        );


        setEditData({
          name: res.data.user.name || "",
          username: res.data.user.username || "",
          bio: res.data.user.bio || "",
        });

      } catch (error) {

        console.log(
          "PROFILE ERROR:",
          error
        );
      }
    };


    fetchProfile();

  }, [id]);


  // Follow / Unfollow
  const handleFollow = async () => {

    try {

      const url = isFollowing
        ? `https://pingme-api-new.onrender.com/api/users/unfollow/${id}`
        : `https://pingme-api-new.onrender.com/api/users/follow/${id}`;


      await axios.put(
        url,
        {},
        {
          headers: {
            Authorization:
              `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );


      setIsFollowing(!isFollowing);


      setProfile((prev) => ({
        ...prev,
        followersCount: isFollowing
          ? prev.followersCount - 1
          : prev.followersCount + 1,
      }));


    } catch (error) {

      console.log(
        "FOLLOW ERROR:",
        error
      );

    }

  };


  // Update Profile
  const handleUpdateProfile = async () => {

    try {

      const res = await axios.put(
        "https://pingme-api-new.onrender.com/api/users/update",
        editData,
        {
          headers: {
            Authorization:
              `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );


      setProfile(res.data.user);


      localStorage.setItem(
        "user",
        JSON.stringify({
          ...currentUser,
          name: res.data.user.name,
          username: res.data.user.username,
        })
      );


      setIsEditing(false);

      alert(
        "Profile updated successfully ✅"
      );


    } catch (error) {

      console.log(
        "UPDATE ERROR:",
        error
      );

      alert(
        error.response?.data?.message ||
        "Update failed"
      );
    }
  };
  // Upload Profile Picture
  const handleProfilePicUpload = async () => {
    try {
      const formData = new FormData();

      formData.append(
        "profilePic",
        newProfilePic
      );

      const res = await axios.put(
        "https://pingme-api-new.onrender.com/api/users/upload",
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setProfile((prev) => ({
        ...prev,
        profilePic: res.data.profilePic,
      }));

      localStorage.setItem(
        "user",
        JSON.stringify({
          ...currentUser,
          profilePic: res.data.profilePic,
        })
      );

      setNewProfilePic(null);
      setPreviewPic("");

      alert("Profile picture updated ✅");

    } catch (error) {
      console.log(
        "PROFILE PIC ERROR:",
        error
      );

      alert("Upload failed ❌");
    }
  };
  if (!profile) {
    return <h2>Loading profile...</h2>;
  }


  return (
    <div className="profile-container">
      <div className="profile-card">

        {/* Profile Image */}
        {isOwnProfile && (
          <input
            type="file"
            id="profilePicInput"
            hidden
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];

              if (file) {
                setNewProfilePic(file);
                setPreviewPic(
                  URL.createObjectURL(file)
                );
              }
            }}
          />
        )}
        {
          isOwnProfile ? (
            <label htmlFor="profilePicInput">
              <img
                src={
                  previewPic ||
                  profile.profilePic
                }
                alt="Profile"
                className="profile-image"
              />
            </label>
          ) : (
            <img
              src={profile.profilePic}
              alt="Profile"
              className="profile-image"
            />
          )
        }

        {/* Upload Button */}
        {
          isOwnProfile &&
          newProfilePic && (
            <button
              className="follow-btn"
              onClick={handleProfilePicUpload}
            >
              📤 Upload Photo
            </button>
          )
        }


        <h1 className="profile-name">
          {profile.name}
        </h1>


        <h3 className="profile-username">
          @{profile.username}
        </h3>


        <p className="profile-bio">
          {
            profile.bio ||
            "No bio added yet"
          }
        </p>


        {/* Edit / Follow */}
        {
          isOwnProfile ? (
            <button
              className="follow-btn"
              onClick={() =>
                setIsEditing(true)
              }
            >
              ✏️ Edit Profile
            </button>
          ) : (
            <button
              className="follow-btn"
              onClick={handleFollow}
            >
              {
                isFollowing
                  ? "Following ✓"
                  : "Follow +"
              }
            </button>
          )
        }


        {/* Stats */}
        <div className="profile-stats">

          <div className="stat">
            <h3>
              {profile.followersCount}
            </h3>
            <p>Followers</p>
          </div>


          <div className="stat">
            <h3>
              {profile.followingCount}
            </h3>
            <p>Following</p>
          </div>

        </div>


        {/* Edit Modal */}
        {
          isEditing && (
            <div className="edit-modal">

              <div className="edit-box">

                <h2>
                  Edit Profile ✏️
                </h2>


                <input
                  type="text"
                  placeholder="Name"
                  value={editData.name}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      name: e.target.value,
                    })
                  }
                />


                <input
                  type="text"
                  placeholder="Username"
                  value={editData.username}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      username:
                        e.target.value,
                    })
                  }
                />


                <textarea
                  placeholder="Bio"
                  value={editData.bio}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      bio:
                        e.target.value,
                    })
                  }
                />


                <div className="edit-buttons">

                  <button
                    className="cancel-btn"
                    onClick={() =>
                      setIsEditing(false)
                    }
                  >
                    Cancel
                  </button>


                  <button
                    className="save-btn"
                    onClick={
                      handleUpdateProfile
                    }
                  >
                    Save
                  </button>

                </div>

              </div>

            </div>
          )
        }

      </div>
    </div>
  );
}

export default Profile;