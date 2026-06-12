import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./Profile.css";

function Profile() {

  const { id } = useParams();

  const [profile, setProfile] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);

  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

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

  const currentUserId =
    currentUser?.id || currentUser?._id;


  const isOwnProfile =
    currentUserId === id;


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


const fetchFollowers = async () => {
    try {

      const res = await axios.get(
        `https://pingme-api-new.onrender.com/api/users/followers/${id}`,
        {
          headers: {
            Authorization:
              `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setFollowers(res.data.followers);
      setShowFollowers(true);

    } catch (error) {

      console.log(
        "FOLLOWERS ERROR:",
        error
      );

    }

  };


  const fetchFollowing = async () => {

    try {

      const res = await axios.get(
        `https://pingme-api-new.onrender.com/api/users/following/${id}`,
        {
          headers: {
            Authorization:
              `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setFollowing(res.data.following);
      setShowFollowing(true);

    } catch (error) {

      console.log(
        "FOLLOWING ERROR:",
        error
      );

    }

  };


  // Main Follow / Unfollow

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


  // Follow button inside modal

  const handleModalFollow = async (
    userId,
    isUserFollowing,
    type
  ) => {

    try {

      const url = isUserFollowing
        ? `https://pingme-api-new.onrender.com/api/users/unfollow/${userId}`
        : `https://pingme-api-new.onrender.com/api/users/follow/${userId}`;


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


      if (type === "followers") {

        setFollowers((prev) =>
          prev.map((user) =>
            user._id === userId
              ? {
                  ...user,
                  isFollowing: !isUserFollowing,
                }
              : user
          )
        );

      }


      if (type === "following") {

        setFollowing((prev) =>
          prev.map((user) =>
            user._id === userId
              ? {
                  ...user,
                  isFollowing: !isUserFollowing,
                }
              : user
          )
        );

      }


    } catch (error) {

      console.log(
        "MODAL FOLLOW ERROR:",
        error
      );

    }

  };  // Update Profile
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


      setProfile((prev) => ({
        ...prev,
        ...res.data.user,
      }));


      localStorage.setItem(
        "user",
        JSON.stringify({
          ...currentUser,
          name: res.data.user.name,
          username: res.data.user.username,
          profilePic: res.data.user.profilePic,
        })
      );


      setIsEditing(false);

      alert("Profile updated successfully ✅");


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
            Authorization:
              `Bearer ${localStorage.getItem("token")}`,
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
        {
          isOwnProfile && (
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
          )
        }


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


        {/* Follow / Edit Button */}

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

          <div
            className="stat"
            onClick={fetchFollowers}
          >

            <h3>
              {profile.followersCount}
            </h3>

            <p>
              Followers
            </p>

          </div>


          <div
            className="stat"
            onClick={fetchFollowing}
          >

            <h3>
              {profile.followingCount}
            </h3>

            <p>
              Following
            </p>

          </div>

        </div>
                {/* Followers Modal */}
        {
          showFollowers && (
            <div className="follow-modal">

              <div className="follow-box">

                <h2>Followers</h2>

                {
                  followers.length === 0 ? (

                    <p>No followers yet</p>

                  ) : (

                    followers.map((user) => (

                      <div
                        key={user._id}
                        className="follow-user"
                      >

                        <div className="follow-info">

                          <img
                            src={user.profilePic}
                            alt="Profile"
                            className="follow-image"
                          />

                          <div>
                            <h4>{user.name}</h4>
                            <p>@{user.username}</p>
                          </div>

                        </div>


                        {
                          user._id !== currentUserId && (

                            <button
                              className="follow-small-btn"
                              onClick={() =>
                                handleModalFollow(
                                  user._id,
                                  user.isFollowing,
                                  "followers"
                                )
                              }
                            >

                              {
                                user.isFollowing
                                  ? "Following ✓"
                                  : "Follow +"
                              }

                            </button>

                          )
                        }

                      </div>

                    ))

                  )
                }


                <button
                  className="close-btn"
                  onClick={() =>
                    setShowFollowers(false)
                  }
                >
                  Close
                </button>

              </div>

            </div>
          )
        }


        {/* Following Modal */}

        {
          showFollowing && (

            <div className="follow-modal">

              <div className="follow-box">

                <h2>Following</h2>

                {
                  following.length === 0 ? (

                    <p>
                      Not following anyone
                    </p>

                  ) : (

                    following.map((user) => (

                      <div
                        key={user._id}
                        className="follow-user"
                      >

                        <div className="follow-info">

                          <img
                            src={user.profilePic}
                            alt="Profile"
                            className="follow-image"
                          />

                          <div>

                            <h4>
                              {user.name}
                            </h4>

                            <p>
                              @{user.username}
                            </p>

                          </div>

                        </div>


                        {
                          user._id !== currentUserId && (

                            <button
                              className="follow-small-btn"
                              onClick={() =>
                                handleModalFollow(
                                  user._id,
                                  user.isFollowing,
                                  "following"
                                )
                              }
                            >

                              {
                                user.isFollowing
                                  ? "Following ✓"
                                  : "Follow +"
                              }

                            </button>

                          )
                        }

                      </div>

                    ))

                  )
                }


                <button
                  className="close-btn"
                  onClick={() =>
                    setShowFollowing(false)
                  }
                >
                  Close
                </button>

              </div>

            </div>

          )
        }
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
                      username: e.target.value,
                    })
                  }
                />


                <textarea
                  placeholder="Bio"
                  value={editData.bio}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      bio: e.target.value,
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
                    onClick={handleUpdateProfile}
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