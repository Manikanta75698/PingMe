import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import socket from "../socket";
import "./Profile.css";
import {
  FaTh,
  FaBookmark
} from "react-icons/fa";
import { FaTrash } from "react-icons/fa";

function Profile() {

  const { id } = useParams();

  const currentUser = JSON.parse(
    localStorage.getItem("user")
  );

  const [profile, setProfile] = useState(
    currentUser?.id === id ||
      currentUser?._id === id
      ? {
        id: currentUser.id || currentUser._id,
        name: currentUser.name,
        username: currentUser.username,
        profilePic: currentUser.profilePic,
        bio: currentUser.bio || "",
        followersCount: 0,
        followingCount: 0,
      }
      : null
  );
  const [posts, setPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("posts");
  const [selectedPost, setSelectedPost] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [followersLoading, setFollowersLoading] = useState(false);

  const [followingLoading, setFollowingLoading] = useState(false);

  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  const [editData, setEditData] = useState({
    name: "",
    username: "",
    bio: "",
  });

  const [newProfilePic, setNewProfilePic] = useState(null);
  const [previewPic, setPreviewPic] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const currentUserId =
    currentUser?.id || currentUser?._id;


  const isOwnProfile =
    currentUserId === id;

  const fetchProfile = async (showLoader = true) => {

    if (showLoader) {
      setLoading(true);
    }
    try {

      const [res, postRes] = await Promise.all([

        axios.get(
          `https://pingme-api-new.onrender.com/api/users/${id}`,
          {
            headers: {
              Authorization:
                `Bearer ${localStorage.getItem("token")}`,
            },
          }
        ),

        axios.get(
          `https://pingme-api-new.onrender.com/api/posts/user/${id}`,
          {
            headers: {
              Authorization:
                `Bearer ${localStorage.getItem("token")}`,
            },
          }
        ),

      ]);

      setPosts(postRes.data.posts);

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

    } finally {

      setLoading(false);

    }

  };

  const fetchSavedPosts = async () => {
    try {
      const res = await axios.get(
        "https://pingme-api-new.onrender.com/api/posts/saved",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      setSavedPosts(res.data.posts);

    } catch (error) {
      console.log("SAVED POSTS ERROR:", error);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchSavedPosts();
  }, []);

  useEffect(() => {

    socket.on("profile_updated", (data) => {


      if (data.userId === id) {
        fetchProfile(false);
      }

    });


    return () => {

      socket.off("profile_updated");

    };

  }, [id]);

  useEffect(() => {

    socket.on("online_users", (users) => {

      const online = users.some(
        (user) => user.userId === id
      );

      setIsOnline(online);

    });

    return () => {
      socket.off("online_users");
    };

  }, [id]);


  const fetchFollowers = async () => {

    setShowFollowers(true);
    setFollowers([]);
    setFollowersLoading(true);

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
      setFollowersLoading(false);

    } catch (error) {

      console.log(
        "FOLLOWERS ERROR:",
        error
      );

      setFollowersLoading(false);
    }

  };


  const fetchFollowing = async () => {

    setShowFollowing(true);
    setFollowing([]);
    setFollowingLoading(true);

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
      setFollowingLoading(false);

    } catch (error) {

      console.log(
        "FOLLOWING ERROR:",
        error
      );

      setFollowingLoading(false);
    }

  };


  // Main Follow / Unfollow

  const handleFollow = async () => {

    if (followLoading) return;

    setFollowLoading(true);

    const oldFollowing = isFollowing;
    const oldCount = profile.followersCount;

    // Instant UI update
    setIsFollowing(!oldFollowing);

    setProfile((prev) => ({
      ...prev,
      followersCount: oldFollowing
        ? oldCount - 1
        : oldCount + 1,
    }));

    try {

      const url = oldFollowing
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

    } catch (error) {

      console.log(
        "FOLLOW ERROR:",
        error.response?.data || error
      );
      setIsFollowing(oldFollowing);

      setProfile((prev) => ({
        ...prev,
        followersCount: oldCount,
      }));

      alert("Something went wrong ❌");
    }

    finally {

      setFollowLoading(false);

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

  const formatLastSeen = (date) => {

    if (!date) return "Offline";

    const seconds =
      Math.floor(
        (new Date() - new Date(date)) / 1000
      );

    const minutes =
      Math.floor(seconds / 60);

    const hours =
      Math.floor(minutes / 60);

    const days =
      Math.floor(hours / 24);


    if (minutes < 1)
      return "Last seen just now";

    if (minutes < 60)
      return `Last seen ${minutes} min ago`;

    if (hours < 24)
      return `Last seen ${hours} hr ago`;

    return `Last seen ${days} days ago`;

  };


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

  const handleDeletePost = async (postId) => {

    const confirmDelete =
      window.confirm(
        "Delete this post?"
      );

    if (!confirmDelete) return;

    try {

      setDeleteLoading(true);

      await axios.delete(
        `https://pingme-api-new.onrender.com/api/posts/${postId}`,
        {
          headers: {
            Authorization:
              `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      setPosts(prev =>
        prev.filter(
          post => post._id !== postId
        )
      );

      setSelectedPost(null);

      alert("Post deleted 🗑️");

    } catch (error) {

      console.log(
        "DELETE POST ERROR:",
        error
      );

      alert("Delete failed ❌");

    } finally {

      setDeleteLoading(false);

    }

  };

  if (loading) {
    return (
      <div className="profile-skeleton">

        <div className="skeleton-profile-pic"></div>

        <div className="skeleton-name"></div>

        <div className="skeleton-bio"></div>


        <div className="skeleton-stats">

          <div></div>
          <div></div>
          <div></div>

        </div>


        <div className="skeleton-grid">

          {[1, 2, 3, 4, 5, 6].map((item) => (

            <div
              key={item}
              className="skeleton-box"
            ></div>

          ))}

        </div>

      </div>
    );
  }

  return (
    <div className="profile-container">

      <div className="profile-card">

        <div className="profile-top">

          {/* Profile Image */}
          <div>
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
                      profile.profilePic ||
                      "/default-avatar.png"
                    }
                    alt="Profile"
                    className="profile-image"
                    onError={(e) => {
                      e.target.src = "/default-avatar.png";
                    }}
                  />
                </label>
              ) : (
                <img
                  src={profile.profilePic || "/default-avatar.png"}
                  alt="Profile"
                  className="profile-image"
                  onError={(e) => {
                    e.target.src = "/default-avatar.png";
                  }}
                />
              )
            }

          </div>


          {/* Profile Details */}
          <div className="profile-info">

            {/* Name + Button */}
            <div className="profile-header">

              <h1 className="profile-name">
                {profile.name}
              </h1>


              {
                isOwnProfile ? (
                  <button
                    className="follow-btn"
                    onClick={() =>
                      setIsEditing(true)
                    }
                  >
                    Edit Profile
                  </button>
                ) : (
                  <button
                    className="follow-btn"
                    onClick={handleFollow}
                    disabled={followLoading}
                  >
                    {
                      isFollowing
                        ? "Following ✓"
                        : "Follow"
                    }
                  </button>
                )
              }

            </div>


            {/* Username */}
            <h3 className="profile-username">
              @{profile.username}
            </h3>

            <p className="profile-status">

              {
                isOnline ? (
                  "🟢 Online"
                ) : (
                  `⚫ ${formatLastSeen(profile.lastSeen)}`
                )

              }

            </p>


            {/* Bio */}
            <p className="profile-bio">
              {
                profile.bio ||
                "No bio added yet"
              }
            </p>


            {/* Upload Photo */}
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


            {/* Stats */}
            <div className="profile-stats">

              <div>
                <h3>{posts.length}</h3>
                <p>Posts</p>
              </div>

              <div
                onClick={fetchFollowers}
                style={{ cursor: "pointer" }}
              >
                <h3>{profile.followersCount}</h3>
                <p>Followers</p>
              </div>

              <div
                onClick={fetchFollowing}
                style={{ cursor: "pointer" }}
              >
                <h3>{profile.followingCount}</h3>
                <p>Following</p>
              </div>

            </div>

            <div className="profile-tabs">

              <button
                className={activeTab === "posts"
                  ? "active-tab"
                  : ""}
                onClick={() =>
                  setActiveTab("posts")
                }
              >
                <FaTh />
              </button>

              <button
                className={activeTab === "saved"
                  ? "active-tab"
                  : ""}
                onClick={() =>
                  setActiveTab("saved")
                }
              >
                <FaBookmark />
              </button>

            </div>

          </div>

        </div>


        {/* Posts Section */}


        <h3 className="posts-title">
          {activeTab === "posts"
            ? "POSTS"
            : "SAVED POSTS"}
        </h3>

        <div className="profile-posts">

          {(activeTab === "posts"
            ? posts
            : savedPosts
          ).length === 0 ? (

            <div className="no-posts">
              <h2>
                {activeTab === "posts"
                  ? "No posts yet 📷"
                  : "No saved posts 🔖"}
              </h2>
            </div>

          ) : (

            (activeTab === "posts"
              ? posts
              : savedPosts
            ).map((post) => (

              <img
                key={post._id}
                src={post.image}
                alt="Post"
                className="profile-post-image"
                onClick={() => setSelectedPost(post)}
              />

            ))

          )}

        </div>


      </div>

      {isEditing && (
        <div className="edit-modal">

          <div className="edit-box">

            <h2>Edit Profile </h2>

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
      )}

      {selectedPost && (

        <div
          className="post-modal"
          onClick={() =>
            setSelectedPost(null)
          }
        >

          <div
            className="post-modal-content"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <img
              src={selectedPost.image}
              alt="Post"
              className="post-modal-image"
            />

            <div className="post-modal-info">

              <h3>
                @{profile.username}
              </h3>

              <p>
                {selectedPost.caption}
              </p>

              {isOwnProfile && (
                <button
                  className="delete-post-btn"
                  onClick={() =>
                    handleDeletePost(
                      selectedPost._id
                    )
                  }
                  disabled={deleteLoading}
                >
                  <FaTrash />
                  Delete Post
                </button>
              )}
              <button
                className="close-btn"
                onClick={() =>
                  setSelectedPost(null)
                }
              >
                Close
              </button>

            </div>

          </div>

        </div>

      )}

      {showFollowers && (
        <div className="follow-modal">

          <div className="follow-box">

            <h2>
              Followers
            </h2>


            {
              followersLoading ? (

                <p>
                  ⏳ Loading followers...
                </p>

              ) : followers.length === 0 ? (

                <p>
                  No followers yet
                </p>

              ) : (

                followers.map((user) => (

                  <div
                    className="follow-user"
                    key={user._id}
                  >

                    <img
                      src={user.profilePic || "/default-avatar.png"}
                      alt={user.name}
                      className="follow-image"
                      onError={(e) => {
                        e.target.src = "//default-avatar.png";
                      }}
                    />


                    <div
                      style={{
                        flex: 1
                      }}
                    >

                      <h4>
                        {user.name}
                      </h4>


                      <p>
                        @{user.username}
                      </p>

                    </div>


                    {
                      user._id !== currentUserId && (

                        <button
                          className="follow-btn"
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
      )}

      {showFollowing && (
        <div className="follow-modal">

          <div className="follow-box">

            <h2>
              Following
            </h2>

            {
              followingLoading ? (

                <p>
                  ⏳ Loading following...
                </p>

              ) : following.length === 0 ? (

                <p>
                  Not following anyone
                </p>

              ) : (

                following.map((user) => (

                  <div
                    className="follow-user"
                    key={user._id}
                  >

                    <img
                      src={user.profilePic || "/default-avatar.png"}
                      alt={user.name}
                      className="follow-image"
                      onError={(e) => {
                        e.target.src = "/default-avatar.png";
                      }}
                    />


                    <div style={{ flex: 1 }}>

                      <h4>
                        {user.name}
                      </h4>

                      <p>
                        @{user.username}
                      </p>

                    </div>


                    {
                      user._id !== currentUserId && (

                        <button
                          className="follow-btn"
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
      )}

    </div>

  );

}


export default Profile;