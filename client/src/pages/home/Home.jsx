import {
  useEffect,
  useRef,
} from "react";

import {
  useSearchParams,
} from "react-router-dom";

import styles from "./Home.module.css";

import Header from "../../components/home/Header";
import Stories from "../../components/home/Stories";
import Feed from "../../components/home/Feed";

const Home = () => {
  const feedRef = useRef(null);

  const [searchParams] =
    useSearchParams();

  const targetPostId =
    String(
      searchParams.get("post") || ""
    ).trim();

  /* =========================
     REFRESH FEED AFTER POST
  ========================= */

  useEffect(() => {
    const handlePostCreated = () => {
      feedRef.current
        ?.refreshFeed?.();
    };

    window.addEventListener(
      "postCreated",
      handlePostCreated
    );

    return () => {
      window.removeEventListener(
        "postCreated",
        handlePostCreated
      );
    };
  }, []);

  /* =========================
     OPEN TARGET POST
  ========================= */

  useEffect(() => {
    if (!targetPostId) {
      return undefined;
    }

    const timer =
      window.setTimeout(() => {
        feedRef.current
          ?.scrollToPost?.(
            targetPostId
          );
      }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [targetPostId]);

  return (
    <div className={styles.home}>
      <Header />

      <main
        className={styles.page}
      >
        <div
          className={
            styles.backgroundGlowOne
          }
          aria-hidden="true"
        />

        <div
          className={
            styles.backgroundGlowTwo
          }
          aria-hidden="true"
        />

        <div
          className={
            styles.container
          }
        >
          <section
            className={
              styles.storiesSection
            }
            aria-label="Stories"
          >
            <Stories />
          </section>

          <section
            className={
              styles.feedSection
            }
            aria-label="Home feed"
          >
            <Feed
              ref={feedRef}
              targetPostId={
                targetPostId
              }
            />
          </section>
        </div>
      </main>
    </div>
  );
};

export default Home;