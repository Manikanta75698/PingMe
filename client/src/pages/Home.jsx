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
  FaComment,
  FaTimes,
  FaBell,
  FaHeart,
  FaRegHeart,
  FaRegComment,
  FaBookmark,
  FaRegBookmark,
  FaEllipsisH
} from "react-icons/fa";
import { FaPlus } from "react-icons/fa";


import "./Home.css";


function Home() {


  const formatTimeAgo = (date) => {

    const seconds =
      Math.floor(
        (new Date() - new Date(date))
        / 1000
      );

    const minutes =
      Math.floor(seconds / 60);

    const hours =
      Math.floor(minutes / 60);

    const days =
      Math.floor(hours / 24);

    if (days > 0)
      return `${days}d`;

    if (hours > 0)
      return `${hours}h`;

    if (minutes > 0)
      return `${minutes}m`;

    return "Just now";
  };
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
  const [stories, setStories] = useState([]);
  const [currentStoryIndex,
    setCurrentStoryIndex] =
    useState(0);
  const [selectedStory, setSelectedStory] =
    useState(null);
  const [showStoryMenu,
    setShowStoryMenu] =
    useState(false);
  const [chatUnreadCount, setChatUnreadCount] =
    useState(0);
  const fileInputRef = useRef(null);

  const [storyImage, setStoryImage] = useState(null);
  const [storyPreview, setStoryPreview] = useState("");
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyReply,
    setStoryReply] =
    useState("");
  const [storyPaused,
    setStoryPaused] =
    useState(false);
  const storyPausedRef = useRef(false);
  const [progress, setProgress] =
    useState(0);

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
  const [userStories, setUserStories] =
    useState([]);

  const sendStoryReply =
    async () => {

      if (!storyReply.trim())
        return;

      try {

        const res = await axios.post(
          "https://pingme-api-new.onrender.com/api/messages",
          {
            sender: user.username,
            receiver: selectedStory?.user?.username,

            text: storyReply,

            storyReply: true,

            storyId:
              selectedStory._id
          }
        );

        console.log("EMITTING:", res.data);

        socket.emit(
          "private_message",
          res.data
        );

        setStoryReply("");

        alert(
          "Reply sent 💬"
        );

      } catch (error) {

        console.log(
          "STORY REPLY ERROR:",
          error
        );

      }

    };

  const myStory = stories.find(
    story =>
      story.user &&
      story.user._id === userId
  );
  const storyMenuRef = useRef(null);

  useEffect(() => {

    const handleOutsideClick = (e) => {

      if (
        storyMenuRef.current &&
        !storyMenuRef.current.contains(e.target)
      ) {

        setShowStoryMenu(false);

      }

    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {

      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

    };

  }, []);

  useEffect(() => {

    socket.on(
      "receive_private_message",
      (data) => {

        console.log(
          "HOME MESSAGE:",
          data
        );

        if (
          data.sender !== user.username
        ) {

          setChatUnreadCount(
            prev => prev + 1
          );

        }

      }
    );

    return () => {

      socket.off(
        "receive_private_message"
      );

    };

  }, []);

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

  const handleStorySelect = (e) => {

    const file = e.target.files[0];

    if (!file) return;

    setStoryImage(file);

    setStoryPreview(
      URL.createObjectURL(file)
    );

  };

  const clearStory = () => {

    setStoryImage(null);

    setStoryPreview("");

  };

  const uploadStory = async () => {

    if (!storyImage) return;

    try {

      setStoryLoading(true);

      const formData =
        new FormData();

      formData.append(
        "image",
        storyImage
      );

      await axios.post(
        "https://pingme-api-new.onrender.com/api/stories/create",
        formData,
        {
          headers: {
            Authorization:
              `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      setStoryImage(null);
      setStoryPreview("");

      fetchStories();

    } catch (error) {

      console.log(
        "STORY ERROR:",
        error
      );

    } finally {

      setStoryLoading(false);

    }

  };

  const fetchStories = async () => {

    try {

      const res = await axios.get(
        "https://pingme-api-new.onrender.com/api/stories",
        {
          headers: {
            Authorization:
              `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      setStories(res.data);

    } catch (error) {

      console.log(
        "STORIES ERROR:",
        error
      );

    }

  };

  const openLikesModal = (post) => {
    setSelectedLikes(
      (post.likes || []).filter(
        (user) => user && user.username
      )
    );

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
        (likeUser) =>
          (likeUser?._id || likeUser)
            ?.toString() === userId.toString()
      );


      const url = alreadyLiked
        ?
        `https://pingme-api-new.onrender.com/api/posts/unlike/${postId}`
        :
        `https://pingme-api-new.onrender.com/api/posts/like/${postId}`;


      setPosts(prevPosts =>
        prevPosts.map(post => {

          if (post._id !== postId)
            return post;

          return {
            ...post,
            likes: alreadyLiked
              ? post.likes.filter(
                (likeUser) =>
                  String(likeUser?._id || likeUser) !==
                  String(userId)
              )
              : [
                ...post.likes,
                {
                  _id: userId,
                  name: user.name,
                  username: user.username,
                  profilePic: user.profilePic
                }
              ]
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
        (likeUser) =>
          String(likeUser?._id || likeUser) ===
          String(userId)
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

  const deleteStory = async () => {

    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this story?"
      );

    if (!confirmDelete) return;

    try {

      await axios.delete(

        `https://pingme-api-new.onrender.com/api/stories/${selectedStory._id}`,

        {
          headers: {
            Authorization:
              `Bearer ${localStorage.getItem("token")}`
          }
        }

      );

      setSelectedStory(null);

      fetchStories();

    } catch (error) {

      console.log(
        "DELETE STORY ERROR:",
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

    fetchStories();

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

  useEffect(() => {

    if (!selectedStory)
      return;

    if (storyPaused)
      return;

    const interval =
      setInterval(() => {

        if (storyPausedRef.current)
          return;

        setProgress(prev => {

          if (prev >= 100) {

            return 100;

          }

          return prev + 2;

        });

      }, 100);

    return () =>
      clearInterval(interval);

  }, [
    selectedStory,
    storyPaused,
    currentStoryIndex,
    userStories
  ]);

  useEffect(() => {

    if (selectedStory) {

      setProgress(0);

    }

  }, [selectedStory]);

  useEffect(() => {

    if (progress < 100)
      return;

    if (
      currentStoryIndex <
      userStories.length - 1
    ) {

      setProgress(0);

      setCurrentStoryIndex(
        prev => prev + 1
      );

      setSelectedStory(
        userStories[
        currentStoryIndex + 1
        ]
      );

    } else {

      setSelectedStory(null);

    }

  }, [
    progress,
    currentStoryIndex,
    userStories
  ]);

  useEffect(() => {

    const handleBack = () => {

      if (selectedStory) {

        setSelectedStory(null);

      }

    };

    window.addEventListener(
      "popstate",
      handleBack
    );

    return () => {

      window.removeEventListener(
        "popstate",
        handleBack
      );

    };

  }, [selectedStory]);




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
          className="desktop-message-btn"
          onClick={() => {
            navigate("/chat");
            setChatUnreadCount(0);
          }}
        >
          <FaCommentDots />
          Messages

          {chatUnreadCount > 0 && (
            <span className="desktop-chat-badge">
              {chatUnreadCount}
            </span>
          )}
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
                onClick={() => navigate("/settings")}
              >
                ⚙️ Settings
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

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleStorySelect}
      />

      <div className="stories-container">

        <div className="story-item">

          <div
            className="story-avatar-wrapper"
            onClick={() => {

              if (myStory) {

                const myStories =
                  stories.filter(
                    s => s?.user?._id === userId
                  );

                setUserStories(myStories);

                setSelectedStory(
                  myStories[0]
                );

                setCurrentStoryIndex(0);

              } else {

                fileInputRef.current.click();

              }

            }}
          >

            {myStory ? (

              <img
                src={user.profilePic}
                alt=""
                className="story-avatar-img"
              />

            ) : (

              <div className="story-avatar add-story">
                <FaPlus />
              </div>

            )}

            {myStory && (

              <div
                className="story-add-btn"
                onClick={(e) => {

                  e.stopPropagation();

                  fileInputRef.current.click();

                }}
              >
                +
              </div>

            )}

          </div>

          <span>Your Story</span>

        </div>

        {
          stories
            .filter(story => story?.user?._id)
            .filter(
              (story, index, self) =>
                index ===
                self.findIndex(
                  s => s?.user?._id === story?.user?._id
                )
            )
            .filter(
              story => story?.user?._id !== userId
            )
            .map((story, index) => (

              <div
                key={story._id}
                className="story-item"
                onClick={() => {

                  const storiesOfUser =
                    stories.filter(
                      s =>
                        s?.user?._id === story?.user?._id
                    );

                  setUserStories(
                    storiesOfUser
                  );

                  setSelectedStory(
                    storiesOfUser[0]
                  );

                  setCurrentStoryIndex(0);

                  window.history.pushState(
                    { story: true },
                    ""
                  );

                }}
              >
                <img
                  src={story.user.profilePic}
                  alt={story.user.name}
                  className="story-avatar-img"
                />

                <span>
                  {story.user.username}
                </span>

              </div>

            ))}

      </div>

      {selectedStory && (

        <div
          className="story-modal"
          onClick={() => {

            setSelectedStory(null);

            window.history.back();

          }}
        >

          <div
            className="story-nav left"
            onClick={(e) => {

              e.stopPropagation();

              if (currentStoryIndex > 0) {

                setCurrentStoryIndex(
                  currentStoryIndex - 1
                );

                setSelectedStory(
                  userStories[
                  currentStoryIndex - 1
                  ]
                );

              }

            }}
          ></div>

          <div
            className="story-nav right"
            onClick={(e) => {

              e.stopPropagation();

              if (
                currentStoryIndex <
                userStories.length - 1
              ) {


                setCurrentStoryIndex(
                  currentStoryIndex + 1
                );

                setSelectedStory(
                  userStories[
                  currentStoryIndex + 1
                  ]
                );

              } else {

                setSelectedStory(null);

                window.history.back();

              }

            }}
          ></div>

          <div className="story-progress-wrapper">

            {userStories.map(
              (story, index) => (

                <div
                  key={story._id}
                  className={
                    index === currentStoryIndex
                      ? "story-progress-current"
                      : index < currentStoryIndex
                        ? "story-progress-active"
                        : "story-progress-inactive"
                  }
                >

                  {index === currentStoryIndex && (

                    <div
                      key={currentStoryIndex}
                      className="story-progress-fill"
                      style={{
                        width: `${progress}%`
                      }}
                    />

                  )}

                </div>

              )
            )}

          </div>

          <div
            className="story-top"
            onClick={(e) => e.stopPropagation()}
          >

            <div
              className="story-profile-link"
              onClick={() => {

                setSelectedStory(null);

                navigate(
                  `/profile/${selectedStory?.user?._id}`
                );

              }}

            >

              <img
                src={selectedStory?.user?.profilePic}
                alt=""
                className="story-user-avatar"
              />

              <div className="story-user-info">
                <h4>{selectedStory?.user?.name}</h4>
                <span>@{selectedStory?.user?.username}</span>
              </div>

            </div>
            <div
              className="story-menu"
              ref={storyMenuRef}
              onClick={(e) => e.stopPropagation()}
            >

              <FaEllipsisH
                className="story-menu-icon"
                onClick={(e) => {

                  e.stopPropagation();

                  setShowStoryMenu(
                    prev => !prev
                  );

                }}
              />

              {showStoryMenu && (

                <div className="story-dropdown">

                  <button
                    onClick={() => {

                      deleteStory();
                      setShowStoryMenu(false);

                    }}
                  >
                    Delete Story
                  </button>

                </div>

              )}

            </div>

          </div>

          <div
            className="story-frame"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <img
              src={selectedStory.image}
              alt="story"
              className="story-modal-image"
            />

            <div
              className="story-reply-box"
              onClick={() => setStoryPaused(true)}
            >

              <input
                type="text"
                placeholder="Reply to story..."
                value={storyReply}
                onChange={(e) =>
                  setStoryReply(
                    e.target.value
                  )
                }
                onFocus={() => {

                  setStoryPaused(true);

                }}
                onBlur={() => {

                  setStoryPaused(false);

                }}
              />

              <button
                onClick={() => {

                  setStoryPaused(false);

                  sendStoryReply();

                }}
              >
                Send
              </button>

            </div>

          </div>
        </div>




      )}

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

              if (!post?.user) return null;

              const isLiked =
                userId &&
                post.likes.some(
                  (likeUser) =>
                    String(likeUser?._id || likeUser) ===
                    String(userId)
                );
              return (

                <div
                  className="post-card"
                  key={post._id}
                >

                  {/* User */}
                  <div
                    className="post-user"
                  >
                    <div
                      className="post-user-left"
                      onClick={() => {

                        if (!post?.user?._id) return;

                        navigate(`/profile/${post.user._id}`);

                      }}
                    >
                      <img
                        src={
                          post.user.profilePic ||
                          "/default-avatar.png"
                        }
                        alt={post.user.name}
                        className="post-profile"
                        onError={(e) => {
                          e.target.src =
                            "/default-avatar.png";
                        }}
                      />

                      <div>
                        <h4>{post.user.name}</h4>
                        <p>
                          @{post.user.username}
                        </p>
                      </div>
                    </div>

                    <div className="post-meta">

                      <span className="post-time">
                        {formatTimeAgo(
                          post.createdAt
                        )}
                      </span>

                      <button
                        className="post-menu-btn"
                      >
                        <FaEllipsisH />
                      </button>

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
                        className="action-btn"
                        onClick={() =>
                          toggleLike(post._id, post.likes)
                        }
                      >
                        {isLiked ? (
                          <FaHeart className="liked-heart" />
                        ) : (
                          <FaRegHeart />
                        )}
                      </button>

                      <button
                        className="action-btn"
                        onClick={() =>
                          document
                            .getElementById(`comment-${post._id}`)
                            ?.focus()
                        }
                      >
                        <FaRegComment />
                      </button>

                    </div>

                    <button
                      className="action-btn"
                      onClick={() =>
                        toggleSave(post._id)
                      }
                    >
                      {savedPosts.includes(post._id)
                        ? <FaBookmark className="saved-icon" />
                        : <FaRegBookmark />}
                    </button>

                  </div>

                  <p
                    className="likes-count"
                    onClick={() => openLikesModal(post)}
                  >
                    {post.likes.length} likes
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

      {
        selectedPost && (
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
        )
      }


      {
        storyPreview && (

          <div className="story-upload-modal">

            <div className="story-upload-box">

              <img
                src={storyPreview}
                alt="preview"
              />

              <div className="story-upload-actions">

                <button
                  className="cancel-story-btn"
                  onClick={clearStory}
                >
                  Cancel
                </button>

                <button
                  className="upload-story-btn"
                  onClick={uploadStory}
                >
                  {
                    storyLoading
                      ? "Uploading..."
                      : "Upload Story"
                  }
                </button>

              </div>

            </div>

          </div>

        )
      }


      {
        showLikesModal && (
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
                selectedLikes
                  .filter(
                    (user) => user && user.username
                  )
                  .map((user) => (
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
        )
      }

      {/* Bottom Navigation */}
      <div className="bottom-nav">

        <FaHome onClick={() => navigate("/home")} />

        <FaPlusSquare
          onClick={() => navigate("/create-post")}
        />

        <div
          className="chat-nav-wrapper"
          onClick={() => navigate("/chat")}
        >
          <FaCommentDots />

          {chatUnreadCount > 0 && (
            <span className="chat-badge">
              {chatUnreadCount}
            </span>
          )}
        </div>

        <FaUser
          onClick={() => navigate(`/profile/${userId}`)}
        />

      </div>


    </div >

  );

}

export default Home;