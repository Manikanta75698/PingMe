import {
  forwardRef,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  MessageCircleMore,
} from "lucide-react";

import styles from "./Logo.module.css";

const VALID_SIZES = new Set([
  "sm",
  "md",
  "lg",
  "xl",
]);

const Logo = forwardRef(
  (
    {
      size = "md",
      to,
      href,
      compact = false,
      showIcon = true,
      className = "",
      ariaLabel = "PingMe",
      onClick,
      ...rest
    },
    ref
  ) => {
    const resolvedSize =
      VALID_SIZES.has(size)
        ? size
        : "md";

    const classes = [
      styles.logo,
      styles[resolvedSize],
      compact
        ? styles.compact
        : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const content = (
      <>
        {showIcon && (
          <span
            className={
              styles.iconWrapper
            }
            aria-hidden="true"
          >
            <MessageCircleMore
              className={
                styles.icon
              }
              strokeWidth={2.35}
            />
          </span>
        )}

        {!compact && (
          <span
            className={
              styles.wordmark
            }
          >
            <span
              className={
                styles.ping
              }
            >
              Ping
            </span>

            <span
              className={
                styles.me
              }
            >
              Me
            </span>
          </span>
        )}

        <span
          className={
            styles.visuallyHidden
          }
        >
          {ariaLabel}
        </span>
      </>
    );

    if (to) {
      return (
        <Link
          {...rest}
          ref={ref}
          to={to}
          className={`${classes} ${styles.interactive}`}
          aria-label={ariaLabel}
          onClick={onClick}
        >
          {content}
        </Link>
      );
    }

    if (href) {
      return (
        <a
          {...rest}
          ref={ref}
          href={href}
          className={`${classes} ${styles.interactive}`}
          aria-label={ariaLabel}
          onClick={onClick}
        >
          {content}
        </a>
      );
    }

    return (
      <div
        {...rest}
        ref={ref}
        className={classes}
        aria-label={ariaLabel}
      >
        {content}
      </div>
    );
  }
);

Logo.displayName = "Logo";

export default Logo;