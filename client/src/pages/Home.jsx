import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaCommentDots, FaHome, FaPlusSquare, FaUser } from "react-icons/fa";
import "./Home.css";

function Home() {

  const navigate = useNavigate();

  const user = JSON.parse(
    localStorage.getItem("user")
  );

  const [showHeader, setShowHeader] = useState(true);
  const [lastScroll, setLastScroll] = useState(0);

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


  return (
    <div className="home-container">

      {/* Header */}
      <div className={`home-header ${showHeader ? "show" : "hide"}`}>

        <button className="icon-btn">
          <FaSearch />
        </button>
        <button
          className="icon-btn"
          onClick={() => navigate("/chat")}
        >
          <FaCommentDots />
        </button>

      </div>


      {/* Feed */}
      <div className="feed-container">

        <div className="empty-feed">

          <h2>
            No Posts Yet 📷
          </h2>

          <p>
            Share your first moment ✨
          </p>

        </div>

      </div>


      {/* Bottom Navigation */}
      <div className="bottom-nav">

        <FaHome onClick={() => navigate("/home")} />

        <FaPlusSquare onClick={() => alert("Create Post Coming Soon 🚀")} />

        <FaCommentDots onClick={() => navigate("/chat")} />

        <FaUser
          onClick={() => navigate(`/profile/${user.id}`)}
        />

      </div>

    </div>
  );

}

export default Home;