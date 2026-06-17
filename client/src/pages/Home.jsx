import { useState, useEffect, useRef } from "react";
import axios from "axios";
import socket from "../socket";
import {
  useNavigate,
  useLocation,
} from "react-router-dom";

import {
  FaSearch,
  FaBars,
  FaMoon,
  FaSun,
  FaSignOutAlt,
  FaHome,
  FaPlusSquare,
  FaCommentDots,
  FaUser,
  FaHeart,
  FaComment,
  FaTimes,
  FaBell,
  FaBookmark
} from "react-icons/fa";

import "./Home.css";


function Home() {

  const navigate = useNavigate();
  const location = useLocation();


  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );


  const userId = user.id || user._id;


  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const [showHeader, setShowHeader] = useState(true);
  const [lastScroll, setLastScroll] = useState(0);

  const [showMenu, setShowMenu] = useState(false);
  const [commentText, setCommentText] = useState({});
  const [savedPosts, setSavedPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [animatedPost, setAnimatedPost] =
    useState(null);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [selectedLikes, setSelectedLikes] = useState([]);

  const menuRef = useRef(null);


  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "true"
  );

  const [showSearch, setShowSearch] =
    useState(false);

  const [searchText, setSearchText] =
    useState("");

  const [searchResults, setSearchResults] =
    useState([]);

  const [searchLoading, setSearchLoading] =
    useState(false);
  const [notifications, setNotifications] =
    useState([]);

  const [unreadCount, setUnreadCount] =
    useState(0);


  // Fetch posts
  const fetchPosts = async () => {

    try {

      const res = await axios.get(
        "https://pingme-api-new.onrender.com/api/posts",
        {
          headers: {
            Authorization:
              `Bearer ${localStorage.getItem("token")}`
          }
        }
      );


      setPosts(res.data.posts);

      const savedRes = await axios.get(
        "https://pingme-api-new.onrender.com/api/posts/saved",
        {
          headers: {
            Authorization:
              `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      setSavedPosts(
        savedRes.data.posts.map(
          post => post._id
        )
      );

    } catch (error) {

      console.log(
        "GET POSTS ERROR:",
        error
      );

    } finally {

      setLoadingPosts(false);

    }

  };

  const openLikesModal = (post) => {
    setSelectedLikes(post.likes || []);
    setShowLikesModal(true);
  };

  const fetchNotifications = async () => {

    try {

      const res = await axios.get(
        "https://pingme-api-new.onrender.com/api/notifications",
        {
          headers: {
            Authorization:
              `Bearer ${localStorage.getItem("token")}`
          }
        }
      );


      setNotifications(
        res.data.notifications
      );


      const unread =
        res.data.notifications.filter(
          (notification) =>
            !notification.isRead
        ).length;


      setUnreadCount(unread);


    } catch (error) {

      console.log(
        "NOTIFICATION ERROR:",
        error
      );

    }

  };


  // Like & Unlike
  const toggleLike = async (
    postId,
    likes
  ) => {


    if (!userId) return;


    try {


      const alreadyLiked = likes.some(
        id =>
          likeUser._id
            ? likeUser._id.toString() === userId.toString()
            : likeUser.toString() === userId.toString()
      );


      const url = alreadyLiked
        ?
        `https://pingme-api-new.onrender.com/api/posts/unlike/${postId}`
        :
        `https://pingme-api-new.onrender.com/api/posts/like/${postId}`;


      // Instant UI update FIRST
      setPosts(prevPosts =>
        prevPosts.map(post => {

          if (post._id !== postId)
            return post;

          return {
            ...post,
            likes: alreadyLiked
              ? post.likes.filter(
                likeUser =>
                  (likeUser._id || likeUser)
                    .toString() !== userId.toString()
              )
              : [...post.likes, userId]
          };
        })
      );

      // API call AFTER
      await axios.post(
        url,
        {},
        {
          headers: {
            Authorization:
              `Bearer ${localStorage.getItem("token")}`
          }
        }
      );


    } catch (error) {


      console.log(
        "LIKE ERROR:",
        error
      );

    }


  };

  const handleDoubleTap = (post) => {

    const alreadyLiked =
      post.likes.some(
        id =>
          id.toString() ===
          userId.toString()
      );

    if (!alreadyLiked) {
      toggleLike(
        post._id,
        post.likes
      );
    }

    setAnimatedPost(post._id);

    setTimeout(() => {
      setAnimatedPost(null);
    }, 800);

  };

  const toggleSave = async (postId) => {

    const alreadySaved =
      savedPosts.includes(postId);

    // Instant UI update
    if (alreadySaved) {

      setSavedPosts(prev =>
        prev.filter(id => id !== postId)
      );

    } else {

      setSavedPosts(prev => [
        ...prev,
        postId
      ]);

    }

    try {

      await axios.post(
        `https://pingme-api-new.onrender.com/api/posts/save/${postId}`,
        {},
        {
          headers: {
            Authorization:
              `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

    } catch (error) {

      console.log(
        "SAVE ERROR:",
        error
      );

    }

  };

  const handleComment = async (postId) => {

    const text = commentText[postId];

    if (!text || !text.trim()) {
      return;
    }

    try {

      await axios.post(
        `https://pingme-api-new.onrender.com/api/posts/comment/${postId}`,
        {
          text: text.trim()
        },
        {
          headers: {
            Authorization:
              `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      setPosts(prevPosts =>
        prevPosts.map(post => {

          if (post._id !== postId)
            return post;

          return {
            ...post,
            comments: [
              ...post.comments,
              {
                _id: Date.now(),
                text: text.trim(),
                user: {
                  username: user.username
                }
              }
            ]
          };
        })
      );

      // Clear input field
      setCommentText(prev => ({
        ...prev,
        [postId]: ""
      }));


    } catch (error) {

      console.log(
        "COMMENT ERROR:",
        error
      );

    }

  };

  // Close menu when clicking outside
  useEffect(() => {

    const handleClickOutside = (event) => {

      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {

        setShowMenu(false);

      }

    };


    document.addEventListener(
      "mousedown",
      handleClickOutside
    );


    return () => {

      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );

    };


  }, []);




  // Hide header on scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowHeader(window.scrollY <= lastScroll);
      setLastScroll(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScroll]);




  // Initial posts fetch
  useEffect(() => {

    fetchPosts();

  }, []);


  useEffect(() => {

    fetchNotifications();

  }, [location]);

  useEffect(() => {

    if (userId && user.username) {

      socket.emit("join", {
        userId: userId,
        username: user.username,
        profilePic: user.profilePic,
      });

      console.log(
        "SOCKET JOIN SENT 🔥",
        user.username
      );

    }

  }, []);

  useEffect(() => {

    const timer = setTimeout(async () => {

      if (!searchText.trim()) {

        setSearchResults([]);
        return;

      }


      try {

        setSearchLoading(true);


        const res = await axios.get(
          `https://pingme-api-new.onrender.com/api/users/search?keyword=${searchText}`,
          {
            headers: {
              Authorization:
                `Bearer ${localStorage.getItem("token")}`
            }
          }
        );


        setSearchResults(
          res.data.users
        );


      } catch (error) {

        console.log(
          "SEARCH ERROR:",
          error
        );

      } finally {

        setSearchLoading(false);

      }


    }, 500);


    return () => clearTimeout(timer);


  }, [searchText]);

  useEffect(() => {

    socket.on(
      "new_notification",
      (notification) => {

        console.log(
          "LIVE NOTIFICATION RECEIVED 🔥",
          notification
        );

        setUnreadCount(
          (prev) => prev + 1
        );

        setNotifications(
          (prev) => [
            notification,
            ...prev,
          ]
        );

      }
    );

    return () => {

      socket.off(
        "new_notification"
      );

    };

  }, []);




  // Dark & Light Theme
  const toggleDarkMode = () => {


    const newMode = !darkMode;


    setDarkMode(newMode);


    localStorage.setItem(
      "darkMode",
      newMode
    );


  };




  // Logout
  const handleLogout = () => {


    localStorage.removeItem("token");

    localStorage.removeItem("user");


    navigate("/");


  };





  return (

    <div
      className={`home-container ${darkMode ? "dark" : ""
        }`}
    >



      {/* Desktop Sidebar */}
      <div className="desktop-sidebar">


        <h1 className="desktop-logo">
          PingMe
        </h1>



        <button
          className="active-nav"
          onClick={() =>
            navigate("/home")
          }
        >

          <FaHome />

          Home

        </button>



        <button
          onClick={() =>
            navigate("/create-post")
          }
        >

          <FaPlusSquare />

          Create

        </button>




        <button
          onClick={() =>
            navigate("/chat")
          }
        >

          <FaCommentDots />

          Messages

        </button>




        <button
          onClick={() =>
            navigate(`/profile/${userId}`)
          }
        >

          <FaUser />

          Profile

        </button>



      </div>




      {/* Header */}
      <div
        className={`home-header ${showHeader ? "show" : "hide"
          }`}
      >

        <button
          className="icon-btn"
          onClick={() =>
            setShowSearch(true)
          }
        >

          <FaSearch />

        </button>

        <h1 className="app-title">
          PingMe
        </h1>

        <div
          className="menu-container"
          ref={menuRef}
        >

          <button
            className="notification-btn"
            onClick={() =>
              navigate("/notifications")
            }
          >

            <FaBell />

            {unreadCount > 0 && (
              <span className="notification-badge">
                {unreadCount}
              </span>
            )}

          </button>

          <button
            className="icon-btn"
            onClick={() =>
              setShowMenu(!showMenu)
            }
          >
            <FaBars />

          </button>



          {showMenu && (

            <div className="home-dropdown">


              <button
                onClick={toggleDarkMode}
              >


                {darkMode ? (

                  <>

                    <FaSun />

                    Light

                  </>

                ) : (

                  <>

                    <FaMoon />

                    Dark

                  </>

                )}


              </button>



              <button
                onClick={handleLogout}
              >


                <FaSignOutAlt />

                Logout


              </button>


            </div>

          )}


        </div>


      </div>

      {
        showSearch && (

          <div className="search-overlay">

            <div className="search-box">


              {/* Top bar */}
              <div className="search-header">

                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchText}
                  onChange={(e) =>
                    setSearchText(e.target.value)
                  }
                />


                <button
                  onClick={() => {

                    setShowSearch(false);

                    setSearchText("");

                    setSearchResults([]);

                  }}
                >

                  <FaTimes />

                </button>

              </div>


              {/* Loading */}
              {
                searchLoading && (

                  <p className="search-message">
                    Searching...
                  </p>

                )
              }


              {/* No results */}
              {
                !searchLoading &&
                searchText &&
                searchResults.length === 0 && (

                  <p className="search-message">

                    No users found 😢

                  </p>

                )
              }


              {/* User results */}
              {
                searchResults.map((person) => (

                  <div
                    key={person._id}
                    className="search-user"

                    onClick={() => {

                      navigate(
                        `/profile/${person._id}`
                      );

                      setShowSearch(false);

                    }}

                  >

                    <img
                      src={person.profilePic}
                      alt={person.name}
                    />


                    <div>

                      <h4>
                        {person.name}
                      </h4>

                      <p>
                        @{person.username}
                      </p>

                    </div>

                  </div>

                ))
              }

            </div>

          </div>

        )
      }



      {/* Feed Start */}
      <div className="feed-container">


        {
          loadingPosts ? (

            <div className="skeleton-container">

              {
                [1, 2].map(item => (

                  <div
                    className="skeleton-post"
                    key={item}
                  >


                    <div className="skeleton-header">

                      <div className="skeleton-profile"></div>


                      <div className="skeleton-text">

                        <div></div>

                        <div></div>

                      </div>


                    </div>


                    <div className="skeleton-image"></div>


                    <div className="skeleton-caption"></div>


                  </div>

                ))
              }


            </div>

          ) : posts.length === 0 ? (

            <div className="empty-feed">

              <h2>
                No Posts Yet 📷
              </h2>

              <p>
                Share your first moment ✨
              </p>

            </div>

          ) : (

            posts.map((post) => {

              const isLiked =
                post.likes.some(
                  likeUser =>
                    likeUser?._id?.toString() ===
                    userId?.toString()
                );
              return (

                <div
                  className="post-card"
                  key={post._id}
                >


                  {/* User */}
                  <div
                    className="post-user"
                    onClick={() =>
                      navigate(`/profile/${post.user._id}`)
                    }
                  >

                    <img
                      src={post.user.profilePic || "/default-avatar.png"}
                      alt={post.user.name}
                      className="post-profile"
                      onError={(e) => {
                        e.target.src = "/default-avatar.png";
                      }}
                    />

                    <div>

                      <h4>
                        {post.user.name}
                      </h4>

                      <p>
                        @{post.user.username}
                      </p>

                    </div>

                  </div>


                  {/* Post Image */}
                  <div className="post-image-wrapper">

                    <img
                      src={post.image}
                      alt="Post"
                      className="post-image"
                      onDoubleClick={() =>
                        handleDoubleTap(post)
                      }
                    />

                    {animatedPost === post._id && (
                      <FaHeart className="heart-animation" />
                    )}

                  </div>


                  {/* Like */}
                  <div className="post-actions">

                    <div className="left-actions">

                      <button
                        className={`like-btn ${isLiked ? "liked" : ""}`}
                        onClick={() =>
                          toggleLike(post._id, post.likes)
                        }
                      >
                        <FaHeart />
                      </button>

                      <button
                        className="comment-btn"
                        onClick={() =>
                          document
                            .getElementById(`comment-${post._id}`)
                            ?.focus()
                        }
                      >
                        <FaComment />
                      </button>

                    </div>

                    <button
                      title={
                        savedPosts.includes(post._id)
                          ? "Saved"
                          : "Save Post"
                      }
                      className={`save-btn ${savedPosts.includes(post._id)
                        ? "saved"
                        : ""
                        }`}
                      onClick={() =>
                        toggleSave(post._id)
                      }
                    >
                      <FaBookmark />
                    </button>

                  </div>

                  <p
                    className="likes-count"
                    onClick={() => openLikesModal(post)}
                  >
                    ❤️ {post.likes.length} likes
                  </p>

                  {/* Caption */}
                  <p className="post-caption">
                    {post.caption}
                  </p>

                  <div className="comments-list">

                    {post.comments.length > 2 && (
                      <p
                        className="view-comments"
                        onClick={() => setSelectedPost(post)}
                      >
                        View all {post.comments.length} comments
                      </p>
                    )}

                    {post.comments.slice(-2).map((comment) => (
                      <p key={comment._id}>
                        <strong>{comment.user?.username}</strong>
                        {" "}
                        {comment.text}
                      </p>
                    ))}

                  </div>

                  <div className="comment-input-container">

                    <input
                      id={`comment-${post._id}`}
                      type="text"
                      placeholder="Write a comment..."
                      value={commentText[post._id] || ""}
                      onChange={(e) =>
                        setCommentText({
                          ...commentText,
                          [post._id]: e.target.value
                        })
                      }
                    />

                    <button
                      onClick={() =>
                        handleComment(post._id)
                      }
                    >
                      Post
                    </button>

                  </div>

                </div>

              );

            })

          )

        }

      </div>

      {selectedPost && (
        <div
          className="comments-modal"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="comments-box"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Comments</h3>

            {selectedPost.comments.map((comment) => (
              <p key={comment._id}>
                <strong>{comment.user?.username}</strong>
                {" "}
                {comment.text}
              </p>
            ))}

            <button
              onClick={() => setSelectedPost(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showLikesModal && (
        <div
          className="comments-modal"
          onClick={() => setShowLikesModal(false)}
        >
          <div
            className="comments-box"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>❤️ Likes</h3>

            {selectedLikes.length === 0 ? (
              <p>No likes yet</p>
            ) : (
              selectedLikes.map((user) => (
                <div
                  key={user._id}
                  className="search-user"
                  onClick={() => {
                    navigate(`/profile/${user._id}`);
                    setShowLikesModal(false);
                  }}
                >
                  <img
                    src={
                      user.profilePic ||
                      "/default-avatar.png"
                    }
                    alt={user.name}
                  />

                  <div>
                    <h4>{user.name}</h4>
                    <p>@{user.username}</p>
                  </div>
                </div>
              ))
            )}

            <button
              onClick={() =>
                setShowLikesModal(false)
              }
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="bottom-nav">

        <FaHome onClick={() => navigate("/home")} />

        <FaPlusSquare
          onClick={() => navigate("/create-post")}
        />

        <FaCommentDots
          onClick={() => navigate("/chat")}
        />

        <FaUser
          onClick={() => navigate(`/profile/${userId}`)}
        />

      </div>


    </div>

  );

}

export default Home;