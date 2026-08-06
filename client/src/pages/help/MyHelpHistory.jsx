import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  HandHeart,
  LoaderCircle,
  MapPin,
  UserRoundCheck,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import Header from "../../components/home/Header";

import {
  getMyHelpHistory,
} from "../../services/helpRequestService";

import styles from "./MyHelpHistory.module.css";

const getLocation = (request) => {
  return [
    request?.location?.area,
    request?.location?.city,
  ]
    .filter(Boolean)
    .join(", ");
};

const formatDate = (value) => {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
};

const STATUS_LABELS = {
  "in-progress": "In progress",
  resolved: "Completed",
  expired: "Expired",
  cancelled: "Cancelled",
};

const MyHelpHistory = () => {
  const navigate = useNavigate();

  const [
    history,
    setHistory,
  ] = useState({
    stats: {},
    requested: [],
    provided: [],
  });

  const [
    activeTab,
    setActiveTab,
  ] = useState("provided");

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

    const loadHistory = async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await getMyHelpHistory();

        if (!mounted) {
          return;
        }

        setHistory({
          stats:
            response?.stats || {},
          requested:
            response?.requested || [],
          provided:
            response?.provided || [],
        });
      } catch (requestError) {
        if (mounted) {
          setError(
            requestError?.message ||
            "Unable to load help history"
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      mounted = false;
    };
  }, []);

  const items = useMemo(
    () =>
      activeTab === "provided"
        ? history.provided
        : history.requested,
    [
      activeTab,
      history.provided,
      history.requested,
    ]
  );

  return (
    <div className={styles.page}>
      <div className={styles.desktopHeader}>
        <Header />
      </div>

      <main className={styles.pageContent}>
        <header className={styles.topBar}>
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
              Community contribution
            </span>

            <h1>My help history</h1>

            <p>
              Track requests you created
              and help you provided.
            </p>
          </div>
        </header>

        <section className={styles.statsGrid}>
          <article>
            <HandHeart size={21} />

            <span>
              <strong>
                {
                  history.stats
                    ?.providedTotal || 0
                }
              </strong>

              Help commitments
            </span>
          </article>

          <article>
            <CheckCircle2 size={21} />

            <span>
              <strong>
                {
                  history.stats
                    ?.completedProvided ||
                  0
                }
              </strong>

              Completed
            </span>
          </article>

          <article>
            <Clock3 size={21} />

            <span>
              <strong>
                {
                  history.stats
                    ?.activeProvided || 0
                }
              </strong>

              Active now
            </span>
          </article>
        </section>

        <div className={styles.tabs}>
          <button
            type="button"
            className={
              activeTab === "provided"
                ? styles.activeTab
                : ""
            }
            onClick={() =>
              setActiveTab("provided")
            }
          >
            Help I provided
          </button>

          <button
            type="button"
            className={
              activeTab === "requested"
                ? styles.activeTab
                : ""
            }
            onClick={() =>
              setActiveTab("requested")
            }
          >
            Requests I created
          </button>
        </div>

        {loading ? (
          <div className={styles.stateCard}>
            <LoaderCircle
              size={28}
              className={styles.spinning}
            />

            <p>Loading history...</p>
          </div>
        ) : error ? (
          <div className={styles.stateCard}>
            <p>{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className={styles.stateCard}>
            <UserRoundCheck size={31} />

            <h2>No history yet</h2>

            <p>
              Completed and active help
              records will appear here.
            </p>
          </div>
        ) : (
          <section className={styles.historyList}>
            {items.map((request) => (
              <button
                type="button"
                key={request._id}
                className={styles.historyCard}
                onClick={() =>
                  navigate(
                    `/help/${request._id}`
                  )
                }
              >
                <div className={styles.cardTop}>
                  <span
                    className={`${styles.statusBadge} ${
                      styles[
                        `status${request.status
                          ?.replace(
                            "-",
                            ""
                          )
                          .replace(
                            /^\w/,
                            (letter) =>
                              letter.toUpperCase()
                          )}`
                      ] || ""
                    }`}
                  >
                    {
                      STATUS_LABELS[
                        request.status
                      ] ||
                      request.status
                    }
                  </span>

                  <small>
                    {formatDate(
                      request.resolvedAt ||
                        request.acceptedAt ||
                        request.updatedAt
                    )}
                  </small>
                </div>

                <h2>{request.title}</h2>

                <p>
                  {request.description}
                </p>

                <footer>
                  <span>
                    <MapPin size={15} />
                    {getLocation(request) ||
                      "Location unavailable"}
                  </span>

                  <strong>
                    View details
                  </strong>
                </footer>
              </button>
            ))}
          </section>
        )}
      </main>
    </div>
  );
};

export default MyHelpHistory;
