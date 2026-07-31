import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ChevronLeft,
  CircleAlert,
  ImagePlus,
  LoaderCircle,
  RotateCw,
  Send,
  SlidersHorizontal,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../../context/AuthContext";

import {
  createPost,
} from "../../services/postService";

import DefaultAvatar from "../../assets/default-avatar.png";

import styles from "./CreatePost.module.css";

const MAX_CAPTION_LENGTH = 500;

const MAX_IMAGE_SIZE =
  10 * 1024 * 1024;

const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1350;

const normalizeRotation = (
  value
) => {
  const normalized =
    value % 360;

  return normalized < 0
    ? normalized + 360
    : normalized;
};

const validateImageFile = (
  file
) => {
  if (!file) {
    return "Please select a photo.";
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (
    !allowedTypes.includes(
      file.type
    )
  ) {
    return "Only JPG, PNG and WebP photos are supported.";
  }

  if (
    file.size >
    MAX_IMAGE_SIZE
  ) {
    return "Photo must be smaller than 10 MB.";
  }

  return "";
};

const readFileAsDataUrl = (
  file
) =>
  new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload = () => {
        if (
          typeof reader.result ===
          "string"
        ) {
          resolve(
            reader.result
          );

          return;
        }

        reject(
          new Error(
            "Unable to preview this photo."
          )
        );
      };

      reader.onerror = () => {
        reject(
          new Error(
            "Unable to preview this photo."
          )
        );
      };

      reader.readAsDataURL(
        file
      );
    }
  );

const loadImage = (
  source
) =>
  new Promise(
    (resolve, reject) => {
      const image =
        new Image();

      image.onload = () => {
        resolve(image);
      };

      image.onerror = () => {
        reject(
          new Error(
            "Unable to process this photo."
          )
        );
      };

      image.src = source;
    }
  );

const getSafeFileName = (
  fileName
) =>
  String(
    fileName || "post"
  )
    .replace(
      /\.[^.]+$/,
      ""
    )
    .replace(
      /[^a-zA-Z0-9_-]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    ) || "post";

const canvasToFile = (
  canvas,
  originalName
) =>
  new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                "Unable to prepare post photo."
              )
            );

            return;
          }

          resolve(
            new File(
              [blob],
              `${getSafeFileName(
                originalName
              )}.jpg`,
              {
                type:
                  "image/jpeg",

                lastModified:
                  Date.now(),
              }
            )
          );
        },
        "image/jpeg",
        0.9
      );
    }
  );

const preparePostImage =
  async ({
    file,
    imageSource,
    fitMode,
    rotation,
    zoom,
    position,
  }) => {

    const sourceImage =
      await loadImage(
        imageSource
      );

    const normalizedRotation =
      normalizeRotation(
        rotation
      );

    const quarterTurn =
      normalizedRotation ===
      90 ||
      normalizedRotation ===
      270;

    const rotatedWidth =
      quarterTurn
        ? sourceImage.height
        : sourceImage.width;

    const rotatedHeight =
      quarterTurn
        ? sourceImage.width
        : sourceImage.height;

    const fitScale =
      Math.min(
        OUTPUT_WIDTH /
        rotatedWidth,

        OUTPUT_HEIGHT /
        rotatedHeight
      );

    const fillScale =
      Math.max(
        OUTPUT_WIDTH /
        rotatedWidth,

        OUTPUT_HEIGHT /
        rotatedHeight
      );

    const finalScale =
      fitMode === "fill"
        ? fillScale
        : fitScale;

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width =
      OUTPUT_WIDTH;

    canvas.height =
      OUTPUT_HEIGHT;

    const context =
      canvas.getContext(
        "2d"
      );

    if (!context) {
      throw new Error(
        "Photo editor is unavailable."
      );
    }

    context.fillStyle =
      "#000000";

    context.fillRect(
      0,
      0,
      OUTPUT_WIDTH,
      OUTPUT_HEIGHT
    );

    context.save();

    context.translate(
      OUTPUT_WIDTH / 2 +
      position.x *
      OUTPUT_WIDTH,

      OUTPUT_HEIGHT / 2 +
      position.y *
      OUTPUT_HEIGHT
    );

    context.rotate(
      (
        normalizedRotation *
        Math.PI
      ) / 180
    );

    context.scale(
      finalScale * zoom,
      finalScale * zoom
    );

    context.drawImage(
      sourceImage,
      -sourceImage.width /
      2,
      -sourceImage.height /
      2
    );

    context.restore();

    return canvasToFile(
      canvas,
      file.name
    );
  };

const CreatePost = ({
  onPostCreated,
}) => {
  const navigate =
    useNavigate();

  const { user } =
    useAuth();

  const fileInputRef =
    useRef(null);

  const editorFrameRef =
    useRef(null);

  const gestureRef =
    useRef({
      dragging: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      initialX: 0,
      initialY: 0,

      pointers: new Map(),
      pinchDistance: 0,
      pinchZoom: 1,

      lastTapTime: 0,
      lastTapX: 0,
      lastTapY: 0,
    });

  const [
    imageFile,
    setImageFile,
  ] = useState(null);

  const [
    imageSource,
    setImageSource,
  ] = useState("");

  const [
    caption,
    setCaption,
  ] = useState("");

  const [
    fitMode,
    setFitMode,
  ] = useState("fill");

  const [
    rotation,
    setRotation,
  ] = useState(0);

  const [
    zoom,
    setZoom,
  ] = useState(1);

  const [
    position,
    setPosition,
  ] = useState({
    x: 0,
    y: 0,
  });

  const [
    toolsOpen,
    setToolsOpen,
  ] = useState(false);

  const [
    dragActive,
    setDragActive,
  ] = useState(false);

  const [
    imageLoading,
    setImageLoading,
  ] = useState(false);

  const [
    preparing,
    setPreparing,
  ] = useState(false);

  const [
    posting,
    setPosting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    discardOpen,
    setDiscardOpen,
  ] = useState(false);

  const busy =
    imageLoading ||
    preparing ||
    posting;

  const hasChanges =
    Boolean(
      imageFile ||
      caption.trim()
    );

  const canSubmit =
    Boolean(
      imageFile &&
      imageSource &&
      !busy
    );

  const MIN_ZOOM = 1;
  const MAX_ZOOM = 3;

  const clamp = (
    value,
    minimum,
    maximum
  ) =>
    Math.min(
      maximum,
      Math.max(
        minimum,
        value
      )
    );

  const normalizedRotation =
    useMemo(
      () =>
        normalizeRotation(
          rotation
        ),
      [rotation]
    );

  const avatar =
    user?.profilePic ||
    user?.avatar ||
    user?.photoURL ||
    DefaultAvatar;

  const resetPhoto =
    useCallback(() => {
      setFitMode("fill");
      setRotation(0);
      setZoom(1);

      setPosition({
        x: 0,
        y: 0,
      });

      setError("");
    }, []);

  const clearComposer =
    useCallback(() => {
      setImageFile(null);
      setImageSource("");
      setCaption("");
      setToolsOpen(false);
      setDragActive(false);
      setError("");
      setDiscardOpen(false);

      resetPhoto();

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }
    }, [resetPhoto]);

  const closeImmediately =
    useCallback(() => {
      if (busy) {
        return;
      }

      clearComposer();

      navigate(
        "/home",
        {
          replace: true,
        }
      );
    }, [
      busy,
      clearComposer,
      navigate,
    ]);

  const requestClose =
    useCallback(() => {
      if (busy) {
        return;
      }

      if (hasChanges) {
        setDiscardOpen(true);
        return;
      }

      closeImmediately();
    }, [
      busy,
      closeImmediately,
      hasChanges,
    ]);

  useEffect(() => {
    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style
      .overflow = "hidden";

    const handleKeyDown = (
      event
    ) => {
      if (
        event.key ===
        "Escape"
      ) {
        if (discardOpen) {
          setDiscardOpen(
            false
          );

          return;
        }

        requestClose();
      }

      if (
        event.key ===
        "Enter" &&
        (
          event.ctrlKey ||
          event.metaKey
        ) &&
        canSubmit
      ) {
        event.preventDefault();

        document
          .getElementById(
            "create-post-submit"
          )
          ?.click();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style
        .overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    canSubmit,
    discardOpen,
    requestClose,
  ]);

  const selectImage =
    useCallback(
      async (file) => {
        const validationError =
          validateImageFile(
            file
          );

        if (
          validationError
        ) {
          setError(
            validationError
          );

          return;
        }

        try {
          setImageLoading(true);
          setError("");

          const source =
            await readFileAsDataUrl(
              file
            );

          setImageFile(
            file
          );

          setImageSource(
            source
          );

          resetPhoto();
        } catch (
        selectionError
        ) {
          setError(
            selectionError
              ?.message ||
            "Unable to preview this photo."
          );
        } finally {
          setImageLoading(false);
        }
      },
      [resetPhoto]
    );

  const handleImageChange = (
    event
  ) => {
    const selectedFile =
      event.target
        .files?.[0];

    event.target.value =
      "";

    if (selectedFile) {
      void selectImage(
        selectedFile
      );
    }
  };

  const removeImage = () => {
    if (busy) {
      return;
    }

    setImageFile(null);
    setImageSource("");
    setToolsOpen(false);
    setError("");

    resetPhoto();
  };

  const handleDrop = (
    event
  ) => {
    event.preventDefault();

    setDragActive(false);

    if (busy) {
      return;
    }

    const droppedFile =
      event.dataTransfer
        .files?.[0];

    if (droppedFile) {
      void selectImage(
        droppedFile
      );
    }
  };

  const getPointerDistance = (
    pointers
  ) => {
    const values = [
      ...pointers.values(),
    ];

    if (values.length < 2) {
      return 0;
    }

    const first = values[0];
    const second = values[1];

    return Math.hypot(
      second.x - first.x,
      second.y - first.y
    );
  };

  const handlePointerDown = (
    event
  ) => {
    if (
      busy ||
      !imageSource ||
      !editorFrameRef.current
    ) {
      return;

      const now = Date.now();

      const tapDistance =
        Math.hypot(
          event.clientX -
          gestureRef.current.lastTapX,
          event.clientY -
          gestureRef.current.lastTapY
        );

      const isDoubleTap =
        now -
        gestureRef.current.lastTapTime <
        300 &&
        tapDistance < 35;

      gestureRef.current.lastTapTime =
        now;

      gestureRef.current.lastTapX =
        event.clientX;

      gestureRef.current.lastTapY =
        event.clientY;

      if (
        isDoubleTap &&
        event.pointerType === "touch"
      ) {
        setZoom(1);

        setPosition({
          x: 0,
          y: 0,
        });

        return;
      }
    }

    event.currentTarget
      .setPointerCapture(
        event.pointerId
      );

    gestureRef.current.pointers.set(
      event.pointerId,
      {
        x: event.clientX,
        y: event.clientY,
      }
    );

    if (
      gestureRef.current
        .pointers.size === 1
    ) {
      gestureRef.current.dragging =
        true;

      gestureRef.current.pointerId =
        event.pointerId;

      gestureRef.current.startX =
        event.clientX;

      gestureRef.current.startY =
        event.clientY;

      gestureRef.current.initialX =
        position.x;

      gestureRef.current.initialY =
        position.y;
    }

    if (
      gestureRef.current
        .pointers.size === 2
    ) {
      gestureRef.current.dragging =
        false;

      gestureRef.current
        .pinchDistance =
        getPointerDistance(
          gestureRef.current
            .pointers
        );

      gestureRef.current.pinchZoom =
        zoom;
    }
  };

  const handlePointerMove = (
    event
  ) => {
    if (
      !editorFrameRef.current ||
      !gestureRef.current
        .pointers.has(
          event.pointerId
        )
    ) {
      return;
    }

    gestureRef.current.pointers.set(
      event.pointerId,
      {
        x: event.clientX,
        y: event.clientY,
      }
    );

    const pointerCount =
      gestureRef.current
        .pointers.size;

    if (pointerCount === 2) {
      const distance =
        getPointerDistance(
          gestureRef.current
            .pointers
        );

      const startDistance =
        gestureRef.current
          .pinchDistance;

      if (startDistance > 0) {
        const nextZoom =
          gestureRef.current
            .pinchZoom *
          (
            distance /
            startDistance
          );

        setZoom(
          clamp(
            nextZoom,
            MIN_ZOOM,
            MAX_ZOOM
          )
        );
      }

      return;
    }

    if (
      pointerCount === 1 &&
      gestureRef.current
        .dragging &&
      gestureRef.current
        .pointerId ===
      event.pointerId
    ) {
      const bounds =
        editorFrameRef.current
          .getBoundingClientRect();

      if (
        !bounds.width ||
        !bounds.height
      ) {
        return;
      }

      const deltaX =
        (
          event.clientX -
          gestureRef.current
            .startX
        ) /
        bounds.width;

      const deltaY =
        (
          event.clientY -
          gestureRef.current
            .startY
        ) /
        bounds.height;

      setPosition({
        x: clamp(
          gestureRef.current
            .initialX +
          deltaX,
          -0.5,
          0.5
        ),

        y: clamp(
          gestureRef.current
            .initialY +
          deltaY,
          -0.5,
          0.5
        ),
      });
    }
  };

  const handlePointerEnd = (
    event
  ) => {
    gestureRef.current.pointers.delete(
      event.pointerId
    );

    if (
      gestureRef.current
        .pointers.size === 0
    ) {
      gestureRef.current.dragging =
        false;

      gestureRef.current.pointerId =
        null;

      gestureRef.current
        .pinchDistance = 0;
    }

    if (
      gestureRef.current
        .pointers.size === 1
    ) {
      const [
        remainingPointerId,
        remainingPointer,
      ] = [
        ...gestureRef.current
          .pointers.entries(),
      ][0];

      gestureRef.current.dragging =
        true;

      gestureRef.current.pointerId =
        remainingPointerId;

      gestureRef.current.startX =
        remainingPointer.x;

      gestureRef.current.startY =
        remainingPointer.y;

      gestureRef.current.initialX =
        position.x;

      gestureRef.current.initialY =
        position.y;
    }
  };

  const handleSubmit =
    async (event) => {
      event?.preventDefault();

      if (!canSubmit) {
        setError(
          "Please add a photo before sharing."
        );

        return;
      }

      try {
        setPreparing(true);
        setError("");

        const preparedImage =
          await preparePostImage({
            file:
              imageFile,

            imageSource,

            fitMode,

            rotation:
              normalizedRotation,

            zoom,

            position,
          });

        setPreparing(false);
        setPosting(true);

        const formData =
          new FormData();

        formData.append(
          "caption",
          caption.trim()
        );

        formData.append(
          "postImage",
          preparedImage
        );

        const response =
          await createPost(
            formData
          );

        const createdPost =
          response?.post ||
          response?.data?.post ||
          response?.data ||
          null;

        if (
          createdPost &&
          typeof createdPost ===
          "object"
        ) {
          try {
            sessionStorage.setItem(
              "pingme:new-post",
              JSON.stringify(
                createdPost
              )
            );
          } catch {
            // Local cache failure
            // should not fail posting.
          }
        }

        clearComposer();

        if (onPostCreated) {
          await onPostCreated(
            createdPost
          );
        }

        navigate(
          "/home",
          {
            replace: true,
          }
        );
      } catch (
      submitError
      ) {
        console.error(
          "CREATE POST ERROR:",
          submitError
            ?.response?.data ||
          submitError?.message
        );

        setError(
          submitError
            ?.userMessage ||
          submitError
            ?.response?.data
            ?.message ||
          submitError?.message ||
          "Failed to create post. Please try again."
        );
      } finally {
        setPreparing(false);
        setPosting(false);
      }
    };

  const previewTransform =
    `translate(${position.x * 100}%, ${position.y * 100}%) scale(${zoom}) rotate(${normalizedRotation}deg)`;

  return (
    <>
      <div
        className={
          styles.modalBackdrop
        }
        onMouseDown={(
          event
        ) => {
          if (
            event.target ===
            event.currentTarget
          ) {
            requestClose();
          }
        }}
      >
        <section
          className={
            styles.modal
          }
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-post-title"
        >
          <header
            className={
              styles.modalHeader
            }
          >
            <button
              type="button"
              className={
                styles.headerIconButton
              }
              onClick={
                requestClose
              }
              disabled={busy}
              aria-label="Close create post"
            >
              {imageSource ? (
                <ChevronLeft />
              ) : (
                <X />
              )}
            </button>

            <div
              className={
                styles.headerTitle
              }
            >
              <strong
                id="create-post-title"
              >
                New post
              </strong>

              <span>
                Share a moment with
                your community
              </span>
            </div>

            <button
              id="create-post-submit"
              type="button"
              className={
                styles.headerPostButton
              }
              onClick={
                handleSubmit
              }
              disabled={
                !canSubmit
              }
            >
              {busy ? (
                <LoaderCircle
                  className={
                    styles.spinner
                  }
                />
              ) : (
                <Send />
              )}

              <span>
                {posting
                  ? "Sharing"
                  : preparing
                    ? "Preparing"
                    : "Share"}
              </span>
            </button>
          </header>

          {!imageSource ? (
            <div
              className={
                styles.uploadStage
              }
            >
              <button
                type="button"
                className={`${styles.dropZone} ${dragActive
                  ? styles.dropZoneActive
                  : ""
                  }`}
                onClick={() =>
                  fileInputRef
                    .current
                    ?.click()
                }
                onDragOver={(
                  event
                ) => {
                  event.preventDefault();

                  if (!busy) {
                    setDragActive(
                      true
                    );
                  }
                }}
                onDragLeave={() =>
                  setDragActive(
                    false
                  )
                }
                onDrop={
                  handleDrop
                }
                disabled={busy}
              >
                {imageLoading ? (
                  <>
                    <LoaderCircle
                      className={
                        styles.spinner
                      }
                    />

                    <strong>
                      Preparing photo
                    </strong>
                  </>
                ) : (
                  <>
                    <div
                      className={
                        styles.uploadIcon
                      }
                    >
                      <UploadCloud />
                    </div>

                    <strong>
                      Choose a photo
                    </strong>

                    <span>
                      Drag and drop here
                      or browse your
                      device
                    </span>

                    <small>
                      JPG, PNG or WebP
                      • up to 10 MB
                    </small>
                  </>
                )}
              </button>

              {error && (
                <div
                  className={
                    styles.errorMessage
                  }
                  role="alert"
                >
                  <CircleAlert />

                  <span>
                    {error}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div
              className={
                styles.composerBody
              }
            >
              <div
                className={
                  styles.previewPanel
                }
              >
                <div
                  ref={editorFrameRef}
                  className={
                    styles.editorCanvas
                  }
                  onPointerDown={
                    handlePointerDown
                  }
                  onPointerMove={
                    handlePointerMove
                  }
                  onPointerUp={
                    handlePointerEnd
                  }
                  onPointerCancel={
                    handlePointerEnd
                  }
                >
                  <img
                    src={
                      imageSource
                    }
                    alt="Post preview"
                    draggable="false"
                    className={`${styles.previewImage} ${fitMode ===
                      "fill"
                      ? styles.previewFill
                      : styles.previewFit
                      }`}
                    style={{
                      transform:
                        previewTransform,
                    }}
                  />

                  <span
                    className={
                      styles.dragHint
                    }
                  >
                    Drag to move • Pinch to zoom
                  </span>
                </div>

                <div
                  className={
                    styles.quickTools
                  }
                >
                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef
                        .current
                        ?.click()
                    }
                    disabled={busy}
                  >
                    <ImagePlus />
                    Replace
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFitMode(
                        (current) =>
                          current === "fill"
                            ? "fit"
                            : "fill"
                      );

                      setZoom(1);

                      setPosition({
                        x: 0,
                        y: 0,
                      });
                    }}
                    disabled={busy}
                  >
                    <SlidersHorizontal />

                    {fitMode ===
                      "fill"
                      ? "Show full"
                      : "Fill frame"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRotation(
                        (current) =>
                          current + 90
                      );

                      setPosition({
                        x: 0,
                        y: 0,
                      });

                      setZoom(1);
                    }}
                    disabled={busy}
                  >
                    <RotateCw />
                    Rotate
                  </button>

                  <button
                    type="button"
                    className={
                      styles.removeButton
                    }
                    onClick={
                      removeImage
                    }
                    disabled={busy}
                  >
                    <Trash2 />
                    Remove
                  </button>
                </div>
              </div>

              <aside
                className={
                  styles.composePanel
                }
              >
                <div
                  className={
                    styles.userRow
                  }
                >
                  <img
                    src={avatar}
                    alt=""
                    onError={(
                      event
                    ) => {
                      event.currentTarget.onerror =
                        null;

                      event.currentTarget.src =
                        DefaultAvatar;
                    }}
                  />

                  <div>
                    <strong>
                      {user?.name ||
                        user?.username ||
                        "You"}
                    </strong>

                    <span>
                      Public post
                    </span>
                  </div>
                </div>

                <div
                  className={
                    styles.captionCard
                  }
                >
                  <textarea
                    value={
                      caption
                    }
                    onChange={(
                      event
                    ) => {
                      setCaption(
                        event.target.value
                          .slice(
                            0,
                            MAX_CAPTION_LENGTH
                          )
                      );

                      if (error) {
                        setError("");
                      }
                    }}
                    placeholder="Write a caption..."
                    maxLength={
                      MAX_CAPTION_LENGTH
                    }
                    disabled={busy}
                    autoFocus
                  />

                  <div
                    className={
                      styles.captionMeta
                    }
                  >
                    <span>
                      Add a thought or
                      story
                    </span>

                    <span
                      className={
                        caption.length >
                          450
                          ? styles.captionLimit
                          : ""
                      }
                    >
                      {caption.length}/
                      {MAX_CAPTION_LENGTH}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className={
                    styles.toolsToggle
                  }
                  onClick={() =>
                    setToolsOpen(
                      (
                        current
                      ) =>
                        !current
                    )
                  }
                  disabled={busy}
                >
                  <SlidersHorizontal />

                  Photo options

                  <span>
                    {toolsOpen
                      ? "Hide"
                      : "Open"}
                  </span>
                </button>

                {toolsOpen && (
                  <div
                    className={
                      styles.toolsPanel
                    }
                  >
                    <button
                      type="button"
                      className={
                        fitMode ===
                          "fill"
                          ? styles.toolActive
                          : ""
                      }
                      onClick={() =>
                        setFitMode(
                          "fill"
                        )
                      }
                      disabled={busy}
                    >
                      Fill frame
                    </button>

                    <button
                      type="button"
                      className={
                        fitMode ===
                          "fit"
                          ? styles.toolActive
                          : ""
                      }
                      onClick={() =>
                        setFitMode(
                          "fit"
                        )
                      }
                      disabled={busy}
                    >
                      Show full photo
                    </button>

                    <button
                      type="button"
                      onClick={
                        resetPhoto
                      }
                      disabled={busy}
                    >
                      Reset
                    </button>
                  </div>
                )}

                {error && (
                  <div
                    className={
                      styles.errorMessage
                    }
                    role="alert"
                  >
                    <CircleAlert />

                    <span>
                      {error}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  className={
                    styles.mobileShareButton
                  }
                  onClick={
                    handleSubmit
                  }
                  disabled={
                    !canSubmit
                  }
                >
                  {busy ? (
                    <LoaderCircle
                      className={
                        styles.spinner
                      }
                    />
                  ) : (
                    <Send />
                  )}

                  {posting
                    ? "Sharing..."
                    : preparing
                      ? "Preparing..."
                      : "Share post"}
                </button>
              </aside>
            </div>
          )}

          {busy && (
            <div
              className={
                styles.processingOverlay
              }
              role="status"
            >
              <LoaderCircle
                className={
                  styles.spinner
                }
              />

              <strong>
                {posting
                  ? "Sharing your post"
                  : "Preparing your photo"}
              </strong>

              <span>
                Please keep this
                window open.
              </span>
            </div>
          )}
        </section>
      </div>

      <input
        ref={
          fileInputRef
        }
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={
          handleImageChange
        }
      />

      {discardOpen && (
        <div
          className={
            styles.confirmBackdrop
          }
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setDiscardOpen(
                false
              );
            }
          }}
        >
          <section
            className={
              styles.confirmDialog
            }
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="discard-post-title"
          >
            <div
              className={
                styles.confirmIcon
              }
            >
              <Trash2 />
            </div>

            <h2
              id="discard-post-title"
            >
              Discard this post?
            </h2>

            <p>
              Your selected photo and
              caption will be lost.
            </p>

            <div
              className={
                styles.confirmActions
              }
            >
              <button
                type="button"
                onClick={() =>
                  setDiscardOpen(
                    false
                  )
                }
              >
                Keep editing
              </button>

              <button
                type="button"
                className={
                  styles.discardButton
                }
                onClick={
                  closeImmediately
                }
              >
                Discard
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
};

export default memo(
  CreatePost
);