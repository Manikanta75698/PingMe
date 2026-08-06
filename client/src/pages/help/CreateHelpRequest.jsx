import {
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock3,
  Droplets,
  HandHeart,
  HeartPulse,
  LoaderCircle,
  MapPin,
  Phone,
  Send,
  ShieldAlert,
  Users,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import Header from "../../components/home/Header";

import {
  createHelpRequest,
} from "../../services/helpRequestService";

import styles from "./CreateHelpRequest.module.css";

/* =========================
   CONSTANTS
========================= */

const CATEGORIES = [
  {
    value: "emergency",
    label: "Emergency",
    description:
      "Urgent community assistance",
    icon: AlertCircle,
  },
  {
    value: "blood",
    label: "Blood",
    description:
      "Blood donor requirements",
    icon: Droplets,
  },
  {
    value: "medical",
    label: "Medical",
    description:
      "Medicine or medical support",
    icon: HeartPulse,
  },
  {
    value: "education",
    label: "Education",
    description:
      "Books, notes or learning help",
    icon: BookOpen,
  },
  {
    value: "volunteer",
    label: "Volunteer",
    description:
      "Community volunteer support",
    icon: Users,
  },
  {
    value: "transport",
    label: "Transport",
    description:
      "Travel or transport assistance",
    icon: MapPin,
  },
  {
    value: "food",
    label: "Food",
    description:
      "Food or essential supplies",
    icon: HandHeart,
  },
  {
    value: "lost-found",
    label: "Lost & Found",
    description:
      "Report lost or found items",
    icon: ShieldAlert,
  },
  {
    value: "event",
    label: "Event",
    description:
      "Local event assistance",
    icon: Users,
  },
  {
    value: "other",
    label: "Other",
    description:
      "Any other genuine request",
    icon: HandHeart,
  },
];

const URGENCY_OPTIONS = [
  {
    value: "low",
    label: "Low",
    description:
      "No immediate deadline",
  },
  {
    value: "medium",
    label: "Medium",
    description:
      "Help needed soon",
  },
  {
    value: "high",
    label: "High",
    description:
      "Important and time-sensitive",
  },
  {
    value: "critical",
    label: "Critical",
    description:
      "Immediate attention required",
  },
];

const EXPIRY_OPTIONS = [
  {
    value: 1,
    label: "1 day",
  },
  {
    value: 3,
    label: "3 days",
  },
  {
    value: 7,
    label: "7 days",
  },
  {
    value: 14,
    label: "14 days",
  },
  {
    value: 30,
    label: "30 days",
  },
];

const INITIAL_FORM = {
  title: "",
  description: "",
  category: "other",
  urgency: "medium",
  city: "",
  area: "",
  latitude: null,
  longitude: null,
  contactPreference: "chat",
  contactPhone: "",
  expiresInDays: 7,
  image: "",
};

/* =========================
   HELPERS
========================= */

const validateForm = (
  formData
) => {
  const errors = {};

  const title =
    formData.title.trim();

  const description =
    formData.description.trim();

  const city =
    formData.city.trim();

  const phone =
    formData.contactPhone.trim();

  if (title.length < 3) {
    errors.title =
      "Title must contain at least 3 characters";
  }

  if (title.length > 100) {
    errors.title =
      "Title cannot exceed 100 characters";
  }

  if (description.length < 5) {
    errors.description =
      "Description must contain at least 5 characters";
  }

  if (
    description.length > 1000
  ) {
    errors.description =
      "Description cannot exceed 1000 characters";
  }

  if (!city) {
    errors.city =
      "Please enter your city";
  }

  if (
    ["phone", "both"].includes(
      formData.contactPreference
    ) &&
    !phone
  ) {
    errors.contactPhone =
      "Phone number is required";
  }

  if (
    phone &&
    phone.length < 7
  ) {
    errors.contactPhone =
      "Enter a valid phone number";
  }

  return errors;
};

/* =========================
   COMPONENT
========================= */

const CreateHelpRequest = () => {
  const navigate =
    useNavigate();

  const [
    formData,
    setFormData,
  ] = useState(INITIAL_FORM);

  const [
    fieldErrors,
    setFieldErrors,
  ] = useState({});

  const [
    submitError,
    setSubmitError,
  ] = useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    locating,
    setLocating,
  ] = useState(false);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const descriptionLength =
    formData.description.length;

  const titleLength =
    formData.title.length;

  const selectedCategory =
    useMemo(
      () =>
        CATEGORIES.find(
          (category) =>
            category.value ===
            formData.category
        ),
      [formData.category]
    );

  const updateField = (
    field,
    value
  ) => {
    setFormData(
      (currentForm) => ({
        ...currentForm,
        [field]: value,
      })
    );

    setFieldErrors(
      (currentErrors) => {
        if (
          !currentErrors[field]
        ) {
          return currentErrors;
        }

        const updatedErrors = {
          ...currentErrors,
        };

        delete updatedErrors[
          field
        ];

        return updatedErrors;
      }
    );

    setSubmitError("");
  };

  const handleBack = () => {
    navigate("/help");
  };

  const handleUseLocation =
    () => {
      if (
        !navigator.geolocation
      ) {
        setSubmitError(
          "Location access is not supported on this device"
        );

        return;
      }

      setLocating(true);
      setSubmitError("");

      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateField(
            "latitude",
            position.coords
              .latitude
          );

          updateField(
            "longitude",
            position.coords
              .longitude
          );

          setLocating(false);
        },
        (error) => {
          console.error(
            "Location error:",
            error
          );

          setSubmitError(
            "Unable to access your location. You can enter city and area manually."
          );

          setLocating(false);
        },
        {
          enableHighAccuracy:
            true,
          timeout: 10000,
          maximumAge: 300000,
        }
      );
    };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const validationErrors =
      validateForm(formData);

    if (
      Object.keys(
        validationErrors
      ).length > 0
    ) {
      setFieldErrors(
        validationErrors
      );

      setSubmitError(
        "Please check the highlighted fields"
      );

      return;
    }

    try {
      setSubmitting(true);
      setSubmitError("");
      setSuccessMessage("");

      const response =
        await createHelpRequest(
          formData
        );

      const requestId =
        response?.helpRequest?._id;

      setSuccessMessage(
        response?.message ||
        "Help request created successfully"
      );

      if (requestId) {
        navigate(
          `/help/${requestId}`,
          {
            replace: true,
          }
        );

        return;
      }

      navigate(
        "/help",
        {
          replace: true,
        }
      );
    } catch (error) {
      setSubmitError(
        error?.message ||
        "Unable to create help request"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={
        styles.page
      }
    >
      <div className={styles.desktopHeader}>
        <Header />
      </div>

      <main
        className={
          styles.pageContent
        }
      >
        <header
          className={
            styles.pageHeader
          }
        >
          <button
            type="button"
            className={
              styles.backButton
            }
            onClick={
              handleBack
            }
            aria-label="Go back"
          >
            <ArrowLeft
              size={21}
            />
          </button>

          <div>
            <span
              className={
                styles.eyebrow
              }
            >
              Community support
            </span>

            <h1>
              Create a help
              request
            </h1>

            <p>
              Share clear and
              genuine details so
              nearby community
              members can support
              you.
            </p>
          </div>
        </header>

        <form
          className={
            styles.form
          }
          onSubmit={
            handleSubmit
          }
          noValidate
        >
          {submitError && (
            <div
              className={
                styles.errorBanner
              }
              role="alert"
            >
              <AlertCircle
                size={19}
              />

              <span>
                {submitError}
              </span>
            </div>
          )}

          {successMessage && (
            <div
              className={
                styles.successBanner
              }
            >
              <CheckCircle2
                size={19}
              />

              <span>
                {successMessage}
              </span>
            </div>
          )}

          <section
            className={
              styles.formSection
            }
          >
            <div
              className={
                styles.sectionHeader
              }
            >
              <span
                className={
                  styles.sectionNumber
                }
              >
                1
              </span>

              <div>
                <h2>
                  Request details
                </h2>

                <p>
                  Explain what help
                  you need.
                </p>
              </div>
            </div>

            <div
              className={
                styles.fieldGroup
              }
            >
              <div
                className={
                  styles.labelRow
                }
              >
                <label
                  htmlFor="help-title"
                >
                  Request title
                </label>

                <span>
                  {titleLength}/100
                </span>
              </div>

              <input
                id="help-title"
                type="text"
                value={
                  formData.title
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "title",
                    event.target
                      .value
                  )
                }
                placeholder="Example: Need O+ blood donor urgently"
                maxLength={100}
                className={
                  fieldErrors.title
                    ? styles.inputError
                    : ""
                }
              />

              {fieldErrors.title && (
                <span
                  className={
                    styles.fieldError
                  }
                >
                  {
                    fieldErrors.title
                  }
                </span>
              )}
            </div>

            <div
              className={
                styles.fieldGroup
              }
            >
              <div
                className={
                  styles.labelRow
                }
              >
                <label
                  htmlFor="help-description"
                >
                  Description
                </label>

                <span>
                  {
                    descriptionLength
                  }
                  /1000
                </span>
              </div>

              <textarea
                id="help-description"
                value={
                  formData.description
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "description",
                    event.target
                      .value
                  )
                }
                placeholder="Add useful details, timing, requirements and how someone can help."
                rows={6}
                maxLength={1000}
                className={
                  fieldErrors.description
                    ? styles.inputError
                    : ""
                }
              />

              {fieldErrors.description && (
                <span
                  className={
                    styles.fieldError
                  }
                >
                  {
                    fieldErrors.description
                  }
                </span>
              )}
            </div>
          </section>

          <section
            className={
              styles.formSection
            }
          >
            <div
              className={
                styles.sectionHeader
              }
            >
              <span
                className={
                  styles.sectionNumber
                }
              >
                2
              </span>

              <div>
                <h2>
                  Category
                </h2>

                <p>
                  Choose the most
                  relevant request
                  type.
                </p>
              </div>
            </div>

            <div
              className={
                styles.categoryGrid
              }
            >
              {CATEGORIES.map(
                (category) => {
                  const Icon =
                    category.icon;

                  const isSelected =
                    formData.category ===
                    category.value;

                  return (
                    <button
                      key={
                        category.value
                      }
                      type="button"
                      className={`${styles.categoryCard} ${isSelected
                        ? styles.categoryCardSelected
                        : ""
                        }`}
                      onClick={() =>
                        updateField(
                          "category",
                          category.value
                        )
                      }
                    >
                      <span
                        className={
                          styles.categoryIcon
                        }
                      >
                        <Icon
                          size={20}
                        />
                      </span>

                      <span
                        className={
                          styles.categoryText
                        }
                      >
                        <strong>
                          {
                            category.label
                          }
                        </strong>

                        <small>
                          {
                            category.description
                          }
                        </small>
                      </span>

                      {isSelected && (
                        <CheckCircle2
                          size={18}
                          className={
                            styles.selectedIcon
                          }
                        />
                      )}
                    </button>
                  );
                }
              )}
            </div>

            {selectedCategory && (
              <div
                className={
                  styles.selectedCategoryNote
                }
              >
                <CheckCircle2
                  size={17}
                />

                <span>
                  {
                    selectedCategory.label
                  }{" "}
                  category selected
                </span>
              </div>
            )}
          </section>

          <section
            className={
              styles.formSection
            }
          >
            <div
              className={
                styles.sectionHeader
              }
            >
              <span
                className={
                  styles.sectionNumber
                }
              >
                3
              </span>

              <div>
                <h2>
                  Urgency
                </h2>

                <p>
                  Select how quickly
                  help is required.
                </p>
              </div>
            </div>

            <div
              className={
                styles.urgencyGrid
              }
            >
              {URGENCY_OPTIONS.map(
                (urgency) => {
                  const isSelected =
                    formData.urgency ===
                    urgency.value;

                  return (
                    <button
                      key={
                        urgency.value
                      }
                      type="button"
                      className={`${styles.urgencyCard} ${styles[
                        `urgency${urgency.value
                          .charAt(0)
                          .toUpperCase()}${urgency.value.slice(
                            1
                          )}`
                      ]
                        } ${isSelected
                          ? styles.urgencySelected
                          : ""
                        }`}
                      onClick={() =>
                        updateField(
                          "urgency",
                          urgency.value
                        )
                      }
                    >
                      <strong>
                        {
                          urgency.label
                        }
                      </strong>

                      <span>
                        {
                          urgency.description
                        }
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </section>

          <section
            className={
              styles.formSection
            }
          >
            <div
              className={
                styles.sectionHeader
              }
            >
              <span
                className={
                  styles.sectionNumber
                }
              >
                4
              </span>

              <div>
                <h2>
                  Location
                </h2>

                <p>
                  Help nearby members
                  understand where
                  support is needed.
                </p>
              </div>
            </div>

            <div
              className={
                styles.twoColumnGrid
              }
            >
              <div
                className={
                  styles.fieldGroup
                }
              >
                <label
                  htmlFor="help-city"
                >
                  City
                </label>

                <input
                  id="help-city"
                  type="text"
                  value={
                    formData.city
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "city",
                      event.target
                        .value
                    )
                  }
                  placeholder="Example: Hyderabad"
                  maxLength={100}
                  className={
                    fieldErrors.city
                      ? styles.inputError
                      : ""
                  }
                />

                {fieldErrors.city && (
                  <span
                    className={
                      styles.fieldError
                    }
                  >
                    {
                      fieldErrors.city
                    }
                  </span>
                )}
              </div>

              <div
                className={
                  styles.fieldGroup
                }
              >
                <label
                  htmlFor="help-area"
                >
                  Area
                </label>

                <input
                  id="help-area"
                  type="text"
                  value={
                    formData.area
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "area",
                      event.target
                        .value
                    )
                  }
                  placeholder="Example: Kukatpally"
                  maxLength={150}
                />
              </div>
            </div>

            <button
              type="button"
              className={
                styles.locationButton
              }
              onClick={
                handleUseLocation
              }
              disabled={
                locating
              }
            >
              {locating ? (
                <LoaderCircle
                  size={18}
                  className={
                    styles.spinning
                  }
                />
              ) : (
                <MapPin
                  size={18}
                />
              )}

              <span>
                {locating
                  ? "Getting location..."
                  : formData.latitude &&
                    formData.longitude
                    ? "Location added"
                    : "Use current location"}
              </span>

              {formData.latitude &&
                formData.longitude && (
                  <CheckCircle2
                    size={17}
                  />
                )}
            </button>
          </section>

          <section
            className={
              styles.formSection
            }
          >
            <div
              className={
                styles.sectionHeader
              }
            >
              <span
                className={
                  styles.sectionNumber
                }
              >
                5
              </span>

              <div>
                <h2>
                  Contact preference
                </h2>

                <p>
                  Choose how helpers
                  should contact you.
                </p>
              </div>
            </div>

            <div
              className={
                styles.contactOptions
              }
            >
              <label
                className={`${styles.contactOption} ${formData.contactPreference ===
                  "chat"
                  ? styles.contactOptionSelected
                  : ""
                  }`}
              >
                <input
                  type="radio"
                  name="contactPreference"
                  value="chat"
                  checked={
                    formData.contactPreference ===
                    "chat"
                  }
                  onChange={() =>
                    updateField(
                      "contactPreference",
                      "chat"
                    )
                  }
                />

                <Send
                  size={19}
                />

                <span>
                  <strong>
                    PingMe chat
                  </strong>

                  <small>
                    Keep communication
                    inside the app
                  </small>
                </span>
              </label>

              <label
                className={`${styles.contactOption} ${formData.contactPreference ===
                  "phone"
                  ? styles.contactOptionSelected
                  : ""
                  }`}
              >
                <input
                  type="radio"
                  name="contactPreference"
                  value="phone"
                  checked={
                    formData.contactPreference ===
                    "phone"
                  }
                  onChange={() =>
                    updateField(
                      "contactPreference",
                      "phone"
                    )
                  }
                />

                <Phone
                  size={19}
                />

                <span>
                  <strong>
                    Phone
                  </strong>

                  <small>
                    Allow direct phone
                    contact
                  </small>
                </span>
              </label>

              <label
                className={`${styles.contactOption} ${formData.contactPreference ===
                  "both"
                  ? styles.contactOptionSelected
                  : ""
                  }`}
              >
                <input
                  type="radio"
                  name="contactPreference"
                  value="both"
                  checked={
                    formData.contactPreference ===
                    "both"
                  }
                  onChange={() =>
                    updateField(
                      "contactPreference",
                      "both"
                    )
                  }
                />

                <HandHeart
                  size={19}
                />

                <span>
                  <strong>
                    Both
                  </strong>

                  <small>
                    Chat and phone
                  </small>
                </span>
              </label>
            </div>

            {["phone", "both"].includes(
              formData.contactPreference
            ) && (
                <div
                  className={
                    styles.phoneField
                  }
                >
                  <label
                    htmlFor="help-phone"
                  >
                    Phone number
                  </label>

                  <input
                    id="help-phone"
                    type="tel"
                    value={
                      formData.contactPhone
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "contactPhone",
                        event.target
                          .value
                      )
                    }
                    placeholder="+91 98765 43210"
                    maxLength={20}
                    className={
                      fieldErrors.contactPhone
                        ? styles.inputError
                        : ""
                    }
                  />

                  {fieldErrors.contactPhone && (
                    <span
                      className={
                        styles.fieldError
                      }
                    >
                      {
                        fieldErrors.contactPhone
                      }
                    </span>
                  )}

                  <small>
                    Your phone number
                    should only be shown
                    to approved helpers
                    in the final
                    production version.
                  </small>
                </div>
              )}
          </section>

          <section
            className={
              styles.formSection
            }
          >
            <div
              className={
                styles.sectionHeader
              }
            >
              <span
                className={
                  styles.sectionNumber
                }
              >
                6
              </span>

              <div>
                <h2>
                  Request expiry
                </h2>

                <p>
                  The request closes
                  automatically after
                  this period.
                </p>
              </div>
            </div>

            <div
              className={
                styles.expiryOptions
              }
            >
              {EXPIRY_OPTIONS.map(
                (option) => (
                  <button
                    key={
                      option.value
                    }
                    type="button"
                    className={`${styles.expiryButton} ${Number(
                      formData.expiresInDays
                    ) ===
                      option.value
                      ? styles.expiryButtonSelected
                      : ""
                      }`}
                    onClick={() =>
                      updateField(
                        "expiresInDays",
                        option.value
                      )
                    }
                  >
                    <Clock3
                      size={16}
                    />

                    {
                      option.label
                    }
                  </button>
                )
              )}
            </div>
          </section>

          <section
            className={
              styles.safetyNotice
            }
          >
            <ShieldAlert
              size={22}
            />

            <div>
              <strong>
                Community safety
              </strong>

              <p>
                Never share passwords,
                OTPs, banking details
                or sensitive personal
                information. For
                life-threatening
                emergencies, contact
                local emergency
                services immediately.
              </p>
            </div>
          </section>

          <footer
            className={
              styles.formFooter
            }
          >
            <button
              type="button"
              className={
                styles.cancelButton
              }
              onClick={
                handleBack
              }
              disabled={
                submitting
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              className={
                styles.submitButton
              }
              disabled={
                submitting
              }
            >
              {submitting ? (
                <>
                  <LoaderCircle
                    size={19}
                    className={
                      styles.spinning
                    }
                  />

                  Creating...
                </>
              ) : (
                <>
                  <Send
                    size={18}
                  />

                  Publish request
                </>
              )}
            </button>
          </footer>
        </form>
      </main>
    </div>
  );
};

export default CreateHelpRequest;