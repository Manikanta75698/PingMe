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
  const feedRef = useRef(null);

  const scrollFrameRef =
    useRef(null);

  const pendingScrollPositionRef =
    useRef(0);

  const [searchParams] =
    useSearchParams();

  const [scrollPos, setScrollPos] =
    useState(0);

  const targetPostId =
    String(
      searchParams.get("post") ||
      ""
    ).trim();

  /* =========================
     REFRESH FEED AFTER POST
  ========================= */

  useEffect(() => {
    const handlePostRefresh = () => {
      feedRef.current?.refreshFeed?.();
    };

    window.addEventListener(
      "postCreated",
      handlePostRefresh
    );

    return () => {
      window.removeEventListener(
        "postCreated",
        handlePostRefresh
      );
    };
  }, []);

  /* =========================
     OPEN TARGET POST
  ========================= */

  useEffect(() => {
    if (!targetPostId) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        feedRef.current
          ?.scrollToPost?.(
            targetPostId
          );
      }, 100);

    return () => {
      window.clearTimeout(timer);
    };
  }, [targetPostId]);

  /* =========================
     OPTIMIZED SCROLL HANDLER
  ========================= */

  const handleScroll = useCallback(
    (event) => {
      pendingScrollPositionRef.current =
        event.currentTarget.scrollTop;

      if (
        scrollFrameRef.current !== null
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

            setScrollPos(
              (previousPosition) =>
                previousPosition ===
                  nextPosition
                  ? previousPosition
                  : nextPosition
            );

            scrollFrameRef.current =
              null;
          }
        );
    },
    []
  );

  /* =========================
     CLEANUP
  ========================= */

  useEffect(() => {
    return () => {
      if (
        scrollFrameRef.current !== null
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
      <Header scrollY={scrollPos} />

      <div
        className={styles.container}
      >
        <Stories />

        <Feed
          ref={feedRef}
          targetPostId={
            targetPostId
          }
        />
      </div>
    </div>
  );
};

export default Home;