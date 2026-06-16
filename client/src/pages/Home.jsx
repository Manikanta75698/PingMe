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
  FaBell
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


    } catch (error) {

      console.log(
        "GET POSTS ERROR:",
        error
      );

    } finally {

      setLoadingPosts(false);

    }

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
          id.toString() === userId.toString()
      );


      const url = alreadyLiked
        ?
        `https://pingme-api-new.onrender.com/api/posts/unlike/${postId}`
        :
        `https://pingme-api-new.onrender.com/api/posts/like/${postId}`;


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


      // Instant UI update
      setPosts(prevPosts =>
        prevPosts.map(post => {


          if (post._id !== postId)
            return post;


          return {

            ...post,


            likes: alreadyLiked
              ?
              post.likes.filter(
                id =>
                  id.toString() !== userId.toString()
              )
              :
              [
                ...post.likes,
                userId
              ]

          };


        })
      );


    } catch (error) {


      console.log(
        "LIKE ERROR:",
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


      // Refresh posts to get new comments
      fetchPosts();


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
                userId &&
                post.likes.some(
                  id =>
                    id.toString() === userId.toString()
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
                      src={post.user.profilePic}
                      alt={post.user.name}
                      className="post-profile"
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
                  <img
                    src={post.image}
                    alt="Post"
                    className="post-image"
                  />


                  {/* Like */}
                  <div className="post-actions">

                    <button
                      className={`like-btn ${isLiked ? "liked" : ""}`}
                      onClick={() =>
                        toggleLike(post._id, post.likes)
                      }
                    >

                      <FaHeart />

                      <span>
                        {post.likes.length}
                      </span>

                    </button>


                    <button className="comment-btn">

                      <FaComment />

                      <span>
                        {post.comments.length}
                      </span>

                    </button>

                  </div>

                  <div className="comment-input-container">

                    <input
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
                  <div className="comments-list">

                    {
                      post.comments.map((comment) => (

                        <p key={comment._id}>

                          <strong>
                            {comment.user?.username}
                          </strong>
                          {" "}
                          {comment.text}

                        </p>

                      ))
                    }

                  </div>
                  {/* Caption */}
                  <p className="post-caption">
                    {post.caption}
                  </p>


                </div>

              );

            })

          )

        }

      </div>

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