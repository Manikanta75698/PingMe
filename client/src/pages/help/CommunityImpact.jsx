import {
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  CheckCircle2,
  HandHeart,
  LoaderCircle,
  MapPin,
  Users,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import Header from "../../components/home/Header";

import {
  getCommunityImpact,
} from "../../services/helpRequestService";

import styles from "./CommunityImpact.module.css";

const CommunityImpact = () => {
  const navigate = useNavigate();

  const [
    data,
    setData,
  ] = useState({
    stats: {},
    categoryBreakdown: [],
    recentActivity: [],
  });

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadImpact = async () => {
      try {
        setLoading(true);

        const response =
          await getCommunityImpact();

        if (mounted) {
          setData({
            stats:
              response?.stats || {},
            categoryBreakdown:
              response
                ?.categoryBreakdown ||
              [],
            recentActivity:
              response
                ?.recentActivity ||
              [],
          });
        }
      } catch (requestError) {
        if (mounted) {
          setError(
            requestError?.message ||
            "Unable to load community impact"
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadImpact();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.desktopHeader}>
        <Header />
      </div>

      <main className={styles.pageContent}>
        <header className={styles.hero}>
          <button
            type="button"
            onClick={() =>
              navigate("/help")
            }
            aria-label="Go back"
          >
            <ArrowLeft size={21} />
          </button>

          <div>
            <span>
              Together we make a difference
            </span>

            <h1>Community impact</h1>

            <p>
              A transparent view of help
              completed by the PingMe
              community.
            </p>
          </div>
        </header>

        {loading ? (
          <div className={styles.state}>
            <LoaderCircle
              size={30}
              className={styles.spinning}
            />

            Loading impact...
          </div>
        ) : error ? (
          <div className={styles.state}>
            {error}
          </div>
        ) : (
          <>
            <section className={styles.stats}>
              <article>
                <CheckCircle2 size={23} />
                <strong>
                  {
                    data.stats
                      ?.completedRequests ||
                    0
                  }
                </strong>
                <span>
                  Requests completed
                </span>
              </article>

              <article>
                <Users size={23} />
                <strong>
                  {
                    data.stats
                      ?.communityHelpers ||
                    0
                  }
                </strong>
                <span>
                  Community helpers
                </span>
              </article>

              <article>
                <HandHeart size={23} />
                <strong>
                  {
                    data.stats
                      ?.peopleHelped || 0
                  }
                </strong>
                <span>People helped</span>
              </article>
            </section>

            <section className={styles.panel}>
              <h2>Help by category</h2>

              <div className={styles.categories}>
                {data.categoryBreakdown.map(
                  (item) => (
                    <div key={item.category}>
                      <span>
                        {item.category?.replace(
                          "-",
                          " "
                        )}
                      </span>

                      <strong>
                        {item.count}
                      </strong>
                    </div>
                  )
                )}
              </div>
            </section>

            <section className={styles.panel}>
              <h2>Recent completed help</h2>

              <div className={styles.activityList}>
                {data.recentActivity.length ===
                0 ? (
                  <p>
                    No completed activity yet.
                  </p>
                ) : (
                  data.recentActivity.map(
                    (request) => (
                      <button
                        type="button"
                        key={request._id}
                        onClick={() =>
                          navigate(
                            `/help/${request._id}`
                          )
                        }
                      >
                        <span>
                          <strong>
                            {request.title}
                          </strong>

                          <small>
                            {
                              request.category
                            }
                          </small>
                        </span>

                        <span>
                          <MapPin size={15} />

                          {request.location
                            ?.city ||
                            "Community"}
                        </span>
                      </button>
                    )
                  )
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default CommunityImpact;
