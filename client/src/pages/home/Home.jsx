import { useRef } from "react";

import styles from "./Home.module.css";

import Header from "../../components/home/Header";
import Stories from "../../components/home/Stories";
import CreatePost from "../../components/home/CreatePost";
import Feed from "../../components/home/Feed";

const Home = () => {

  const feedRef = useRef();

  return (
    <div className={styles.home}>

      <Header />

      <div className={styles.container}>

        <CreatePost
          onPostCreated={() =>
            feedRef.current.refreshFeed()
          }
        />

        <Stories />

        <Feed ref={feedRef} />

      </div>

    </div>
  );
};

export default Home;