import styles from "./Modal.module.css";

const Modal = ({
  isOpen,
  title,
  children,
  onClose,
  footer,
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>

      <div className={styles.modal}>

        <div className={styles.header}>

          <h2>{title}</h2>

          <button
            className={styles.close}
            onClick={onClose}
          >
            ✕
          </button>

        </div>

        <div className={styles.body}>
          {children}
        </div>

        {footer && (
          <div className={styles.footer}>
            {footer}
          </div>
        )}

      </div>

    </div>
  );
};

export default Modal;