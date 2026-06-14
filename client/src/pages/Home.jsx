import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  FaSearch,
  FaBars,
  FaMoon,
  FaSun,
  FaSignOutAlt,
  FaHome,
  FaPlusSquare,
  FaCommentDots,
  FaUser
} from "react-icons/fa";
import "./Home.css";

function Home() {

  const navigate = useNavigate();

  const user = JSON.parse(
    localStorage.getItem("user")
  );

  const [showHeader, setShowHeader] = useState(true);
  const [lastScroll, setLastScroll] = useState(0);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "true"
  );

  const fetchPosts = async () => {

    try {

      const res = await axios.get(
        "https://pingme-api-new.onrender.com/api/posts",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
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

  const toggleDarkMode = () => {
    const newMode = !darkMode;

    setDarkMode(newMode);

    localStorage.setItem(
      "darkMode",
      newMode
    );
  };
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/");
  };

  useEffect(() => {

    const handleScroll = () => {

      const currentScroll = window.scrollY;

      if (currentScroll > lastScroll) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }

      setLastScroll(currentScroll);
    };

    window.addEventListener("scroll", handleScroll);

    return () =>
      window.removeEventListener(
        "scroll",
        handleScroll
      );

  }, [lastScroll]);

  useEffect(() => {

    fetchPosts();

  }, []);
  return (
    <div
      className={`home-container ${darkMode ? "dark" : ""}`}
    >

      <div className="desktop-sidebar">

        <h1 className="desktop-logo">
          PingMe
        </h1>

        <button
          className="active-nav"
          onClick={() => navigate("/home")}
        >
          <FaHome /> Home
        </button>

        <button onClick={() => navigate("/create-post")}>
          <FaPlusSquare /> Create
        </button>

        <button onClick={() => navigate("/chat")}>
          <FaCommentDots /> Messages
        </button>

        <button
          onClick={() => navigate(`/profile/${user.id || user._id}`)}
        >
          <FaUser /> Profile
        </button>

      </div>

      {/* Header */}
      <div className={`home-header ${showHeader ? "show" : "hide"}`}>

        <button className="icon-btn">
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
            className="icon-btn"
            onClick={() =>
              setShowMenu(!showMenu)
            }
          >
            <FaBars />
          </button>


          {showMenu && (
            <div className="home-dropdown">

              <button onClick={toggleDarkMode}>
                {darkMode ? (
                  <>
                    <FaSun /> Light
                  </>
                ) : (
                  <>
                    <FaMoon /> Dark
                  </>
                )}
              </button>


              <button onClick={handleLogout}>
                <FaSignOutAlt />
                Logout
              </button>

            </div>
          )}

        </div>

      </div>


      {/* Feed */}
      <div className="feed-container">

        {
          loadingPosts ? (

            <div className="skeleton-container">

              {[1, 2].map((item) => (

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

              ))}

            </div>

          ) : posts.length === 0 ? (

            <div className="empty-feed">

              <h2>No Posts Yet 📷</h2>

              <p>
                Share your first moment ✨
              </p>

            </div>

          ) : (

            posts.map((post) => (

              <div
                className="post-card"
                key={post._id}
              >

                <div className="post-user">

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


                <img
                  src={post.image}
                  alt="Post"
                  className="post-image"
                />


                <p className="post-caption">

                  {post.caption}

                </p>

              </div>

            ))

          )
        }

      </div>

      {/* Bottom Navigation */}
      <div className="bottom-nav">

        <FaHome onClick={() => navigate("/home")} />

        <FaPlusSquare
          onClick={() => navigate("/create-post")}
        />
        <FaCommentDots onClick={() => navigate("/chat")} />

        <FaUser
          onClick={() => navigate(`/profile/${user.id || user._id}`)}
        />

      </div>

    </div>
  );

}

export default Home;