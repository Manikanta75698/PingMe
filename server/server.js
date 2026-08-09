const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");

const socketHandler = require("./socket/socket");
const connectDB = require("./config/db");

/* =========================
   ROUTE IMPORTS
========================= */

const authRoutesModule = require("./routes/authRoutes");
const postRoutesModule = require("./routes/postRoutes");
const notificationRoutesModule = require("./routes/notificationRoutes");
const storyRoutesModule = require("./routes/storyRoutes");
const messageRoutesModule = require("./routes/messageRoutes");
const userRoutesModule = require("./routes/userRoutes");
const helpRequestRoutesModule = require("./routes/helpRequestRoutes");

/* =========================
   CRON JOB IMPORTS
========================= */

const startDeleteExpiredMessages = require("./cron/deleteExpiredMessages");

const {
  startStoryCleanupJob,
} = require("./cron/storyCleanup");

/* =========================
   ROUTER NORMALIZER
========================= */

const resolveRouter = (routeModule, routeName) => {
  const router =
    routeModule?.router ||
    routeModule?.default ||
    routeModule;

  if (typeof router !== "function") {
    console.error(
      `❌ INVALID ROUTER EXPORT: ${routeName} `,
      {
        receivedType: typeof routeModule,
        receivedValue: routeModule,
      }
    );

    throw new TypeError(
      `${routeName} must export an Express router using module.exports = router`
    );
  }

  return router;
};

const authRoutes = resolveRouter(
  authRoutesModule,
  "authRoutes"
);

const postRoutes = resolveRouter(
  postRoutesModule,
  "postRoutes"
);

const notificationRoutes = resolveRouter(
  notificationRoutesModule,
  "notificationRoutes"
);

const storyRoutes = resolveRouter(
  storyRoutesModule,
  "storyRoutes"
);

const messageRoutes = resolveRouter(
  messageRoutesModule,
  "messageRoutes"
);

const userRoutes = resolveRouter(
  userRoutesModule,
  "userRoutes"
);

const helpRequestRoutes = resolveRouter(
  helpRequestRoutesModule,
  "helpRequestRoutes"
);

/* =========================
   EXPRESS APP
========================= */

const app = express();
const server = http.createServer(app);

/*
  Render / reverse proxy support.

  This is important for express-rate-limit so it can
  correctly identify the real client IP address.
*/
app.set("trust proxy", 1);

/* =========================
   SECURITY HEADERS
========================= */

app.use(
  helmet({
    /*
      Backend is an API server, so disabling this particular
      policy avoids accidental issues if media/resources are
      ever proxied through this server.
    */
    crossOriginResourcePolicy: false,
  })
);

/* =========================
   CORS
========================= */

const normalizeOrigin = (value) => {
  return value
    ? value.replace(/\/+$/, "")
    : "";
};

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost",
  "capacitor://localhost",

  normalizeOrigin(
    process.env.CLIENT_PRODUCTION_URL
  ),
].filter(Boolean);

const isAllowedOrigin = (origin) => {
  /*
    Native apps, server-to-server requests,
    Postman, curl etc. may not send Origin.
  */
  if (!origin || origin === "null") {
    return true;
  }

  return allowedOrigins.includes(
    normalizeOrigin(origin)
  );
};

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    console.error(
      "CORS BLOCKED ORIGIN:",
      origin
    );

    callback(
      new Error(
        `Origin not allowed: ${origin}`
      )
    );
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],
};

/* =========================
   CORS MIDDLEWARE
========================= */

app.use(cors(corsOptions));

/* =========================
   RATE LIMITING
========================= */

/*
  General API protection.

  High enough for normal social-app usage while still
  providing basic protection against abusive traffic.
*/
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 500,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many requests. Please try again later.",
  },
});

/*
  Sensitive authentication protection.

  We intentionally apply this only to login/register/OTP/
  password-reset endpoints — NOT the whole /api/auth router.
*/
const sensitiveAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 25,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many authentication attempts. Please wait and try again.",
  },
});

/*
  OTP resend should be more restrictive because it may
  trigger email delivery and can otherwise be abused.
*/
const otpResendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,

  max: 5,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many OTP requests. Please wait before requesting another code.",
  },
});

/*
  General limiter applies to all REST API routes.
*/
app.use("/api", apiLimiter);

/*
  Strict protection only for sensitive auth routes.
*/
app.use(
  [
    "/api/auth/register",
    "/api/auth/login",
    "/api/auth/verify-otp",
    "/api/auth/forgot-password",
    "/api/auth/verify-reset-otp",
    "/api/auth/reset-password",
  ],
  sensitiveAuthLimiter
);

/*
  Separate tighter limiter for OTP resend.
*/
app.use(
  "/api/auth/resend-otp",
  otpResendLimiter
);

/* =========================
   BODY / COOKIE MIDDLEWARE
========================= */

/*
  Regular API requests generally don't need 10 MB JSON.
  Image uploads should use multipart/form-data via Multer.
*/
app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

app.use(cookieParser());

/* =========================
   HEALTH CHECK
========================= */

app.get(
  "/api/health",
  (req, res) => {
    res.set(
      "Cache-Control",
      "no-store"
    );

    return res
      .status(200)
      .json({
        success: true,
        status: "ok",
        message: "Backend is awake",
        timestamp:
          new Date().toISOString(),
      });
  }
);

/* =========================
   REST ROUTES
========================= */

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/posts",
  postRoutes
);

app.use(
  "/api/notifications",
  notificationRoutes
);

app.use(
  "/api/stories",
  storyRoutes
);

app.use(
  "/api/messages",
  messageRoutes
);

app.use(
  "/api/users",
  userRoutes
);

app.use(
  "/api/help-requests",
  helpRequestRoutes
);

/* =========================
   ROOT ROUTE
========================= */

app.get(
  "/",
  (req, res) => {
    return res
      .status(200)
      .json({
        success: true,
        message:
          "🚀 Backend is running in production mode",
      });
  }
);

/* =========================
   NOT FOUND HANDLER
========================= */

app.use(
  (req, res) => {
    return res
      .status(404)
      .json({
        success: false,
        message:
          `Route not found: ${req.method} ${req.originalUrl} `,
      });
  }
);

/* =========================
   GLOBAL ERROR HANDLER
========================= */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "GLOBAL SERVER ERROR:",
      {
        message: error?.message,

        stack:
          process.env.NODE_ENV ===
            "development"
            ? error?.stack
            : undefined,
      }
    );

    if (res.headersSent) {
      return next(error);
    }

    return res
      .status(
        error?.status ||
        error?.statusCode ||
        500
      )
      .json({
        success: false,
        message:
          error?.message ||
          "Internal server error",
      });
  }
);

/* =========================
   SOCKET.IO
========================= */

const io = new Server(
  server,
  {
    cors: {
      origin(
        origin,
        callback
      ) {
        if (
          isAllowedOrigin(origin)
        ) {
          callback(
            null,
            true
          );

          return;
        }

        console.error(
          "SOCKET CORS BLOCKED:",
          origin
        );

        callback(
          new Error(
            `Socket origin not allowed: ${origin} `
          )
        );
      },

      credentials: true,

      methods: [
        "GET",
        "POST",
      ],
    },

    connectionStateRecovery: {
      maxDisconnectionDuration:
        2 * 60 * 1000,

      skipMiddlewares: true,
    },

    pingTimeout: 60000,
    pingInterval: 25000,
  }
);

if (
  typeof socketHandler !==
  "function"
) {
  throw new TypeError(
    "socketHandler must export a function"
  );
}

socketHandler(io);

/* =========================
   SERVER STARTUP
========================= */

const PORT =
  process.env.PORT ||
  5000;

const runStartupJobs = () => {
  if (
    typeof
    startDeleteExpiredMessages ===
    "function"
  ) {
    startDeleteExpiredMessages();
  } else {
    console.warn(
      "⚠️ deleteExpiredMessages job is not a function"
    );
  }

  if (
    typeof
    startStoryCleanupJob ===
    "function"
  ) {
    startStoryCleanupJob();
  } else {
    console.warn(
      "⚠️ storyCleanup job is not a function"
    );
  }
};

const startServer =
  async () => {
    try {
      await connectDB();

      runStartupJobs();

      server.listen(
        PORT,
        "0.0.0.0",
        () => {
          console.log(
            `✅ Production Secure Engine running on port: ${PORT} `
          );

          console.log(
            "✅ Helmet security headers enabled"
          );

          console.log(
            "✅ API rate limiting enabled"
          );

          console.log(
            "✅ All Express routes mounted successfully"
          );

          console.log(
            "✅ Help Request routes mounted at /api/help-requests"
          );
        }
      );
    } catch (error) {
      console.error(
        "❌ SERVER STARTUP ERROR:",
        error?.message ||
        error
      );

      process.exit(1);
    }
  };

startServer();

/* =========================
   PROCESS SAFETY
========================= */

process.on(
  "unhandledRejection",
  (error) => {
    console.error(
      "UNHANDLED PROMISE REJECTION:",
      error
    );
  }
);

process.on(
  "uncaughtException",
  (error) => {
    console.error(
      "UNCAUGHT EXCEPTION:",
      error
    );
  }
);

