import {
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

import styles from "./AuthLayout.module.css";

const AUTH_FEATURES = [
  {
    id: "connect",
    icon: UsersRound,
    title: "Connect naturally",
    description:
      "Discover people, share moments and stay close to your community.",
  },
  {
    id: "conversations",
    icon: MessageCircleMore,
    title: "Meaningful conversations",
    description:
      "Enjoy a clean and focused messaging experience built around people.",
  },
  {
    id: "privacy",
    icon: ShieldCheck,
    title: "Privacy focused",
    description:
      "Your account and personal experience are protected with secure flows.",
  },
];

const AuthLayout = ({
  children,
}) => {
  return (
    <main
      className={
        styles.authLayout
      }
    >
      <div
        className={
          styles.background
        }
        aria-hidden="true"
      >
        <span
          className={
            styles.orbPrimary
          }
        />

        <span
          className={
            styles.orbAccent
          }
        />

        <span
          className={
            styles.grid
          }
        />
      </div>

      <section
        className={
          styles.authShell
        }
        aria-label="PingMe authentication"
      >
        <aside
          className={
            styles.brandPanel
          }
          aria-label="About PingMe"
        >
          <div
            className={
              styles.brandContent
            }
          >
            <div
              className={
                styles.brandBadge
              }
            >
              <Sparkles
                size={15}
                aria-hidden="true"
              />

              <span>
                Your social space
              </span>
            </div>

            <div
              className={
                styles.brandHeading
              }
            >
              <h2>
                Conversations that feel
                closer.
              </h2>

              <p>
                PingMe brings people,
                stories and messages
                together in one simple,
                thoughtful experience.
              </p>
            </div>

            <div
              className={
                styles.features
              }
            >
              {AUTH_FEATURES.map(
                ({
                  id,
                  icon: Icon,
                  title,
                  description,
                }) => (
                  <article
                    key={id}
                    className={
                      styles.feature
                    }
                  >
                    <div
                      className={
                        styles.featureIcon
                      }
                      aria-hidden="true"
                    >
                      <Icon
                        size={19}
                      />
                    </div>

                    <div>
                      <h3>
                        {title}
                      </h3>

                      <p>
                        {description}
                      </p>
                    </div>
                  </article>
                )
              )}
            </div>
          </div>

          <div
            className={
              styles.brandFooter
            }
          >
            <ShieldCheck
              size={16}
              aria-hidden="true"
            />

            <span>
              Secure authentication
              powered by PingMe
            </span>
          </div>
        </aside>

        <section
          className={
            styles.formPanel
          }
          aria-label="Account access"
        >
          <div
            className={
              styles.formScroll
            }
          >
            <div
              className={
                styles.formContainer
              }
            >
              {children}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
};

export default AuthLayout;