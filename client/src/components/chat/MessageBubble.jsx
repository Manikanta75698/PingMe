import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useChat,
} from "../../context/ChatContext";

import {
  useNavigate,
} from "react-router-dom";

import {
  Check,
  CheckCheck,
  CircleSlash2,
  Clock3,
  Forward as ForwardIcon,
  MoreVertical,
  Image as ImageIcon,
  RotateCcw,
} from "lucide-react";

import styles from "./MessageBubble.module.css";

import DeleteMessageModal from "./DeleteMessageModal";
import MessageActionsMenu from "./MessageActionsMenu";
import DefaultAvatar from "../../assets/default-avatar.png";
import {
  getPostById,
} from "../../services/postService";

import {
  deleteMessage,
  sendMessage,
  toggleMessageReaction,
  togglePinMessage,
} from "../../services/chatService";

const ALLOWED_REACTIONS = [
  "❤️",
  "😂",
  "😮",
  "😢",
  "👍",
  "🔥",
];

const normalizeId = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "object") {
    return String(
      value?._id ||
      value?.id ||
      value?.userId ||
      ""
    );
  }

  return String(value);
};

const getStoredUserId = () => {
  try {
    const storedUser =
      localStorage.getItem("user");

    if (!storedUser) {
      return "";
    }

    return normalizeId(
      JSON.parse(storedUser)
    );
  } catch (error) {
    console.error(
      "Unable to read current user:",
      error
    );

    return "";
  }
};

const formatTime = (dateValue) => {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getSafeReactions = (
  reactions
) =>
  Array.isArray(reactions)
    ? reactions.filter(
      (reaction) =>
        reaction?.emoji &&
        ALLOWED_REACTIONS.includes(
          reaction.emoji
        )
    )
    : [];


const escapeRegExp = (value) =>
  String(value || "").replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

const highlightMessageText = (
  text,
  query
) => {
  const safeText =
    String(text || "");

  const safeQuery =
    String(query || "").trim();

  if (
    !safeText ||
    !safeQuery
  ) {
    return safeText;
  }

  const escapedQuery =
    escapeRegExp(safeQuery);

  const parts =
    safeText.split(
      new RegExp(
        `(${escapedQuery})`,
        "gi"
      )
    );

  const normalizedQuery =
    safeQuery.toLocaleLowerCase();

  return parts.map(
    (part, index) => {
      const isMatch =
        part.toLocaleLowerCase() ===
        normalizedQuery;

      if (!isMatch) {
        return part;
      }

      return (
        <mark
          key={`${part}-${index}`}
          className={
            styles.searchHighlight
          }
        >
          {part}
        </mark>
      );
    }
  );
};

const MessageBubble = ({
  message,
  isOwn,
  onReply,
  onEdit,
  onForward,
  onVisible,
  visibilityRoot,
  searchQuery = "",
  isSearchMatch = false,
  isActiveSearchMatch = false,
  isPinnedScrollTarget = false,
}) => {

  const navigate =
    useNavigate();

  const {
    setMessages,
    setChatSummaries,
    setPinnedMessage,
    blockStatus,
  } = useChat();

  const isBlocked =
    Boolean(
      blockStatus?.isBlocked
    );

  const [
    showActions,
    setShowActions,
  ] = useState(false);

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] = useState(false);

  const [
    isDeleted,
    setIsDeleted,
  ] = useState(false);

  const [
    deleteError,
    setDeleteError,
  ] = useState("");

  const [
    deleteLoadingMode,
    setDeleteLoadingMode,
  ] = useState("");

  const [
    localReactions,
    setLocalReactions,
  ] = useState(() =>
    getSafeReactions(
      message?.reactions
    )
  );

  const [
    reactionLoading,
    setReactionLoading,
  ] = useState(false);

  const [
    reactionError,
    setReactionError,
  ] = useState("");

  const [
    copyFeedback,
    setCopyFeedback,
  ] = useState("");

  const [
    pinLoading,
    setPinLoading,
  ] = useState(false);

  const [
    pinError,
    setPinError,
  ] = useState("");

  const [
    checkingSharedPost,
    setCheckingSharedPost,
  ] = useState(false);

  const [
    retryLoading,
    setRetryLoading,
  ] = useState(false);

  const [
    retryError,
    setRetryError,
  ] = useState("");

  const [
    sharedPostUnavailable,
    setSharedPostUnavailable,
  ] = useState(false);

  const [
    sharedPostError,
    setSharedPostError,
  ] = useState("");

  const pressTimerRef =
    useRef(null);

  const optionsButtonRef =
    useRef(null);

  const actionAnchorRef =
    useRef(null);

  const longPressReadyRef =
    useRef(false);

  const pointerStartRef =
    useRef({
      x: 0,
      y: 0,
    });

  const activePointerIdRef =
    useRef(null);

  const suppressContextMenuUntilRef =
    useRef(0);

  const reactionRequestRef =
    useRef(false);

  const reactionErrorTimerRef =
    useRef(null);

  const copyFeedbackTimerRef =
    useRef(null);

  const pinErrorTimerRef =
    useRef(null);

  const mountedRef =
    useRef(true);

  const visibilityRef =
    useRef(null);

  const visibilityTimerRef =
    useRef(null);

  const visibilityReportedRef =
    useRef(false);

  const currentUserId =
    getStoredUserId();

  const time = formatTime(
    message?.createdAt
  );

  const repliedMessage =
    message?.replyTo;

  const repliedSenderName =
    repliedMessage?.sender?.name ||
    repliedMessage?.sender?.username ||
    "User";

  const repliedText =
    repliedMessage?.text?.trim() ||
    (repliedMessage?.sharedPost
      ?.postId
      ? "Shared post"
      : repliedMessage?.image
        ? "Photo"
        : "Original message unavailable");

  const isDeletedForEveryone =
    Boolean(
      message?.deletedForEveryone
    );

  useEffect(() => {
    if (!isDeletedForEveryone) {
      return;
    }

    setShowActions(false);
    setShowDeleteModal(false);
    setReactionError("");
    setCopyFeedback("");
    setPinError("");
  }, [isDeletedForEveryone]);

  const canUseActions =
    Boolean(message?._id) &&
    !String(message._id).startsWith(
      "temp-"
    ) &&
    !isDeletedForEveryone;

  const canInteract =
    canUseActions &&
    !isBlocked;

  const hasMessageText =
    Boolean(
      message?.text?.trim()
    );

  const sharedPost =
    message?.sharedPost &&
      typeof message.sharedPost ===
      "object"
      ? message.sharedPost
      : null;

  const sharedPostId =
    normalizeId(
      sharedPost?.postId
    );

  const hasSharedPost =
    Boolean(
      sharedPost &&
      sharedPostId
    );

  const isTextOnlyMessage =
    hasMessageText &&
    !message?.image &&
    !hasSharedPost &&
    !repliedMessage &&
    !isDeletedForEveryone;

  const hasMessageContent =
    hasMessageText ||
    Boolean(message?.image) ||
    hasSharedPost;

  const sharedPostImage =
    String(
      sharedPost?.image || ""
    ).trim();

  const sharedPostCaption =
    String(
      sharedPost?.caption || ""
    ).trim();

  const sharedPostOwnerName =
    String(
      sharedPost?.ownerName ||
      "User"
    ).trim();

  const sharedPostOwnerUsername =
    String(
      sharedPost?.ownerUsername ||
      "user"
    ).trim();

  const sharedPostOwnerProfilePic =
    String(
      sharedPost?.ownerProfilePic ||
      ""
    ).trim();

  const canCopy =
    canUseActions &&
    hasMessageText;

  const canForward =
    canUseActions &&
    hasMessageContent;

  const canPin =
    canUseActions &&
    hasMessageContent;

  const canEdit =
    isOwn &&
    canUseActions &&
    hasMessageText;

  const isPinned =
    Boolean(
      message?.pinnedAt
    );

  const isEdited =
    Boolean(
      message?.editedAt
    );

  const isFailed =
    isOwn &&
    message?.status ===
    "failed";

  const canRetry =
    isFailed &&
    String(
      message?._id || ""
    ).startsWith("temp-") &&
    Boolean(
      message?.retryPayload
    ) &&
    !retryLoading;

  const isForwarded =
    Boolean(
      message?.isForwarded ||
      message?.forwardedFrom
    );

  const selectedReaction =
    localReactions.find(
      (reaction) =>
        normalizeId(
          reaction?.user
        ) === currentUserId
    )?.emoji || "";

  const reactionGroups =
    ALLOWED_REACTIONS.map(
      (emoji) => {
        const matchingReactions =
          localReactions.filter(
            (reaction) =>
              reaction?.emoji ===
              emoji
          );

        return {
          emoji,
          count:
            matchingReactions.length,

          selected:
            matchingReactions.some(
              (reaction) =>
                normalizeId(
                  reaction?.user
                ) ===
                currentUserId
            ),
        };
      }
    ).filter(
      (group) => group.count > 0
    );

  /* =========================
     SYNC SERVER REACTIONS
  ========================= */

  useEffect(() => {
    if (
      reactionRequestRef.current
    ) {
      return;
    }

    setLocalReactions(
      getSafeReactions(
        message?.reactions
      )
    );
  }, [
    message?._id,
    message?.reactions,
  ]);


  const handleOpenSharedPost =
    async (event) => {
      event?.preventDefault();
      event?.stopPropagation();

      if (
        !sharedPostId ||
        checkingSharedPost
      ) {
        return;
      }

      setShowActions(false);
      setSharedPostError("");
      setCheckingSharedPost(true);

      try {
        const response =
          await getPostById(
            sharedPostId
          );

        const post =
          response?.post ||
          response?.data?.post ||
          response?.data ||
          response;

        const verifiedPostId =
          normalizeId(post);

        if (!verifiedPostId) {
          throw new Error(
            "Invalid post response"
          );
        }

        setSharedPostUnavailable(false);

        navigate(
          `/home?post=${encodeURIComponent(
            sharedPostId
          )}`
        );
      } catch (error) {
        console.error(
          "OPEN SHARED POST ERROR:",
          error.response?.data ||
          error.message
        );

        const status =
          Number(
            error.response?.status
          );

        if (
          status === 404 ||
          status === 410
        ) {
          setSharedPostUnavailable(true);
          setSharedPostError(
            "This post is no longer available."
          );

          return;
        }

        setSharedPostError(
          error.response?.data
            ?.message ||
          error.userMessage ||
          "Unable to open this post. Tap to try again."
        );
      } finally {
        if (mountedRef.current) {
          setCheckingSharedPost(false);
        }
      }
    };

  /* =========================
     REPLY
  ========================= */

  const handleReply = () => {
    if (
      !canInteract ||
      typeof onReply !== "function"
    ) {
      return;
    }
    setShowActions(false);

    onReply(message);
  };

  /* =========================
   COPY
========================= */

  const copyTextToClipboard =
    async (value) => {
      const safeText =
        String(value || "");

      if (!safeText) {
        return false;
      }

      if (
        navigator?.clipboard &&
        window.isSecureContext
      ) {
        await navigator.clipboard
          .writeText(safeText);

        return true;
      }

      /*
       * Older browser fallback.
       */
      const temporaryTextarea =
        document.createElement(
          "textarea"
        );

      temporaryTextarea.value =
        safeText;

      temporaryTextarea.setAttribute(
        "readonly",
        ""
      );

      temporaryTextarea.style.position =
        "fixed";

      temporaryTextarea.style.opacity =
        "0";

      document.body.appendChild(
        temporaryTextarea
      );

      temporaryTextarea.select();

      const copied =
        document.execCommand(
          "copy"
        );

      document.body.removeChild(
        temporaryTextarea
      );

      return copied;
    };

  const handleCopy = async () => {
    if (!canCopy) {
      return;
    }

    try {
      const copied =
        await copyTextToClipboard(
          message.text
        );

      if (!copied) {
        throw new Error(
          "Clipboard copy failed"
        );
      }

      setCopyFeedback(
        "Copied"
      );

      if (
        copyFeedbackTimerRef.current
      ) {
        window.clearTimeout(
          copyFeedbackTimerRef.current
        );
      }

      copyFeedbackTimerRef.current =
        window.setTimeout(() => {
          if (mountedRef.current) {
            setCopyFeedback("");
          }

          copyFeedbackTimerRef.current =
            null;
        }, 1500);
    } catch (error) {
      console.error(
        "COPY MESSAGE ERROR:",
        error
      );

      setCopyFeedback(
        "Unable to copy"
      );
    }
  };

  /* =========================
     FORWARD
  ========================= */

  const handleForward = () => {
    if (
      !canForward ||
      typeof onForward !==
      "function"
    ) {
      return;
    }

    setShowActions(false);

    onForward(message);
  };

  /* =========================
     PIN / UNPIN
  ========================= */

  const handlePin = async () => {
    if (
      !canPin ||
      pinLoading ||
      !message?._id
    ) {
      return;
    }

    setShowActions(false);
    setPinLoading(true);
    setPinError("");

    try {
      const response =
        await togglePinMessage(
          message._id
        );

      const pinData =
        response?.data?.data;

      const updatedMessageId =
        normalizeId(
          pinData?.messageId ||
          pinData?.message?._id
        );

      if (!updatedMessageId) {
        throw new Error(
          "Invalid pin response from server"
        );
      }

      const clearedMessageIds =
        new Set(
          Array.isArray(
            pinData?.clearedMessageIds
          )
            ? pinData.clearedMessageIds
              .map((item) =>
                normalizeId(item)
              )
              .filter(Boolean)
            : []
        );


      setMessages(
        (previous) =>
          Array.isArray(previous)
            ? previous.map(
              (currentMessage) => {
                const currentMessageId =
                  normalizeId(
                    currentMessage?._id
                  );

                if (
                  clearedMessageIds.has(
                    currentMessageId
                  )
                ) {
                  return {
                    ...currentMessage,
                    pinnedAt: null,
                    pinnedBy: null,
                  };
                }

                if (
                  currentMessageId !==
                  updatedMessageId
                ) {
                  return currentMessage;
                }

                if (
                  pinData?.message &&
                  typeof pinData.message ===
                  "object"
                ) {
                  return {
                    ...currentMessage,
                    ...pinData.message,
                  };
                }

                return {
                  ...currentMessage,

                  pinnedAt:
                    pinData?.isPinned
                      ? pinData?.pinnedAt ||
                      new Date()
                        .toISOString()
                      : null,

                  pinnedBy:
                    pinData?.isPinned
                      ? pinData?.pinnedBy ||
                      null
                      : null,
                };
              }
            )
            : []
      );

      setPinnedMessage((previous) => {
        const previousId =
          normalizeId(previous?._id);

        if (pinData?.isPinned) {
          if (
            pinData?.message &&
            typeof pinData.message ===
            "object"
          ) {
            return {
              ...pinData.message,
              pinnedAt:
                pinData.message
                  ?.pinnedAt ||
                pinData?.pinnedAt ||
                new Date()
                  .toISOString(),
              pinnedBy:
                pinData.message
                  ?.pinnedBy ||
                pinData?.pinnedBy ||
                null,
            };
          }

          return {
            ...message,
            _id: updatedMessageId,
            pinnedAt:
              pinData?.pinnedAt ||
              new Date()
                .toISOString(),
            pinnedBy:
              pinData?.pinnedBy ||
              null,
          };
        }

        return previousId ===
          updatedMessageId
          ? null
          : previous;
      });


    } catch (error) {
      console.error(
        "PIN MESSAGE ERROR:",
        error.response?.data ||
        error.message
      );

      if (!mountedRef.current) {
        return;
      }

      setPinError(
        error.response?.data
          ?.message ||
        error.userMessage ||
        "Unable to update pinned message"
      );

      if (
        pinErrorTimerRef.current
      ) {
        window.clearTimeout(
          pinErrorTimerRef.current
        );
      }

      pinErrorTimerRef.current =
        window.setTimeout(() => {
          if (mountedRef.current) {
            setPinError("");
          }

          pinErrorTimerRef.current =
            null;
        }, 3000);
    } finally {
      if (mountedRef.current) {
        setPinLoading(false);
      }
    }
  };

  /* =========================
   EDIT
========================= */

  const handleEdit = () => {
    if (
      !canEdit ||
      typeof onEdit !== "function"
    ) {
      return;
    }

    setShowActions(false);

    onEdit(message);
  };

  /* =========================
     REACTION
  ========================= */

  const handleReaction = async (
    emoji
  ) => {
    const safeEmoji =
      String(emoji || "").trim();

    if (
      !canInteract ||
      !currentUserId ||
      !ALLOWED_REACTIONS.includes(
        safeEmoji
      ) ||
      reactionRequestRef.current
    ) {
      return;
    }

    const previousReactions = [
      ...localReactions,
    ];

    const existingReaction =
      previousReactions.find(
        (reaction) =>
          normalizeId(
            reaction?.user
          ) === currentUserId
      );

    let optimisticReactions;

    /*
     * Same emoji click:
     * remove reaction.
     */
    if (
      existingReaction?.emoji ===
      safeEmoji
    ) {
      optimisticReactions =
        previousReactions.filter(
          (reaction) =>
            normalizeId(
              reaction?.user
            ) !== currentUserId
        );
    } else {
      /*
       * New reaction or replace
       * previous reaction.
       */
      optimisticReactions = [
        ...previousReactions.filter(
          (reaction) =>
            normalizeId(
              reaction?.user
            ) !== currentUserId
        ),

        {
          user: {
            _id: currentUserId,
          },

          emoji: safeEmoji,

          createdAt:
            new Date().toISOString(),
        },
      ];
    }

    reactionRequestRef.current =
      true;

    setReactionLoading(true);
    setReactionError("");

    /*
     * Immediate optimistic UI.
     */
    setLocalReactions(
      optimisticReactions
    );

    try {
      const response =
        await toggleMessageReaction(
          message._id,
          safeEmoji
        );

      const serverReactions =
        response?.data?.data
          ?.reactions;

      if (
        mountedRef.current &&
        Array.isArray(
          serverReactions
        )
      ) {
        setLocalReactions(
          getSafeReactions(
            serverReactions
          )
        );
      }
    } catch (error) {
      console.error(
        "MESSAGE REACTION ERROR:",
        error.response?.data ||
        error.message
      );

      if (!mountedRef.current) {
        return;
      }

      /*
       * API failure:
       * optimistic reaction rollback.
       */
      setLocalReactions(
        previousReactions
      );

      setReactionError(
        error.response?.data
          ?.message ||
        error.userMessage ||
        "Unable to update reaction"
      );

      if (
        reactionErrorTimerRef.current
      ) {
        window.clearTimeout(
          reactionErrorTimerRef.current
        );
      }

      reactionErrorTimerRef.current =
        window.setTimeout(() => {
          if (mountedRef.current) {
            setReactionError("");
          }

          reactionErrorTimerRef.current =
            null;

        }, 3000);
    } finally {
      reactionRequestRef.current =
        false;

      if (mountedRef.current) {
        setReactionLoading(false);
      }
    }
  };

  /* =========================
     RETRY FAILED MESSAGE
  ========================= */

  const handleRetryMessage =
    async (event) => {
      event?.preventDefault();
      event?.stopPropagation();

      if (!canRetry) {
        return;
      }

      const tempId =
        normalizeId(
          message?._id
        );

      const retryPayload =
        message?.retryPayload &&
          typeof message.retryPayload ===
          "object"
          ? message.retryPayload
          : null;

      const receiverId =
        normalizeId(
          retryPayload?.receiver ||
          message?.receiver
        );

      const clientMessageId =
        String(
          retryPayload?.clientMessageId ||
          message?.clientMessageId ||
          ""
        ).trim();

      const retryText =
        String(
          retryPayload?.text ??
          message?.text ??
          ""
        ).trim();

      const replyToId =
        normalizeId(
          retryPayload?.replyTo ||
          message?.replyTo
        );

      const retryImage =
        retryPayload?.imageFile ||
        null;

      if (
        !tempId ||
        !receiverId ||
        !clientMessageId ||
        (!retryText && !retryImage)
      ) {
        setRetryError(
          "This message cannot be retried."
        );

        return;
      }

      setRetryLoading(true);
      setRetryError("");

      const markStatus = (
        status,
        sendError = ""
      ) => {
        setMessages(
          (previous) =>
            Array.isArray(previous)
              ? previous.map(
                (currentMessage) =>
                  normalizeId(
                    currentMessage?._id
                  ) === tempId
                    ? {
                      ...currentMessage,
                      status,
                      sendError,
                    }
                    : currentMessage
              )
              : []
        );

        setChatSummaries(
          (previous) =>
            Array.isArray(previous)
              ? previous.map(
                (summary) =>
                  normalizeId(
                    summary?.lastMessage
                      ?._id
                  ) === tempId
                    ? {
                      ...summary,

                      lastMessage: {
                        ...summary.lastMessage,
                        status,
                        sendError,
                      },
                    }
                    : summary
              )
              : []
        );
      };

      markStatus("sending");

      try {
        let requestData;

        if (retryImage) {
          const formData =
            new FormData();

          formData.append(
            "receiver",
            receiverId
          );

          formData.append(
            "clientMessageId",
            clientMessageId
          );

          formData.append(
            "text",
            retryText
          );

          if (replyToId) {
            formData.append(
              "replyTo",
              replyToId
            );
          }

          formData.append(
            "image",
            retryImage
          );

          requestData =
            formData;
        } else {
          requestData = {
            receiver:
              receiverId,

            clientMessageId,

            text:
              retryText,

            ...(replyToId
              ? {
                replyTo:
                  replyToId,
              }
              : {}),
          };
        }

        const response =
          await sendMessage(
            requestData
          );

        const realMessage =
          response?.data?.data;

        if (!realMessage?._id) {
          throw new Error(
            "Invalid message response from server"
          );
        }

        setMessages(
          (previous) =>
            Array.isArray(previous)
              ? previous.map(
                (currentMessage) =>
                  normalizeId(
                    currentMessage?._id
                  ) === tempId
                    ? realMessage
                    : currentMessage
              )
              : []
        );

        setChatSummaries(
          (previous) =>
            Array.isArray(previous)
              ? previous.map(
                (summary) =>
                  normalizeId(
                    summary?.lastMessage
                      ?._id
                  ) === tempId
                    ? {
                      ...summary,

                      lastMessage:
                        realMessage,
                    }
                    : summary
              )
              : []
        );

        if (
          message?.image &&
          String(
            message.image
          ).startsWith("blob:")
        ) {
          URL.revokeObjectURL(
            message.image
          );
        }
      } catch (error) {
        console.error(
          "RETRY MESSAGE ERROR:",
          error.response?.data ||
          error.message
        );

        const nextError =
          error.response?.data
            ?.message ||
          error.userMessage ||
          "Retry failed. Check your connection.";

        markStatus(
          "failed",
          nextError
        );

        if (mountedRef.current) {
          setRetryError(
            nextError
          );
        }
      } finally {
        if (mountedRef.current) {
          setRetryLoading(false);
        }
      }
    };

  /* =========================
     DELETE
  ========================= */

  const handleDelete = () => {
    if (!canUseActions) {
      return;
    }

    setShowActions(false);
    setDeleteError("");
    setDeleteLoadingMode("");
    setShowDeleteModal(true);
  };

  const confirmDelete = async (
    mode
  ) => {
    const messageId =
      normalizeId(message?._id);

    if (
      !messageId ||
      deleteLoadingMode
    ) {
      return;
    }

    if (
      mode !== "forMe" &&
      mode !== "forEveryone"
    ) {
      return;
    }

    if (
      mode === "forEveryone" &&
      !isOwn
    ) {
      return;
    }

    const previousMessage = {
      ...message,
    };

    setShowDeleteModal(false);
    setShowActions(false);
    setDeleteError("");
    setDeleteLoadingMode(mode);

    /*
     * Cache-first optimistic UI.
     */
    if (mode === "forMe") {
      setIsDeleted(true);

      setMessages(
        (previous) =>
          Array.isArray(previous)
            ? previous.filter(
              (item) =>
                normalizeId(
                  item?._id
                ) !== messageId
            )
            : []
      );

      setPinnedMessage(
        (previous) =>
          normalizeId(
            previous?._id
          ) === messageId
            ? null
            : previous
      );
    } else {
      const optimisticDeletedMessage = {
        ...previousMessage,

        text: "",
        image: "",
        sharedPost: null,
        replyTo: null,
        reactions: [],

        editedAt: null,
        pinnedAt: null,
        pinnedBy: null,

        deletedForEveryone: true,
        deletedAt:
          new Date().toISOString(),
      };

      setMessages(
        (previous) =>
          Array.isArray(previous)
            ? previous.map(
              (item) =>
                normalizeId(
                  item?._id
                ) === messageId
                  ? {
                    ...item,
                    ...optimisticDeletedMessage,
                  }
                  : item
            )
            : []
      );

      setPinnedMessage(
        (previous) =>
          normalizeId(
            previous?._id
          ) === messageId
            ? null
            : previous
      );
    }

    try {
      await deleteMessage(
        messageId,
        mode
      );
    } catch (error) {
      console.error(
        "DELETE MESSAGE ERROR:",
        error.response?.data ||
        error.message
      );

      /*
       * Request fail ayithe
       * optimistic state rollback.
       */
      if (mode === "forMe") {
        setIsDeleted(false);

        setMessages(
          (previous) => {
            const safeMessages =
              Array.isArray(previous)
                ? previous
                : [];

            const alreadyExists =
              safeMessages.some(
                (item) =>
                  normalizeId(
                    item?._id
                  ) === messageId
              );

            if (alreadyExists) {
              return safeMessages;
            }

            return [
              ...safeMessages,
              previousMessage,
            ].sort(
              (first, second) =>
                new Date(
                  first?.createdAt || 0
                ).getTime() -
                new Date(
                  second?.createdAt || 0
                ).getTime()
            );
          }
        );
      } else {
        setMessages(
          (previous) =>
            Array.isArray(previous)
              ? previous.map(
                (item) =>
                  normalizeId(
                    item?._id
                  ) === messageId
                    ? previousMessage
                    : item
              )
              : []
        );
      }

      setDeleteError(
        error.response?.data
          ?.message ||
        error.userMessage ||
        "Unable to delete this message. Please try again."
      );

      setShowDeleteModal(true);
    } finally {
      setDeleteLoadingMode("");
    }
  };

  const closeDeleteModal = () => {
    if (deleteLoadingMode) {
      return;
    }

    setShowDeleteModal(false);
    setDeleteError("");
  };

  /* =========================
     LONG PRESS
  ========================= */

  const clearLongPressTimer = () => {
    if (!pressTimerRef.current) {
      return;
    }

    window.clearTimeout(
      pressTimerRef.current
    );

    pressTimerRef.current = null;
  };

  const releasePointerCapture = (
    element,
    pointerId
  ) => {
    if (
      !element ||
      pointerId === null ||
      typeof element
        .hasPointerCapture !==
      "function"
    ) {
      return;
    }

    try {
      if (
        element.hasPointerCapture(
          pointerId
        )
      ) {
        element.releasePointerCapture(
          pointerId
        );
      }
    } catch {
      // Pointer already released.
    }
  };

  const resetLongPress = (
    element = null
  ) => {
    clearLongPressTimer();

    releasePointerCapture(
      element,
      activePointerIdRef.current
    );

    activePointerIdRef.current =
      null;

    longPressReadyRef.current =
      false;
  };

  const handlePointerDown = (
    event
  ) => {
    if (
      !canUseActions ||
      event.pointerType !== "touch" ||
      !event.isPrimary
    ) {
      return;
    }

    const target =
      event.target;

    /*
     * Buttons and reaction chips meeda
     * long press start avvakudadhu.
     */
    if (
      target instanceof Element &&
      target.closest(
        "button, a, input, textarea, [role='button']"
      )
    ) {
      return;
    }

    resetLongPress(
      event.currentTarget
    );

    activePointerIdRef.current =
      event.pointerId;

    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };

    try {
      event.currentTarget
        .setPointerCapture(
          event.pointerId
        );
    } catch {
      // Unsupported mobile browser.
    }

    pressTimerRef.current =
      window.setTimeout(() => {
        /*
         * Menu ikkada open cheyyam.
         * Finger release ayyaka open chestham.
         */
        longPressReadyRef.current =
          true;

        pressTimerRef.current =
          null;

        if (
          typeof navigator !==
          "undefined" &&
          typeof navigator.vibrate ===
          "function"
        ) {
          navigator.vibrate(12);
        }
      }, 450);
  };

  const handlePointerMove = (
    event
  ) => {
    if (
      event.pointerType !== "touch" ||
      activePointerIdRef.current !==
      event.pointerId
    ) {
      return;
    }

    const movedX = Math.abs(
      event.clientX -
      pointerStartRef.current.x
    );

    const movedY = Math.abs(
      event.clientY -
      pointerStartRef.current.y
    );

    if (
      movedX > 12 ||
      movedY > 12
    ) {
      resetLongPress(
        event.currentTarget
      );
    }
  };

  const handlePointerUp = (
    event
  ) => {
    const shouldOpen =
      event.pointerType === "touch" &&
      event.pointerId ===
      activePointerIdRef.current &&
      longPressReadyRef.current;

    clearLongPressTimer();

    releasePointerCapture(
      event.currentTarget,
      activePointerIdRef.current
    );

    activePointerIdRef.current =
      null;

    longPressReadyRef.current =
      false;

    if (!shouldOpen) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    /*
     * Desktop positioning fallback kosam
     * message group anchor ga use chestham.
     */
    actionAnchorRef.current =
      event.currentTarget;

    suppressContextMenuUntilRef.current =
      Date.now() + 1000;

    setShowActions(true);
  };

  const handlePointerCancel = (
    event
  ) => {
    resetLongPress(
      event.currentTarget
    );
  };

  const handleContextMenu = (
    event
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!canUseActions) {
      return;
    }

    /*
     * Mobile browser generated
     * duplicate context-menu ignore.
     */
    if (
      Date.now() <
      suppressContextMenuUntilRef.current
    ) {
      return;
    }

    actionAnchorRef.current =
      optionsButtonRef.current ||
      event.currentTarget;

    setShowActions(true);
  };

  const openActions = (
    event
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!canUseActions) {
      return;
    }

    resetLongPress();

    actionAnchorRef.current =
      event.currentTarget;

    /*
     * Toggle kaadhu.
     * Duplicate clicks vachina stable ga open.
     */
    setShowActions(true);
  };

  const closeActions = () => {
    resetLongPress();

    setShowActions(false);
  };

  const stopReactionPropagation = (
    event
  ) => {
    event.stopPropagation();

    resetLongPress();
  };

  /* =========================
     VISIBLE MESSAGE RECEIPT
  ========================= */

  useEffect(() => {
    visibilityReportedRef.current =
      false;

    if (
      isOwn ||
      isDeletedForEveryone ||
      !message?._id ||
      String(message._id).startsWith(
        "temp-"
      ) ||
      message?.status === "read" ||
      message?.status === "seen" ||
      typeof onVisible !== "function"
    ) {
      return undefined;
    }

    const element =
      visibilityRef.current;

    if (
      !element ||
      typeof IntersectionObserver ===
      "undefined"
    ) {
      return undefined;
    }

    const clearVisibilityTimer =
      () => {
        if (
          !visibilityTimerRef.current
        ) {
          return;
        }

        window.clearTimeout(
          visibilityTimerRef.current
        );

        visibilityTimerRef.current =
          null;
      };

    const observer =
      new IntersectionObserver(
        (entries) => {
          const entry =
            entries[0];

          const pageIsVisible =
            document.visibilityState ===
            "visible";

          const sufficientlyVisible =
            entry?.isIntersecting &&
            entry.intersectionRatio >=
            0.65;

          if (
            !pageIsVisible ||
            !sufficientlyVisible ||
            visibilityReportedRef.current
          ) {
            clearVisibilityTimer();
            return;
          }

          if (
            visibilityTimerRef.current
          ) {
            return;
          }

          /*
           * Quick scroll chesthe Seen
           * raakunda 450ms wait.
           */
          visibilityTimerRef.current =
            window.setTimeout(() => {
              visibilityTimerRef.current =
                null;

              if (
                visibilityReportedRef.current ||
                document.visibilityState !==
                "visible"
              ) {
                return;
              }

              visibilityReportedRef.current =
                true;

              onVisible(message);
            }, 450);
        },
        {
          root:
            visibilityRoot?.current ||
            null,

          threshold: [
            0,
            0.65,
            1,
          ],
        }
      );

    observer.observe(element);

    return () => {
      clearVisibilityTimer();
      observer.disconnect();
    };
  }, [
    message?._id,
    message?.status,
    message?.deletedForEveryone,
    isOwn,
    onVisible,
    visibilityRoot,
  ]);

  /* =========================
     CLEANUP
  ========================= */

  /* =========================
   CLEANUP
========================= */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      clearLongPressTimer();

      actionAnchorRef.current =
        null;

      activePointerIdRef.current =
        null;

      longPressReadyRef.current =
        false;

      suppressContextMenuUntilRef.current =
        0;

      if (
        visibilityTimerRef.current
      ) {
        window.clearTimeout(
          visibilityTimerRef.current
        );

        visibilityTimerRef.current =
          null;
      }

      if (
        reactionErrorTimerRef.current
      ) {
        window.clearTimeout(
          reactionErrorTimerRef.current
        );

        reactionErrorTimerRef.current =
          null;
      }

      if (
        copyFeedbackTimerRef.current
      ) {
        window.clearTimeout(
          copyFeedbackTimerRef.current
        );

        copyFeedbackTimerRef.current =
          null;
      }
    };
  }, []);

  if (isDeleted) {
    return null;
  }

  return (
    <>
      <div
        ref={visibilityRef}
        className={
          isOwn
            ? styles.ownWrapper
            : styles.otherWrapper
        }
      >
        <div
          className={styles.messageGroup}
          onPointerDown={
            handlePointerDown
          }
          onPointerMove={
            handlePointerMove
          }
          onPointerUp={
            handlePointerUp
          }
          onPointerCancel={
            handlePointerCancel
          }
          onContextMenu={
            handleContextMenu
          }
        >
          <div
            className={`${styles.bubble} ${isOwn
              ? styles.ownBubble
              : styles.otherBubble
              } ${hasSharedPost &&
                !hasMessageText &&
                !message?.image
                ? styles.sharedPostOnlyBubble
                : ""
              } 
              ${isTextOnlyMessage
                ? styles.textOnlyBubble
                : ""
              }
              ${isSearchMatch
                ? styles.searchMatch
                : ""
              }${isActiveSearchMatch
                ? styles.activeSearchMatch
                : ""
              } ${isPinnedScrollTarget
                ? styles.pinnedScrollTarget
                : ""
              } ${isDeletedForEveryone
                ? styles.deletedBubble
                : ""
              } ${isFailed
                ? styles.failedBubble
                : ""
              }`}
            aria-current={
              isActiveSearchMatch
                ? "true"
                : undefined
            }
          >
            {isDeletedForEveryone && (
              <div
                className={
                  styles.deletedMessage
                }
                role="status"
                aria-label="This message was deleted"
              >
                <CircleSlash2
                  size={16}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />

                <span>
                  This message was deleted
                </span>
              </div>
            )}

            {!isDeletedForEveryone &&
              isForwarded && (
                <div
                  className={
                    styles.forwardedLabel
                  }
                >
                  <ForwardIcon
                    size={12}
                    strokeWidth={2}
                    aria-hidden="true"
                  />

                  <span>Forwarded</span>
                </div>
              )}

            {!isDeletedForEveryone &&
              repliedMessage && (
                <div
                  className={
                    styles.replyPreview
                  }
                >
                  <span
                    className={
                      styles.replySender
                    }
                  >
                    {repliedSenderName}
                  </span>

                  <div
                    className={
                      styles.replyContent
                    }
                  >
                    {(
                      repliedMessage?.image ||
                      repliedMessage
                        ?.sharedPost?.postId
                    ) && (
                        <ImageIcon
                          size={13}
                          className={
                            styles.replyIcon
                          }
                          aria-hidden="true"
                        />
                      )}

                    <span
                      className={
                        styles.replyText
                      }
                    >
                      {repliedText}
                    </span>
                  </div>
                </div>
              )}

            {!isDeletedForEveryone &&
              message?.image && (
                <img
                  src={message.image}
                  alt="Message attachment"
                  className={
                    styles.image
                  }
                  loading="lazy"
                  decoding="async"
                />
              )}

            {!isDeletedForEveryone &&
              hasSharedPost && (
                <button
                  type="button"
                  className={`${styles.sharedPostCard} ${sharedPostUnavailable
                    ? styles.sharedPostCardUnavailable
                    : ""
                    }`}
                  onClick={
                    handleOpenSharedPost
                  }
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    clearLongPressTimer();
                  }}
                  onPointerUp={(event) => {
                    event.stopPropagation();
                  }}
                  aria-label={
                    sharedPostUnavailable
                      ? "Shared post is no longer available"
                      : `Open ${sharedPostOwnerName}'s post in feed`
                  }

                  disabled={
                    checkingSharedPost ||
                    sharedPostUnavailable
                  }
                  aria-busy={
                    checkingSharedPost
                  }
                >
                  <div
                    className={
                      styles.sharedPostTop
                    }
                  >
                    <img
                      src={
                        sharedPostOwnerProfilePic ||
                        DefaultAvatar
                      }
                      alt=""
                      className={
                        styles.sharedPostAvatar
                      }
                      onError={(event) => {
                        event.currentTarget.onerror =
                          null;

                        event.currentTarget.src =
                          DefaultAvatar;
                      }}
                    />

                    <span
                      className={
                        styles.sharedPostUser
                      }
                    >
                      <strong>
                        {sharedPostOwnerName}
                      </strong>

                      <small>
                        @{sharedPostOwnerUsername}
                      </small>
                    </span>

                    <span
                      className={
                        styles.sharedPostArrow
                      }
                      aria-hidden="true"
                    >
                      {checkingSharedPost
                        ? "…"
                        : sharedPostUnavailable
                          ? "!"
                          : "›"}
                    </span>
                  </div>

                  {sharedPostImage && (
                    <div
                      className={
                        styles.sharedPostMedia
                      }
                    >
                      <img
                        src={sharedPostImage}
                        alt={
                          sharedPostCaption ||
                          "Shared post"
                        }
                        className={
                          styles.sharedPostImage
                        }
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  )}

                  {sharedPostCaption && (
                    <p
                      className={
                        styles.sharedPostCaption
                      }
                    >
                      {sharedPostCaption}
                    </p>
                  )}

                  <div
                    className={
                      styles.sharedPostBottom
                    }
                  >
                    <span>
                      {checkingSharedPost
                        ? "Checking post..."
                        : sharedPostUnavailable
                          ? "Post unavailable"
                          : sharedPostError
                            ? "Tap to try again"
                            : "Tap to view in feed"}
                    </span>
                  </div>

                  {sharedPostError && (
                    <p
                      className={
                        styles.sharedPostError
                      }
                      role={
                        sharedPostUnavailable
                          ? "status"
                          : "alert"
                      }
                    >
                      {sharedPostError}
                    </p>
                  )}
                </button>
              )}

            {!isDeletedForEveryone &&
              message?.text && (
                <p
                  className={
                    styles.text
                  }
                >
                  {isSearchMatch
                    ? highlightMessageText(
                      message.text,
                      searchQuery
                    )
                    : message.text}
                </p>
              )}

            <div className={styles.meta}>
              {!isDeletedForEveryone &&
                isEdited && (
                  <span
                    className={
                      styles.edited
                    }
                    title="This message was edited"
                  >
                    Edited
                  </span>
                )}

              <span className={styles.time}>
                {time}
              </span>

              {isOwn &&
                !isDeletedForEveryone && (
                  <span
                    className={styles.status}
                    aria-label={
                      message?.status || "sent"
                    }
                  >
                    {message?.status ===
                      "sending" && (
                        <Clock3
                          size={14}
                          aria-hidden="true"
                        />
                      )}

                    {message?.status ===
                      "sent" && (
                        <Check
                          size={14}
                          aria-hidden="true"
                        />
                      )}

                    {message?.status ===
                      "delivered" && (
                        <CheckCheck
                          size={14}
                          aria-hidden="true"
                        />
                      )}

                    {message?.status ===
                      "read" && (
                        <span className={styles.seen}>
                          Seen
                        </span>
                      )}

                    {message?.status ===
                      "failed" && (
                        <CircleSlash2
                          size={14}
                          aria-hidden="true"
                        />
                      )}

                    {![
                      "sending",
                      "sent",
                      "delivered",
                      "read",
                      "failed",
                    ].includes(message?.status) && (
                        <Check
                          size={14}
                          aria-hidden="true"
                        />
                      )}
                  </span>
                )}

              {/* THREE-DOTS MESSAGE MENU BUTTON */}
              {canUseActions && (
                <button
                  ref={optionsButtonRef}
                  type="button"
                  className={styles.moreButton}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    clearLongPressTimer();
                  }}
                  onPointerUp={(event) => {
                    event.stopPropagation();
                  }}
                  onClick={openActions}
                  aria-label="Message options"
                  aria-haspopup="menu"
                  aria-expanded={showActions}
                  data-open={
                    showActions
                      ? "true"
                      : "false"
                  }
                >
                  <MoreVertical
                    size={16}
                    aria-hidden="true"
                  />
                </button>
              )}
            </div>
          </div>

          {isFailed && (
            <div
              className={
                styles.failedDelivery
              }
              role="alert"
            >
              <span
                className={
                  styles.failedText
                }
              >
                {retryError ||
                  message?.sendError ||
                  "Message not sent"}
              </span>

              <button
                type="button"
                className={
                  styles.retryMessageButton
                }
                onClick={
                  handleRetryMessage
                }
                disabled={
                  retryLoading ||
                  !canRetry
                }
                aria-label="Retry sending message"
              >
                <RotateCcw
                  size={14}
                  aria-hidden="true"
                />

                <span>
                  {retryLoading
                    ? "Sending…"
                    : "Retry"}
                </span>
              </button>
            </div>
          )}

          {!isDeletedForEveryone &&
            reactionGroups.length > 0 && (
              <div
                className={`${styles.reactionSummary} ${isOwn
                  ? styles.ownReactions
                  : styles.otherReactions
                  }`}
                aria-label="Message reactions"
                aria-busy={reactionLoading}
                onPointerDown={
                  stopReactionPropagation
                }
                onPointerUp={(event) => {
                  event.stopPropagation();
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                {reactionGroups.map(
                  ({
                    emoji,
                    count,
                    selected,
                  }) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`${styles.reactionChip} ${selected
                        ? styles.reactionChipSelected
                        : ""
                        }`}
                      onClick={() =>
                        handleReaction(
                          emoji
                        )
                      }
                      disabled={
                        reactionLoading ||
                        isBlocked
                      }
                      aria-label={`${emoji} reaction, ${count} ${count === 1
                        ? "person"
                        : "people"
                        }`}
                      aria-pressed={
                        selected
                      }
                    >
                      <span
                        className={
                          styles.reactionEmoji
                        }
                        aria-hidden="true"
                      >
                        {emoji}
                      </span>

                      <span
                        className={
                          styles.reactionCount
                        }
                      >
                        {count}
                      </span>
                    </button>
                  )
                )}
              </div>
            )}

          {reactionError && (
            <span
              className={
                styles.reactionError
              }
              role="status"
            >
              {reactionError}
            </span>
          )}

          {copyFeedback && (
            <span
              className={
                styles.copyFeedback
              }
              role="status"
            >
              {copyFeedback}
            </span>
          )}

          {pinError && (
            <span
              className={
                styles.reactionError
              }
              role="alert"
            >
              {pinError}
            </span>
          )}

          <MessageActionsMenu
            open={showActions}
            anchorRef={actionAnchorRef}
            isOwn={isOwn}

            canReply={
              canInteract
            }

            canReact={
              canInteract
            }

            canCopy={canCopy}
            canEdit={canEdit}
            canForward={canForward}
            canPin={
              canPin &&
              !pinLoading
            }
            isPinned={isPinned}
            selectedReaction={
              selectedReaction
            }
            onClose={closeActions}
            onReply={handleReply}
            onCopy={handleCopy}
            onForward={handleForward}
            onPin={handlePin}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReact={handleReaction}
          />
        </div>
      </div>

      <DeleteMessageModal
        open={
          showDeleteModal
        }
        isOwn={isOwn}
        loadingMode={
          deleteLoadingMode
        }
        error={
          deleteError
        }
        onClose={
          closeDeleteModal
        }
        onDeleteForMe={() =>
          confirmDelete("forMe")
        }
        onDeleteForEveryone={() =>
          confirmDelete(
            "forEveryone"
          )
        }
      />
    </>
  );
};

export default MessageBubble;