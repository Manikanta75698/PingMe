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
  ImageIcon,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Move,
  RotateCw,
  RotateCcw,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import styles from "./StoryUploadPreview.module.css";

const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1920;

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

const getSafeFileName = (
  fileName
) =>
  String(
    fileName || "story"
  )
    .replace(/\.[^.]+$/, "")
    .replace(
      /[^a-zA-Z0-9_-]+/g,
      "-"
    )
    .replace(/^-+|-+$/g, "") ||
  "story";

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
            "Unable to load this image"
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
                "Unable to prepare story image"
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
        0.92
      );
    }
  );

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
      "#000";

    context.fillRect(
      0,
      0,
      OUTPUT_WIDTH,
      OUTPUT_HEIGHT
    );

    const offsetX =
      position.x *
      OUTPUT_WIDTH;

    const offsetY =
      position.y *
      OUTPUT_HEIGHT;

    context.save();

    context.translate(
      OUTPUT_WIDTH / 2 +
      offsetX,
      OUTPUT_HEIGHT / 2 +
      offsetY
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

const StoryUploadPreview = ({
  file,
  uploading = false,
  onCancel,
  onConfirm,
}) => {
  const frameRef =
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
    fitMode !== "fit" ||
    zoom !== 1 ||
    normalizedRotation !==
    0 ||
    position.x !== 0 ||
    position.y !== 0;

  useEffect(() => {
    let cancelled = false;

    setImageLoading(true);
    setError("");
    setImageSource("");

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
            readError.message ||
            "Unable to preview this image"
          );

          setImageLoading(
            false
          );
        }
      );

    return () => {
      cancelled = true;
    };
  }, [file]);

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

  const handleShare =
    useCallback(async () => {
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
        setError(
          prepareError?.message ||
          "Unable to prepare story"
        );
      } finally {
        setPreparing(false);
      }
    }, [
      busy,
      file,
      fitMode,
      imageSource,
      normalizedRotation,
      onConfirm,
      position,
      zoom,
    ]);

  useEffect(() => {
    const handleKeyDown =
      (event) => {
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
        }

        if (
          event.key ===
          "Enter" &&
          !event.shiftKey
        ) {
          event.preventDefault();

          void handleShare();
        }

        if (
          event.key === "+"
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
    handleShare,
    requestCancel,
    showCancelDialog,
  ]);

  const handlePointerDown =
    (event) => {
      if (
        busy ||
        !frameRef.current
      ) {
        return;
      }

      event.currentTarget.setPointerCapture(
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
        !frameRef.current
      ) {
        return;
      }

      const bounds =
        frameRef.current.getBoundingClientRect();

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
      const dragState =
        dragStateRef.current;

      if (
        dragState.pointerId ===
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

  const previewTransform =
    `translate(${position.x * 100}%, ${position.y * 100}%) scale(${zoom}) rotate(${normalizedRotation}deg)`;

  return (
    <div
      className={
        styles.page
      }
      role="dialog"
      aria-modal="true"
      aria-label="Create story"
    >
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
            Preview and adjust
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
          disabled={busy}
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
        </button>
      </header>

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
                stopDragging
              }
              onPointerCancel={
                stopDragging
              }
              aria-label="Drag image to reposition"
            >
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

                  <span>
                    Preparing preview
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
                        "Unable to display this image"
                      );
                    }}
                  />

                  <div
                    className={
                      styles.dragHint
                    }
                  >
                    <Move />

                    <span>
                      Drag to reposition
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <aside
          className={
            styles.editorPanel
          }
        >
          <div
            className={
              styles.panelHeader
            }
          >
            <div>
              <strong>
                Adjust story
              </strong>

              <span>
                Make it look exactly how you want
              </span>
            </div>

            <button
              type="button"
              className={
                styles.resetButton
              }
              onClick={
                resetEditor
              }
              disabled={
                busy ||
                !hasChanges
              }
            >
              <Undo2 />

              Reset
            </button>
          </div>

          <div
            className={
              styles.controlGroup
            }
          >
            <label>
              Image layout
            </label>

            <div
              className={
                styles.segmentedControl
              }
            >
              <button
                type="button"
                className={
                  fitMode === "fit"
                    ? styles.segmentActive
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
                  Show full image
                </small>
              </button>

              <button
                type="button"
                className={
                  fitMode ===
                    "fill"
                    ? styles.segmentActive
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
                  Fill entire story
                </small>
              </button>
            </div>
          </div>

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
              <label>
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
                aria-label="Story zoom"
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
              styles.controlGroup
            }
          >
            <div
              className={
                styles.controlLabelRow
              }
            >
              <label>
                Rotation
              </label>

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
                      currentRotation
                    ) =>
                      currentRotation -
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

                Rotate left
              </button>

              <button
                type="button"
                onClick={() => {
                  setRotation(
                    (
                      currentRotation
                    ) =>
                      currentRotation +
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

                Rotate right
              </button>
            </div>
          </div>

          {error &&
            imageSource && (
              <div
                className={
                  styles.errorMessage
                }
                role="alert"
              >
                {error}
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
              busy ||
              !imageSource
            }
          >
            {busy && (
              <LoaderCircle
                className={
                  styles.spinning
                }
              />
            )}

            {uploading
              ? "Uploading story..."
              : preparing
                ? "Preparing story..."
                : "Share story"}
          </button>

          <p
            className={
              styles.helperText
            }
          >
            Stories are visible for
            24 hours.
          </p>
        </aside>
      </main>

      {showCancelDialog && (
        <div
          className={
            styles.confirmBackdrop
          }
          role="presentation"
          onClick={() =>
            setShowCancelDialog(
              false
            )
          }
        >
          <div
            className={
              styles.confirmDialog
            }
            role="alertdialog"
            aria-modal="true"
            aria-label="Discard story changes"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div
              className={
                styles.confirmIcon
              }
            >
              <Undo2 />
            </div>

            <strong>
              Discard this story?
            </strong>

            <p>
              Your edits will be
              lost.
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
    </div>
  );
};

export default memo(
  StoryUploadPreview
);