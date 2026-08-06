import {
  forwardRef,
} from "react";

import styles from "./Button.module.css";

const VALID_VARIANTS = new Set([
  "primary",
  "secondary",
  "outline",
  "ghost",
  "danger",
]);

const VALID_SIZES = new Set([
  "small",
  "medium",
  "large",
]);

const Button = forwardRef(
  (
    {
      children,
      type = "button",
      variant = "primary",
      size = "medium",
      fullWidth = false,
      disabled = false,
      loading = false,
      loadingText = "Loading...",
      onClick,
      className = "",
      iconOnly = false,
      ...buttonProps
    },
    ref
  ) => {
    const resolvedVariant =
      VALID_VARIANTS.has(variant)
        ? variant
        : "primary";

    const resolvedSize =
      VALID_SIZES.has(size)
        ? size
        : "medium";

    const isDisabled =
      disabled || loading;

    const buttonClasses = [
      styles.button,
      styles[resolvedVariant],
      styles[resolvedSize],
      fullWidth
        ? styles.fullWidth
        : "",
      loading
        ? styles.loading
        : "",
      iconOnly
        ? styles.iconOnly
        : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const handleClick = (
      event
    ) => {
      if (isDisabled) {
        event.preventDefault();
        return;
      }

      onClick?.(event);
    };

    return (
      <button
        {...buttonProps}
        ref={ref}
        type={type}
        className={buttonClasses}
        disabled={isDisabled}
        onClick={handleClick}
        aria-busy={
          loading || undefined
        }
        data-loading={
          loading
            ? "true"
            : "false"
        }
        data-variant={
          resolvedVariant
        }
        data-size={
          resolvedSize
        }
      >
        <span
          className={
            styles.content
          }
        >
          <span
            className={`${styles.stateContent} ${loading
                ? styles.hiddenState
                : styles.visibleState
              }`}
            aria-hidden={
              loading
                ? "true"
                : undefined
            }
          >
            {children}
          </span>

          <span
            className={`${styles.stateContent} ${styles.loadingContent} ${loading
                ? styles.visibleState
                : styles.hiddenState
              }`}
            aria-hidden={
              loading
                ? undefined
                : "true"
            }
          >
            <span
              className={
                styles.spinner
              }
              aria-hidden="true"
            />

            {!iconOnly && (
              <span
                className={
                  styles.loadingLabel
                }
              >
                {loadingText}
              </span>
            )}
          </span>
        </span>
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;