import { useEffect, useState } from "react";

import {
  getComments,
  commentPost,
} from "../../services/postService";

import styles from "./CommentModal.module.css";

const CommentModal = ({ post, onClose }) => {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadComments();
  }, []);

  const loadComments = async () => {
    try {
      const data = await getComments(post._id);
      setComments(data.comments || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleComment = async () => {
    if (!text.trim()) return;

    try {
      setLoading(true);

      const data = await commentPost(
        post._id,
        text
      );

      setComments(data.comments);

      setText("");

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>

        <div className={styles.header}>
          <h2>Comments</h2>

          <button onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.comments}>

          {comments.length === 0 ? (
            <p>No comments yet.</p>
          ) : (
            comments.map((comment) => (
              <div
                key={comment._id}
                className={styles.comment}
              >
                <img
                  src={comment.user.profilePic}
                  alt=""
                />

                <div>
                  <h4>
                    {comment.user.username}
                  </h4>

                  <p>{comment.text}</p>
                </div>

              </div>
            ))
          )}

        </div>

        <div className={styles.inputArea}>

          <input
            type="text"
            placeholder="Write a comment..."
            value={text}
            onChange={(e) =>
              setText(e.target.value)
            }
          />

          <button
            onClick={handleComment}
            disabled={loading}
          >
            Send
          </button>

        </div>

      </div>
    </div>
  );
};

export default CommentModal;