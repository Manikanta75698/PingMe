import { useRef, useEffect, useState } from "react";
import styles from "./Home.module.css";
import Header from "../../components/home/Header";
import Stories from "../../components/home/Stories";
import Feed from "../../components/home/Feed";

const Home = () => {
  const feedRef = useRef();

  const [scrollPos, setScrollPos] = useState(0);

  useEffect(() => {
    const handlePostRefresh = () => {
      feedRef.current?.refreshFeed();
    };

    window.addEventListener("postCreated", handlePostRefresh);
    return () => window.removeEventListener("postCreated", handlePostRefresh);
  }, []);

  const handleScroll = (e) => {
    setScrollPos(e.target.scrollTop);
  };

  return (
    <div id="main-container" className={styles.home} onScroll={handleScroll}>

      <Header scrollY={scrollPos} />

      <div className={styles.container}>
        <Stories />
        <Feed ref={feedRef} />
      </div>

    </div>
  );
};

export default Home;