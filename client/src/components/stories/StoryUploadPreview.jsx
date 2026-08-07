import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Check,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  ImageIcon,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Move,
  RotateCw,
  SlidersHorizontal,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import {
  createPortal,
} from "react-dom";

import styles from "./StoryUploadPreview.module.css";

/* =========================
   STORY OUTPUT
========================= */

const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1920;

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.05;

const DOUBLE_TAP_DELAY = 300;
const DOUBLE_TAP_DISTANCE = 36;
const GESTURE_HINT_DURATION = 4200;

/* =========================
   HELPERS
========================= */

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

const getSafeFileName = (
  fileName
) =>
  String(
    fileName || "story"
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
    ) || "story";

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
              "Unable to read this photo."
            )
          );

          return;
        }

        resolve(result);
      };

      reader.onerror = () => {
        reject(
          new Error(
            "Unable to read this photo."
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
            "Unable to load this photo."
          )
        );
      };

      image.src = source;
    }
  );

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
                "Unable to prepare story photo."
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
        0.92
      );
    }
  );

const getPointerDistance = (
  pointers
) => {
  const pointerValues = [
    ...pointers.values(),
  ];

  if (
    pointerValues.length < 2
  ) {
    return 0;
  }

  const first =
    pointerValues[0];

  const second =
    pointerValues[1];

  return Math.hypot(
    second.x - first.x,
    second.y - first.y
  );
};

/* =========================
   FINAL STORY IMAGE
========================= */

const createStoryFile =
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
        "Story editor is unavailable."
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

/* =========================
   COMPONENT
========================= */

const StoryUploadPreview = ({
  file,
  uploading = false,
  onCancel,
  onConfirm,
}) => {
  const frameRef =
    useRef(null);

  /*
   * Pointer and gesture information
   * state kaakunda ref lo untundi.
   * Gesture move సమయంలో unnecessary
   * component rerenders avoid chesthundi.
   */
  const gestureRef =
    useRef({
      pointers: new Map(),

      dragging: false,

      pointerId: null,

      startX: 0,
      startY: 0,

      initialX: 0,
      initialY: 0,

      pinchDistance: 0,
      pinchZoom: 1,

      lastTapTime: 0,
      lastTapX: 0,
      lastTapY: 0,
    });

  const [
    imageSource,
    setImageSource,
  ] = useState("");

  const [
    imageLoading,
    setImageLoading,
  ] = useState(true);

  const [
    preparing,
    setPreparing,
  ] = useState(false);

  const [
    fitMode,
    setFitMode,
  ] = useState("fill");

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
    controlsOpen,
    setControlsOpen,
  ] = useState(false);

  const [
    gestureHintVisible,
    setGestureHintVisible,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    showCancelDialog,
    setShowCancelDialog,
  ] = useState(false);

  const busy =
    uploading ||
    preparing ||
    imageLoading;

  const normalizedRotation =
    useMemo(
      () =>
        normalizeRotation(
          rotation
        ),
      [rotation]
    );

  const hasChanges =
    fitMode !== "fill" ||
    zoom !== 1 ||
    normalizedRotation !== 0 ||
    position.x !== 0 ||
    position.y !== 0;

  const canShare =
    Boolean(
      imageSource &&
      !busy &&
      !error
    );

  /* =========================
     RESET
  ========================= */

  const resetEditor =
    useCallback(() => {
      setFitMode("fill");
      setZoom(1);
      setRotation(0);

      setPosition({
        x: 0,
        y: 0,
      });

      setError("");
    }, []);

  /* =========================
     LOAD SELECTED FILE
  ========================= */

  useEffect(() => {
    let cancelled = false;

    setImageLoading(true);
    setImageSource("");
    setError("");

    resetEditor();

    readFileAsDataUrl(file)
      .then((source) => {
        if (cancelled) {
          return;
        }

        setImageSource(
          source
        );

        setImageLoading(
          false
        );
      })
      .catch(
        (readError) => {
          if (cancelled) {
            return;
          }

          setError(
            readError?.message ||
            "Unable to preview this photo."
          );

          setImageLoading(
            false
          );
        }
      );

    return () => {
      cancelled = true;
    };
  }, [
    file,
    resetEditor,
  ]);

  /* =========================
     BODY SCROLL LOCK
  ========================= */

  useEffect(() => {
    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style
      .overflow = "hidden";

    return () => {
      document.body.style
        .overflow =
        previousOverflow;
    };
  }, []);

  /* =========================
     AUTO HIDE GESTURE GUIDE
  ========================= */

  useEffect(() => {
    if (!imageSource) {
      return undefined;
    }

    setGestureHintVisible(
      true
    );

    const timer =
      window.setTimeout(
        () => {
          setGestureHintVisible(
            false
          );
        },
        GESTURE_HINT_DURATION
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [imageSource]);

  /* =========================
     CANCEL
  ========================= */

  const requestCancel =
    useCallback(() => {
      if (busy) {
        return;
      }

      if (hasChanges) {
        setShowCancelDialog(
          true
        );

        return;
      }

      onCancel();
    }, [
      busy,
      hasChanges,
      onCancel,
    ]);

  const confirmCancel =
    useCallback(() => {
      setShowCancelDialog(
        false
      );

      onCancel();
    }, [onCancel]);

  /* =========================
     SHARE STORY
  ========================= */

  const handleShare =
    useCallback(
      async () => {
        if (
          busy ||
          !imageSource
        ) {
          return;
        }

        try {
          setPreparing(true);
          setError("");

          const preparedFile =
            await createStoryFile({
              file,

              imageSource,

              fitMode,

              zoom,

              rotation:
                normalizedRotation,

              position,
            });

          await onConfirm(
            preparedFile
          );
        } catch (
        prepareError
        ) {
          console.error(
            "STORY PREPARE ERROR:",
            prepareError
          );

          setError(
            prepareError
              ?.message ||
            "Unable to prepare story."
          );
        } finally {
          setPreparing(false);
        }
      },
      [
        busy,
        file,
        fitMode,
        imageSource,
        normalizedRotation,
        onConfirm,
        position,
        zoom,
      ]
    );

  /* =========================
     KEYBOARD SUPPORT
  ========================= */

  useEffect(() => {
    const handleKeyDown = (
      event
    ) => {
      if (
        showCancelDialog
      ) {
        if (
          event.key ===
          "Escape"
        ) {
          setShowCancelDialog(
            false
          );
        }

        return;
      }

      if (
        event.key ===
        "Escape"
      ) {
        requestCancel();
        return;
      }

      if (
        event.key ===
        "Enter" &&
        (
          event.ctrlKey ||
          event.metaKey
        )
      ) {
        event.preventDefault();

        if (canShare) {
          void handleShare();
        }

        return;
      }

      if (
        event.key === "+" ||
        event.key === "="
      ) {
        setZoom(
          (currentZoom) =>
            clamp(
              currentZoom +
              ZOOM_STEP,
              MIN_ZOOM,
              MAX_ZOOM
            )
        );

        return;
      }

      if (
        event.key === "-"
      ) {
        setZoom(
          (currentZoom) =>
            clamp(
              currentZoom -
              ZOOM_STEP,
              MIN_ZOOM,
              MAX_ZOOM
            )
        );

        return;
      }

      if (
        event.key.toLowerCase() ===
        "r"
      ) {
        setRotation(
          (currentRotation) =>
            currentRotation + 90
        );

        setPosition({
          x: 0,
          y: 0,
        });

        setZoom(1);
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    canShare,
    handleShare,
    requestCancel,
    showCancelDialog,
  ]);

  /* =========================
     POINTER DOWN
  ========================= */

  const handlePointerDown = (
    event
  ) => {
    if (
      busy ||
      !imageSource ||
      !frameRef.current
    ) {
      return;
    }

    setGestureHintVisible(
      false
    );

    const now =
      Date.now();

    const tapDistance =
      Math.hypot(
        event.clientX -
        gestureRef.current
          .lastTapX,

        event.clientY -
        gestureRef.current
          .lastTapY
      );

    const doubleTap =
      now -
      gestureRef.current
        .lastTapTime <
      DOUBLE_TAP_DELAY &&
      tapDistance <
      DOUBLE_TAP_DISTANCE;

    gestureRef.current
      .lastTapTime = now;

    gestureRef.current
      .lastTapX =
      event.clientX;

    gestureRef.current
      .lastTapY =
      event.clientY;

    if (
      doubleTap &&
      (
        event.pointerType ===
        "touch" ||
        event.pointerType ===
        "pen"
      )
    ) {
      resetEditor();

      return;
    }

    event.currentTarget
      .setPointerCapture(
        event.pointerId
      );

    gestureRef.current
      .pointers.set(
        event.pointerId,
        {
          x:
            event.clientX,

          y:
            event.clientY,
        }
      );

    const pointerCount =
      gestureRef.current
        .pointers.size;

    if (pointerCount === 1) {
      gestureRef.current
        .dragging = true;

      gestureRef.current
        .pointerId =
        event.pointerId;

      gestureRef.current
        .startX =
        event.clientX;

      gestureRef.current
        .startY =
        event.clientY;

      gestureRef.current
        .initialX =
        position.x;

      gestureRef.current
        .initialY =
        position.y;
    }

    if (pointerCount === 2) {
      gestureRef.current
        .dragging = false;

      gestureRef.current
        .pinchDistance =
        getPointerDistance(
          gestureRef.current
            .pointers
        );

      gestureRef.current
        .pinchZoom =
        zoom;
    }
  };

  /* =========================
     POINTER MOVE
  ========================= */

  const handlePointerMove = (
    event
  ) => {
    if (
      !frameRef.current ||
      !gestureRef.current
        .pointers.has(
          event.pointerId
        )
    ) {
      return;
    }

    gestureRef.current
      .pointers.set(
        event.pointerId,
        {
          x:
            event.clientX,

          y:
            event.clientY,
        }
      );

    const pointerCount =
      gestureRef.current
        .pointers.size;

    /*
     * Two-finger pinch zoom.
     */
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

    /*
     * One-finger drag.
     */
    if (
      pointerCount === 1 &&
      gestureRef.current
        .dragging &&
      gestureRef.current
        .pointerId ===
      event.pointerId
    ) {
      const bounds =
        frameRef.current
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

  /* =========================
     POINTER END
  ========================= */

  const handlePointerEnd = (
    event
  ) => {
    gestureRef.current
      .pointers.delete(
        event.pointerId
      );

    const pointerCount =
      gestureRef.current
        .pointers.size;

    if (pointerCount === 0) {
      gestureRef.current
        .dragging = false;

      gestureRef.current
        .pointerId = null;

      gestureRef.current
        .pinchDistance = 0;

      return;
    }

    /*
     * Pinch tarvatha one finger
     * remaining unte drag smoothly
     * continue avvali.
     */
    if (pointerCount === 1) {
      const [
        remainingPointerId,
        remainingPointer,
      ] = [
        ...gestureRef.current
          .pointers.entries(),
      ][0];

      gestureRef.current
        .dragging = true;

      gestureRef.current
        .pointerId =
        remainingPointerId;

      gestureRef.current
        .startX =
        remainingPointer.x;

      gestureRef.current
        .startY =
        remainingPointer.y;

      gestureRef.current
        .initialX =
        position.x;

      gestureRef.current
        .initialY =
        position.y;
    }
  };

  /* =========================
     QUICK ACTIONS
  ========================= */

  const toggleFitMode = () => {
    if (busy) {
      return;
    }

    setFitMode(
      (currentMode) =>
        currentMode === "fill"
          ? "fit"
          : "fill"
    );

    setZoom(1);

    setPosition({
      x: 0,
      y: 0,
    });
  };

  const rotateStory = () => {
    if (busy) {
      return;
    }

    setRotation(
      (currentRotation) =>
        currentRotation + 90
    );

    setZoom(1);

    setPosition({
      x: 0,
      y: 0,
    });
  };

  const previewTransform =
    `translate(${position.x * 100
    }%, ${position.y * 100
    }%) scale(${zoom}) rotate(${normalizedRotation
    }deg)`;

  if (
    typeof document === "undefined"
  ) {
    return null;
  }

  return createPortal(
    <div
      className={
        styles.page
      }
      role="dialog"
      aria-modal="true"
      aria-label="Create story"
    >
      {/* =====================
          PREMIUM TOP BAR
      ====================== */}

      <header
        className={
          styles.topBar
        }
      >
        <button
          type="button"
          className={
            styles.iconButton
          }
          onClick={
            requestCancel
          }
          disabled={busy}
          aria-label="Close story editor"
        >
          <X />
        </button>

        <div
          className={
            styles.heading
          }
        >
          <strong>
            New story
          </strong>

          <span>
            Preview your story
          </span>
        </div>

        <button
          type="button"
          className={
            styles.topShareButton
          }
          onClick={() =>
            void handleShare()
          }
          disabled={
            !canShare
          }
          aria-label="Share story"
        >
          {busy ? (
            <LoaderCircle
              className={
                styles.spinning
              }
            />
          ) : (
            <Check />
          )}

          <span>
            Share
          </span>
        </button>
      </header>

      {/* =====================
          MAIN STAGE
      ====================== */}

      <main
        className={
          styles.workspace
        }
      >
        <section
          className={
            styles.canvasSection
          }
        >
          <div
            className={
              styles.canvasShell
            }
          >
            <div
              ref={frameRef}
              className={
                styles.storyCanvas
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
              aria-label="Drag or pinch photo to adjust"
            >
              {/* Story safe area guides */}

              <div
                className={
                  styles.safeAreaTop
                }
                aria-hidden="true"
              />

              <div
                className={
                  styles.safeAreaBottom
                }
                aria-hidden="true"
              />

              {imageLoading && (
                <div
                  className={
                    styles.canvasState
                  }
                >
                  <LoaderCircle
                    className={
                      styles.spinning
                    }
                  />

                  <strong>
                    Preparing preview
                  </strong>

                  <span>
                    Getting your story
                    ready
                  </span>
                </div>
              )}

              {!imageLoading &&
                error &&
                !imageSource && (
                  <div
                    className={
                      styles.canvasState
                    }
                  >
                    <ImageIcon />

                    <strong>
                      Preview unavailable
                    </strong>

                    <span>
                      {error}
                    </span>
                  </div>
                )}

              {imageSource && (
                <>
                  <img
                    src={
                      imageSource
                    }
                    alt="Story preview"
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
                    onError={() => {
                      setError(
                        "Unable to display this photo."
                      );
                    }}
                  />

                  {gestureHintVisible && (
                    <div
                      className={
                        styles.gestureHint
                      }
                    >
                      <Move />

                      <div>
                        <strong>
                          Adjust photo
                        </strong>

                        <span>
                          Drag to move •
                          Pinch to zoom
                        </span>
                      </div>
                    </div>
                  )}

                  <div
                    className={
                      styles.zoomBadge
                    }
                  >
                    {Math.round(
                      zoom * 100
                    )}
                    %
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* =====================
            FLOATING EDITOR
        ====================== */}

        <aside
          className={`${styles.editorPanel} ${controlsOpen
            ? styles.editorPanelOpen
            : ""
            }`}
        >
          <div
            className={
              styles.quickActions
            }
          >
            <button
              type="button"
              className={
                fitMode === "fill"
                  ? styles.quickActionActive
                  : ""
              }
              onClick={
                toggleFitMode
              }
              disabled={busy}
            >
              {fitMode === "fill" ? (
                <Minimize2 />
              ) : (
                <Maximize2 />
              )}

              <span>
                {fitMode === "fill"
                  ? "Show full"
                  : "Fill screen"}
              </span>
            </button>

            <button
              type="button"
              onClick={
                rotateStory
              }
              disabled={busy}
            >
              <RotateCw />

              <span>
                Rotate
              </span>
            </button>

            <button
              type="button"
              onClick={
                resetEditor
              }
              disabled={
                busy ||
                !hasChanges
              }
            >
              <Undo2 />

              <span>
                Reset
              </span>
            </button>

            <button
              type="button"
              className={
                controlsOpen
                  ? styles.quickActionActive
                  : ""
              }
              onClick={() =>
                setControlsOpen(
                  (current) =>
                    !current
                )
              }
              disabled={busy}
            >
              <SlidersHorizontal />

              <span>
                Adjust
              </span>
            </button>
          </div>

          <div
            className={
              styles.advancedHeader
            }
          >
            <div>
              <strong>
                Fine tune
              </strong>

              <span>
                Optional photo controls
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setControlsOpen(
                  (current) =>
                    !current
                )
              }
              aria-label={
                controlsOpen
                  ? "Hide controls"
                  : "Show controls"
              }
            >
              {controlsOpen ? (
                <ChevronDown />
              ) : (
                <ChevronUp />
              )}
            </button>
          </div>

          {controlsOpen && (
            <div
              className={
                styles.advancedControls
              }
            >
              <div
                className={
                  styles.controlGroup
                }
              >
                <div
                  className={
                    styles.controlLabelRow
                  }
                >
                  <label
                    htmlFor="story-zoom"
                  >
                    Zoom
                  </label>

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
                    id="story-zoom"
                    type="range"
                    min={MIN_ZOOM}
                    max={MAX_ZOOM}
                    step={ZOOM_STEP}
                    value={zoom}
                    onChange={(
                      event
                    ) =>
                      setZoom(
                        Number(
                          event.target
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
                  styles.layoutButtons
                }
              >
                <button
                  type="button"
                  className={
                    fitMode === "fill"
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

                  <div>
                    <strong>
                      Fill
                    </strong>

                    <span>
                      Full-screen story
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  className={
                    fitMode === "fit"
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

                  <div>
                    <strong>
                      Fit
                    </strong>

                    <span>
                      Show complete photo
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {error &&
            imageSource && (
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
              styles.shareButton
            }
            onClick={() =>
              void handleShare()
            }
            disabled={
              !canShare
            }
          >
            {busy ? (
              <LoaderCircle
                className={
                  styles.spinning
                }
              />
            ) : (
              <Check />
            )}

            <span>
              {uploading
                ? "Uploading story..."
                : preparing
                  ? "Preparing story..."
                  : "Share story"}
            </span>
          </button>

          <p
            className={
              styles.helperText
            }
          >
            Your story will be
            visible for 24 hours
          </p>
        </aside>
      </main>

      {/* =====================
          PROCESSING OVERLAY
      ====================== */}

      {busy &&
        !imageLoading && (
          <div
            className={
              styles.processingOverlay
            }
            role="status"
          >
            <div
              className={
                styles.processingCard
              }
            >
              <LoaderCircle
                className={
                  styles.spinning
                }
              />

              <strong>
                {uploading
                  ? "Sharing your story"
                  : "Preparing your story"}
              </strong>

              <span>
                Please keep this
                screen open
              </span>

              <div
                className={
                  styles.progressTrack
                }
              >
                <span />
              </div>
            </div>
          </div>
        )}

      {/* =====================
          DISCARD DIALOG
      ====================== */}

      {showCancelDialog && (
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
              setShowCancelDialog(
                false
              );
            }
          }}
        >
          <div
            className={
              styles.confirmDialog
            }
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="discard-story-title"
          >
            <div
              className={
                styles.confirmIcon
              }
            >
              <Undo2 />
            </div>

            <strong
              id="discard-story-title"
            >
              Discard story changes?
            </strong>

            <p>
              Your photo adjustments
              will be lost.
            </p>

            <div
              className={
                styles.confirmActions
              }
            >
              <button
                type="button"
                onClick={() =>
                  setShowCancelDialog(
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
                  confirmCancel
                }
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default memo(
  StoryUploadPreview
);