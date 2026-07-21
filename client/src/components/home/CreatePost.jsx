import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  CheckCircle2,
  CircleAlert,
  ImagePlus,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Move,
  RotateCcw,
  RotateCw,
  Send,
  Trash2,
  Undo2,
  UploadCloud,
  X,
  ZoomIn,
  ZoomOut,
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

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.05;

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

const normalizeRotation = (
  value
) => {
  const normalized =
    value % 360;

  return normalized < 0
    ? normalized + 360
    : normalized;
};

const readFileAsDataUrl = (
  file
) =>
  new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload = () => {
        const result =
          typeof reader.result ===
            "string"
            ? reader.result
            : "";

        if (!result) {
          reject(
            new Error(
              "Unable to read this image"
            )
          );

          return;
        }

        resolve(result);
      };

      reader.onerror = () => {
        reject(
          new Error(
            "Unable to read this image"
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
            "Unable to process this image"
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
    .replace(/\.[^.]+$/, "")
    .replace(
      /[^a-zA-Z0-9_-]+/g,
      "-"
    )
    .replace(/^-+|-+$/g, "") ||
  "post";

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
                "Unable to prepare post image"
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
                type: "image/jpeg",
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
    zoom,
    rotation,
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

    const isQuarterTurn =
      normalizedRotation === 90 ||
      normalizedRotation === 270;

    const rotatedWidth =
      isQuarterTurn
        ? sourceImage.height
        : sourceImage.width;

    const rotatedHeight =
      isQuarterTurn
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

    const baseScale =
      fitMode === "fill"
        ? fillScale
        : fitScale;

    const finalScale =
      baseScale * zoom;

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
        "Image editor is unavailable"
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
      ) /
      180
    );

    context.scale(
      finalScale,
      finalScale
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

const validateImageFile = (
  file
) => {
  if (!file) {
    return "Please select an image.";
  }

  if (
    !file.type.startsWith(
      "image/"
    )
  ) {
    return "Please select a valid image.";
  }

  if (
    ![
      "image/jpeg",
      "image/png",
      "image/webp",
    ].includes(file.type)
  ) {
    return "Only JPG, PNG and WebP images are supported.";
  }

  if (
    file.size >
    MAX_IMAGE_SIZE
  ) {
    return "Image must be smaller than 10 MB.";
  }

  return "";
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

  const textareaRef =
    useRef(null);

  const editorFrameRef =
    useRef(null);

  const dragStateRef =
    useRef({
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      initialX: 0,
      initialY: 0,
    });

  const [
    modalOpen,
    setModalOpen,
  ] = useState(true);

  const [
    caption,
    setCaption,
  ] = useState("");

  const [
    imageFile,
    setImageFile,
  ] = useState(null);

  const [
    imageSource,
    setImageSource,
  ] = useState("");

  const [
    imageLoading,
    setImageLoading,
  ] = useState(false);

  const [
    dragActive,
    setDragActive,
  ] = useState(false);

  const [
    fitMode,
    setFitMode,
  ] = useState("fit");

  const [
    zoom,
    setZoom,
  ] = useState(1);

  const [
    rotation,
    setRotation,
  ] = useState(0);

  const [
    position,
    setPosition,
  ] = useState({
    x: 0,
    y: 0,
  });

  const [
    posting,
    setPosting,
  ] = useState(false);

  const [
    preparing,
    setPreparing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    toast,
    setToast,
  ] = useState(null);

  const [
    discardDialogOpen,
    setDiscardDialogOpen,
  ] = useState(false);

  const normalizedRotation =
    useMemo(
      () =>
        normalizeRotation(
          rotation
        ),
      [rotation]
    );

  const busy =
    posting ||
    preparing ||
    imageLoading;

  const hasChanges =
    Boolean(
      caption.trim() ||
      imageFile
    );

  const canSubmit =
    Boolean(
      imageFile &&
      imageSource &&
      !busy
    );

  const avatar =
    user?.profilePic ||
    user?.avatar ||
    user?.photoURL ||
    DefaultAvatar;


  const showToast =
    useCallback(
      ({
        type,
        title,
        message,
      }) => {
        setToast({
          id: Date.now(),
          type,
          title,
          message,
        });
      },
      []
    );

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeoutId =
      window.setTimeout(
        () => {
          setToast(null);
        },
        toast.type === "error"
          ? 4500
          : 3500
      );

    return () => {
      window.clearTimeout(
        timeoutId
      );
    };
  }, [toast]);

  const resetEditor =
    useCallback(() => {
      setFitMode("fit");
      setZoom(1);
      setRotation(0);

      setPosition({
        x: 0,
        y: 0,
      });

      setError("");
    }, []);

  const clearComposer =
    useCallback(() => {
      setCaption("");
      setImageFile(null);
      setImageSource("");
      setImageLoading(false);
      setDragActive(false);
      setError("");
      setDiscardDialogOpen(false);

      resetEditor();

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }
    }, [resetEditor]);


  const closeComposerImmediately =
    useCallback(() => {
      if (busy) {
        return;
      }

      clearComposer();
      setModalOpen(false);

      navigate("/home", {
        replace: true,
      });
    }, [
      busy,
      clearComposer,
      navigate,
    ]);

  const requestCloseComposer =
    useCallback(() => {
      if (busy) {
        return;
      }

      if (hasChanges) {
        setDiscardDialogOpen(
          true
        );

        return;
      }

      closeComposerImmediately();
    }, [
      busy,
      closeComposerImmediately,
      hasChanges,
    ]);

  useEffect(() => {
    if (!modalOpen) {
      return undefined;
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style
      .overflow = "hidden";

    const handleKeyDown =
      (event) => {
        if (
          discardDialogOpen
        ) {
          if (
            event.key ===
            "Escape"
          ) {
            setDiscardDialogOpen(
              false
            );
          }

          return;
        }

        if (
          event.key ===
          "Escape"
        ) {
          requestCloseComposer();
        }

        if (
          event.key ===
          "Enter" &&
          (event.ctrlKey ||
            event.metaKey)
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
    discardDialogOpen,
    modalOpen,
    requestCloseComposer,
  ]);

  const selectImage =
    useCallback(
      async (file) => {
        const validationError =
          validateImageFile(
            file
          );

        if (validationError) {
          setError(
            validationError
          );

          showToast({
            type: "error",
            title:
              "Image unavailable",
            message:
              validationError,
          });

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

          resetEditor();
        } catch (
        readError
        ) {
          const message =
            readError?.message ||
            "Unable to preview this image.";

          setError(
            message
          );

          showToast({
            type: "error",
            title:
              "Preview failed",
            message,
          });
        } finally {
          setImageLoading(false);
        }
      },
      [
        resetEditor,
        showToast,
      ]
    );

  const handleImageChange =
    (event) => {
      const selectedFile =
        event.target
          .files?.[0];

      event.target.value =
        "";

      if (!selectedFile) {
        return;
      }

      void selectImage(
        selectedFile
      );
    };

  const removeImage =
    useCallback(() => {
      if (busy) {
        return;
      }

      setImageFile(null);
      setImageSource("");
      setError("");

      resetEditor();

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }
    }, [
      busy,
      resetEditor,
    ]);

  const handleDragOver =
    (event) => {
      event.preventDefault();

      if (!busy) {
        setDragActive(true);
      }
    };

  const handleDragLeave =
    (event) => {
      if (
        event.currentTarget.contains(
          event.relatedTarget
        )
      ) {
        return;
      }

      setDragActive(false);
    };

  const handleDrop =
    (event) => {
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

  const handlePointerDown =
    (event) => {
      if (
        busy ||
        !imageSource ||
        !editorFrameRef.current
      ) {
        return;
      }

      event.currentTarget
        .setPointerCapture(
          event.pointerId
        );

      dragStateRef.current = {
        active: true,
        pointerId:
          event.pointerId,
        startX:
          event.clientX,
        startY:
          event.clientY,
        initialX:
          position.x,
        initialY:
          position.y,
      };
    };

  const handlePointerMove =
    (event) => {
      const dragState =
        dragStateRef.current;

      if (
        !dragState.active ||
        dragState.pointerId !==
        event.pointerId ||
        !editorFrameRef.current
      ) {
        return;
      }

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
          dragState.startX
        ) /
        bounds.width;

      const deltaY =
        (
          event.clientY -
          dragState.startY
        ) /
        bounds.height;

      setPosition({
        x: clamp(
          dragState.initialX +
          deltaX,
          -0.5,
          0.5
        ),

        y: clamp(
          dragState.initialY +
          deltaY,
          -0.5,
          0.5
        ),
      });
    };

  const stopDragging =
    (event) => {
      if (
        dragStateRef.current
          .pointerId ===
        event.pointerId
      ) {
        dragStateRef.current = {
          active: false,
          pointerId: null,
          startX: 0,
          startY: 0,
          initialX: 0,
          initialY: 0,
        };
      }
    };

  const handleSubmit =
    async (event) => {
      event?.preventDefault();

      if (
        busy ||
        !imageFile ||
        !imageSource
      ) {
        if (!imageFile) {
          setError(
            "Please add an image before posting."
          );
        }

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
            zoom,
            rotation:
              normalizedRotation,
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
          } catch (storageError) {
            console.warn(
              "Unable to cache new post:",
              storageError
            );
          }
        }

        clearComposer();
        setModalOpen(false);

        navigate("/home", {
          replace: true,
        });

        showToast({
          type: "success",
          title:
            "Post shared",
          message:
            "Your post is now live.",
        });

        if (onPostCreated) {
          await onPostCreated(
            createdPost
          );
        }
      } catch (
      submitError
      ) {
        console.error(
          "CREATE POST ERROR:",
          submitError.response
            ?.data ||
          submitError.message
        );

        const message =
          submitError.userMessage ||
          submitError.response
            ?.data?.message ||
          submitError.message ||
          "Failed to create post. Please try again.";

        setError(
          message
        );

        showToast({
          type: "error",
          title:
            "Post failed",
          message,
        });
      } finally {
        setPreparing(false);
        setPosting(false);
      }
    };

  const previewTransform =
    `translate(${position.x * 100}%, ${position.y * 100}%) scale(${zoom}) rotate(${normalizedRotation}deg)`;

  return (
    <>

      {modalOpen && (
        <div
          className={
            styles.modalBackdrop
          }
          role="presentation"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              requestCloseComposer();
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
                  requestCloseComposer
                }
                disabled={busy}
                aria-label="Close create post"
              >
                <X />
              </button>

              <div
                className={
                  styles.headerTitle
                }
              >
                <strong
                  id="create-post-title"
                >
                  Create post
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
                    ? "Posting"
                    : preparing
                      ? "Preparing"
                      : "Post"}
                </span>
              </button>
            </header>

            <div
              className={
                styles.modalBody
              }
            >
              <div
                className={
                  styles.editorSide
                }
              >
                {!imageSource ? (
                  <button
                    type="button"
                    className={`${styles.dropZone} ${dragActive
                      ? styles.dropZoneActive
                      : ""
                      }`}
                    onClick={() =>
                      fileInputRef.current
                        ?.click()
                    }
                    onDragOver={
                      handleDragOver
                    }
                    onDragLeave={
                      handleDragLeave
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
                          Preparing preview
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
                          Add a photo
                        </strong>

                        <span>
                          Drag and drop an
                          image here, or
                          choose from your
                          device
                        </span>

                        <small>
                          JPG, PNG or WebP
                          up to 10 MB
                        </small>
                      </>
                    )}
                  </button>
                ) : (
                  <div
                    className={
                      styles.editorCanvasShell
                    }
                  >
                    <div
                      ref={
                        editorFrameRef
                      }
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
                        stopDragging
                      }
                      onPointerCancel={
                        stopDragging
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

                      <div
                        className={
                          styles.moveHint
                        }
                      >
                        <Move />

                        Drag to reposition
                      </div>
                    </div>

                    <div
                      className={
                        styles.mediaActions
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          fileInputRef.current
                            ?.click()
                        }
                        disabled={busy}
                      >
                        <ImagePlus />

                        Change
                      </button>

                      <button
                        type="button"
                        className={
                          styles.removeMediaButton
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
                )}
              </div>

              <aside
                className={
                  styles.settingsSide
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
                    styles.captionSection
                  }
                >
                  <textarea
                    ref={
                      textareaRef
                    }
                    value={caption}
                    onChange={(
                      event
                    ) => {
                      setCaption(
                        event.target.value.slice(
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
                  />

                  <div
                    className={
                      styles.captionMeta
                    }
                  >
                    <span>
                      Share something
                      meaningful
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

                {imageSource && (
                  <>
                    <div
                      className={
                        styles.controlSection
                      }
                    >
                      <div
                        className={
                          styles.controlHeading
                        }
                      >
                        <strong>
                          Image layout
                        </strong>

                        <button
                          type="button"
                          onClick={
                            resetEditor
                          }
                          disabled={busy}
                        >
                          <Undo2 />

                          Reset
                        </button>
                      </div>

                      <div
                        className={
                          styles.layoutOptions
                        }
                      >
                        <button
                          type="button"
                          className={
                            fitMode ===
                              "fit"
                              ? styles.layoutActive
                              : ""
                          }
                          onClick={() => {
                            setFitMode(
                              "fit"
                            );

                            setZoom(1);

                            setPosition({
                              x: 0,
                              y: 0,
                            });
                          }}
                          disabled={busy}
                        >
                          <Minimize2 />

                          <span>
                            Fit
                          </span>

                          <small>
                            Show full photo
                          </small>
                        </button>

                        <button
                          type="button"
                          className={
                            fitMode ===
                              "fill"
                              ? styles.layoutActive
                              : ""
                          }
                          onClick={() => {
                            setFitMode(
                              "fill"
                            );

                            setZoom(1);

                            setPosition({
                              x: 0,
                              y: 0,
                            });
                          }}
                          disabled={busy}
                        >
                          <Maximize2 />

                          <span>
                            Fill
                          </span>

                          <small>
                            Fill post frame
                          </small>
                        </button>
                      </div>
                    </div>

                    <div
                      className={
                        styles.controlSection
                      }
                    >
                      <div
                        className={
                          styles.controlHeading
                        }
                      >
                        <strong>
                          Zoom
                        </strong>

                        <span>
                          {Math.round(
                            zoom * 100
                          )}
                          %
                        </span>
                      </div>

                      <div
                        className={
                          styles.zoomControl
                        }
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setZoom(
                              (
                                currentZoom
                              ) =>
                                clamp(
                                  currentZoom -
                                  ZOOM_STEP,
                                  MIN_ZOOM,
                                  MAX_ZOOM
                                )
                            )
                          }
                          disabled={
                            busy ||
                            zoom <=
                            MIN_ZOOM
                          }
                          aria-label="Zoom out"
                        >
                          <ZoomOut />
                        </button>

                        <input
                          type="range"
                          min={
                            MIN_ZOOM
                          }
                          max={
                            MAX_ZOOM
                          }
                          step={
                            ZOOM_STEP
                          }
                          value={zoom}
                          onChange={(
                            event
                          ) =>
                            setZoom(
                              Number(
                                event
                                  .target
                                  .value
                              )
                            )
                          }
                          disabled={busy}
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setZoom(
                              (
                                currentZoom
                              ) =>
                                clamp(
                                  currentZoom +
                                  ZOOM_STEP,
                                  MIN_ZOOM,
                                  MAX_ZOOM
                                )
                            )
                          }
                          disabled={
                            busy ||
                            zoom >=
                            MAX_ZOOM
                          }
                          aria-label="Zoom in"
                        >
                          <ZoomIn />
                        </button>
                      </div>
                    </div>

                    <div
                      className={
                        styles.controlSection
                      }
                    >
                      <div
                        className={
                          styles.controlHeading
                        }
                      >
                        <strong>
                          Rotation
                        </strong>

                        <span>
                          {
                            normalizedRotation
                          }
                          °
                        </span>
                      </div>

                      <div
                        className={
                          styles.rotationButtons
                        }
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setRotation(
                              (
                                current
                              ) =>
                                current -
                                90
                            );

                            setPosition({
                              x: 0,
                              y: 0,
                            });
                          }}
                          disabled={busy}
                        >
                          <RotateCcw />

                          Left
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRotation(
                              (
                                current
                              ) =>
                                current +
                                90
                            );

                            setPosition({
                              x: 0,
                              y: 0,
                            });
                          }}
                          disabled={busy}
                        >
                          <RotateCw />

                          Right
                        </button>
                      </div>
                    </div>
                  </>
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
                    styles.mobilePostButton
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
                    ? "Posting..."
                    : preparing
                      ? "Preparing..."
                      : "Share post"}
                </button>
              </aside>
            </div>

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
                    : "Preparing your image"}
                </strong>

                <span>
                  Please keep this window
                  open.
                </span>
              </div>
            )}
          </section>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={
          handleImageChange
        }
      />

      {discardDialogOpen && (
        <div
          className={
            styles.confirmBackdrop
          }
          role="presentation"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setDiscardDialogOpen(
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
              Your selected image and
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
                  setDiscardDialogOpen(
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
                  closeComposerImmediately
                }
              >
                Discard
              </button>
            </div>
          </section>
        </div>
      )}

      {toast && (
        <div
          key={toast.id}
          className={`${styles.toast} ${toast.type ===
            "success"
            ? styles.toastSuccess
            : styles.toastError
            }`}
          role={
            toast.type ===
              "error"
              ? "alert"
              : "status"
          }
        >
          {toast.type ===
            "success" ? (
            <CheckCircle2 />
          ) : (
            <CircleAlert />
          )}

          <div>
            <strong>
              {toast.title}
            </strong>

            <span>
              {toast.message}
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              setToast(null)
            }
            aria-label="Close notification"
          >
            <X />
          </button>
        </div>
      )}
    </>
  );
};

export default memo(
  CreatePost
);