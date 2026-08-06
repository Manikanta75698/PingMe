import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useSearchParams,
} from "react-router-dom";

import styles from "./Home.module.css";

import Header from "../../components/home/Header";
import Stories from "../../components/home/Stories";
import Feed from "../../components/home/Feed";

const Home = () => {
  const feedRef =
    useRef(null);

  const scrollFrameRef =
    useRef(null);

  const pendingScrollPositionRef =
    useRef(0);

  const [searchParams] =
    useSearchParams();

  const [
    scrollPosition,
    setScrollPosition,
  ] = useState(0);

  const targetPostId =
    String(
      searchParams.get("post") ||
      ""
    ).trim();

  /* =========================
     REFRESH FEED AFTER POST
  ========================= */

  useEffect(() => {
    const handlePostCreated =
      () => {
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
      window.clearTimeout(
        timer
      );
    };
  }, [targetPostId]);

  /* =========================
     OPTIMIZED SCROLL HANDLER
  ========================= */

  const handleScroll =
    useCallback((event) => {
      pendingScrollPositionRef.current =
        event.currentTarget.scrollTop;

      if (
        scrollFrameRef.current !==
        null
      ) {
        return;
      }

      scrollFrameRef.current =
        window.requestAnimationFrame(
          () => {
            const nextPosition =
              Math.round(
                pendingScrollPositionRef.current
              );

            setScrollPosition(
              (
                previousPosition
              ) =>
                previousPosition ===
                  nextPosition
                  ? previousPosition
                  : nextPosition
            );

            scrollFrameRef.current =
              null;
          }
        );
    }, []);

  /* =========================
     CLEANUP
  ========================= */

  useEffect(() => {
    return () => {
      if (
        scrollFrameRef.current !==
        null
      ) {
        window.cancelAnimationFrame(
          scrollFrameRef.current
        );
      }
    };
  }, []);

  return (
    <div
      id="main-container"
      className={styles.home}
      onScroll={handleScroll}
    >
      <Header
        scrollY={scrollPosition}
      />

      <main
        className={styles.page}
      >
        <div
          className={
            styles.decorativeGlowLeft
          }
          aria-hidden="true"
        />

        <div
          className={
            styles.decorativeGlowRight
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