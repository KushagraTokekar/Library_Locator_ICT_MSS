require("dotenv").config();

const express = require("express");

const cors = require("cors");

const bcrypt = require("bcrypt");

const crypto = require("crypto");

const jwt = require("jsonwebtoken");

const helmet = require("helmet");

const compression = require("compression");

const rateLimit = require("express-rate-limit");

const generateOTP = require("./utils/generateOTP");

const transporter = require("./services/emailService");

const { db, testDbConnection, closeDbPool } = require("./db");

// ─── ENV VALIDATION ─────────────────────────────

const REQUIRED_ENV = ["JWT_SECRET", "EMAIL_USER", "EMAIL_PASS"];

REQUIRED_ENV.forEach((key) => {

  if (!process.env[key]) {

    console.error(`Missing ENV variable: ${key}`);

    process.exit(1);

  }

});

// ─── CONFIG ─────────────────────────────────────

const PORT = process.env.PORT || 3000;

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:8081",
  "http://localhost:19006",
  "http://localhost:3000",
  "http://127.0.0.1:8081",
  "http://127.0.0.1:19006",
  "http://10.0.2.2:8081",
  "http://10.0.2.2:19006",
  


];

const allowedOrigins = new Set(
  [
    ...DEFAULT_ALLOWED_ORIGINS,
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL.trim()] : []),
    ...(process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
      : []),
  ].filter(Boolean)
);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// ─── EXPRESS INIT ───────────────────────────────

const app = express();

app.use(cors(corsOptions));


app.use(express.json());

app.use(helmet());

app.use(compression());

// ─── RATE LIMITERS ──────────────────────────────

const loginLimiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  max: 5,

  message: "Too many login attempts. Try again later.",

});

const otpLimiter = rateLimit({

  windowMs: 60 * 60 * 1000,

  max: 3,

  message: "Too many OTP requests.",

});

const generalLimiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  max: 20,

  message: "Too many requests. Try again later.",

});

// ─── VALIDATORS ─────────────────────────────────

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

function validateEmail(email) {

  return emailRegex.test(email);

}

function validatePassword(password) {

  return passwordRegex.test(password);

}

// ─── SILENT ERROR HANDLING ──────────────────────

function logError(scope, err, extra = {}) {

  console.error(`[${scope}]`, err?.stack || err, extra);

}

function sendSilentError(res, statusCode, scope, err, message = "Server error") {

  if (err) logError(scope, err);

  return res.status(statusCode).json({

    success: false,

    message,

  });

}

// ─── TOKEN GENERATOR ────────────────────────────

function generateToken(user) {

  return jwt.sign(

    {

      id: user.id,

      email: user.email,

      superuser: user.superuser,
      role: user.superuser ? "super_admin" : "user",

      iss: "library-locator",

      aud: "mobile-app",

    },

    process.env.JWT_SECRET,

    { expiresIn: "8h" }

  );

}

// ─── JWT AUTH MIDDLEWARE ────────────────────────

function requireAuth(req, res, next) {

  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {

    return res.status(401).json({

      success: false,

      message: "Missing token",

    });

  }

  const token = header.split(" ")[1];

  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {

      issuer: "library-locator",

      audience: "mobile-app",

    });

    req.user = decoded;

    next();

  } catch (err) {

    if (err.name === "TokenExpiredError") {

      return res.status(401).json({

        success: false,

        message: "Token expired",

      });

    }

    return res.status(401).json({

      success: false,

      message: "Invalid token",

    });

  }

}



function requireSuperAdmin(req, res, next) {

  if (!req.user || Number(req.user.superuser) !== 1) {

    return res.status(403).json({

      success: false,

      message: "Super admin access required",

    });

  }

  next();

}

// ─── HEALTH CHECK ───────────────────────────────

app.get("/health", (_, res) => {

  res.json({

    status: "ok",

    timestamp: new Date().toISOString(),

  });

});

// ─── SIGNUP ─────────────────────────────────────

app.post("/signup", generalLimiter, async (req, res) => {

  try {

    const email = req.body.email?.trim().toLowerCase();

    const password = req.body.password;

    if (!email || !password) {

      return res.status(400).json({

        success: false,

        message: "Missing email or password",

      });

    }

    if (!validateEmail(email)) {

      return res.status(400).json({

        success: false,

        message: "Invalid email format",

      });

    }

    if (!validatePassword(password)) {

      return res.status(400).json({

        success: false,

        message: "Weak password",

      });

    }

    db.query(

      "SELECT * FROM yii_users WHERE email=?",

      [email],

      async (err, rows) => {

        if (err) {

          return sendSilentError(res, 500, "SIGNUP_SELECT", err);

        }

        async function createUser() {

          try {

            const hashedPassword = await bcrypt.hash(password, 10);

            const otp = generateOTP();

            const hashedOTP = await bcrypt.hash(otp.toString(), 10);

            const expiry = new Date(Date.now() + 3 * 60 * 1000);

            const activkey = crypto.randomBytes(32).toString("hex");

            db.query(

              `

              INSERT INTO yii_users

              (

                username,

                email,

                password,

                activkey,

                status,

                superuser,

                otp_code,

                otp_expiry,

                email_verified,

                otp_attempts,

                login_attempts,

                lock_until

              )

              VALUES (?, ?, ?, ?, 1, 0, ?, ?, false, 0, 0, NULL)

              `,

              [email, email, hashedPassword, activkey, hashedOTP, expiry],

              async (insertErr, insertResult) => {

                if (insertErr) {

                  return sendSilentError(res, 500, "SIGNUP_INSERT", insertErr);

                }

                try {

                  await transporter.sendMail({

                    from: process.env.EMAIL_USER,

                    to: email,

                    subject: "Library Locator Verification Code",

                    text: `Your verification code is ${otp}`,

                  });

                  return res.json({

                    success: true,

                  });

                } catch (emailError) {

                  if (insertResult?.insertId) {

                    db.query("DELETE FROM yii_users WHERE id=?", [insertResult.insertId], () => {});

                  }

                  return sendSilentError(

                    res,

                    500,

                    "SIGNUP_EMAIL",

                    emailError,

                    "Email delivery failed"

                  );

                }

              }

            );

          } catch (error) {

            return sendSilentError(res, 500, "SIGNUP_CREATE", error);

          }

        }

        if (rows.length) {

          const existingUser = rows[0];

          if (existingUser.email_verified) {

            return res.status(409).json({

              success: false,

              message: "Email already registered",

            });

          }

          if (

            existingUser.otp_expiry &&

            new Date(existingUser.otp_expiry) > new Date()

          ) {

            return res.status(409).json({

              success: false,

              message: "Please verify the existing signup attempt",

            });

          }

          db.query(

            "DELETE FROM yii_users WHERE email=? AND email_verified=false",

            [email],

            async (deleteErr) => {

              if (deleteErr) {

                return sendSilentError(res, 500, "SIGNUP_DELETE", deleteErr);

              }

              return createUser();

            }

          );

          return;

        }

        return createUser();

      }

    );

  } catch (serverError) {

    return sendSilentError(res, 500, "SIGNUP", serverError);

  }

});

// ─── VERIFY EMAIL ───────────────────────────────

app.post("/verify-email", generalLimiter, async (req, res) => {

  const email = req.body.email?.trim().toLowerCase();

  const otp = req.body.otp;

  if (!email || !otp) {

    return res.status(400).json({

      success: false,

      message: "Missing email or OTP",

    });

  }

  db.query(

    "SELECT * FROM yii_users WHERE email=?",

    [email],

    async (err, rows) => {

      if (err) {

        return sendSilentError(res, 500, "VERIFY_SELECT", err);

      }

      try {

        if (!rows.length) {

          return res.status(404).json({

            success: false,

            message: "User not found",

          });

        }

        const user = rows[0];

        if (user.email_verified) {

          return res.status(400).json({

            success: false,

            message: "Email already verified",

          });

        }

        if (!user.otp_code || !user.otp_expiry) {

          return res.status(400).json({

            success: false,

            message: "OTP not available",

          });

        }

        if (user.otp_attempts >= 5) {

          return res.status(403).json({

            success: false,

            message: "Too many OTP attempts",

          });

        }

        if (new Date(user.otp_expiry) < new Date()) {

          return res.status(410).json({

            success: false,

            message: "OTP expired",

          });

        }

        const validOTP = await bcrypt.compare(otp.toString(), user.otp_code);

        if (!validOTP) {

          db.query(

            "UPDATE yii_users SET otp_attempts=otp_attempts+1 WHERE email=?",

            [email]

          );

          return res.status(401).json({

            success: false,

            message: "Invalid OTP",

          });

        }

        db.query(

          `

          UPDATE yii_users

          SET

            email_verified=true,

            otp_code=NULL,

            otp_expiry=NULL,

            otp_attempts=0

          WHERE email=?

          `,

          [email],

          (updateErr) => {

            if (updateErr) {

              return sendSilentError(res, 500, "VERIFY_UPDATE", updateErr);

            }

            return res.json({

              success: true,

              token: generateToken(user),

            });

          }

        );

      } catch (error) {

        return sendSilentError(res, 500, "VERIFY", error);

      }

    }

  );

});

// ─── LOGIN ──────────────────────────────────────

app.post("/login", loginLimiter, async (req, res) => {

  const email = req.body.email?.trim().toLowerCase();

  const password = req.body.password;

  if (!email || !password) {

    return res.status(400).json({

      success: false,

      message: "Missing email or password",

    });

  }

  db.query(

    "SELECT * FROM yii_users WHERE email=?",

    [email],

    async (err, rows) => {

      if (err) {

        return sendSilentError(res, 500, "LOGIN_SELECT", err);

      }

      try {

        if (!rows.length) {

          return res.status(401).json({

            success: false,

            message: "Invalid credentials",

          });

        }

        const user = rows[0];

        if (!user.email_verified) {

          return res.status(403).json({

            success: false,

            message: "Email not verified",

          });

        }

        if (user.lock_until && new Date(user.lock_until) > new Date()) {

          return res.status(403).json({

            success: false,

            message: "Account locked",

          });

        }

        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {

          const attemptsAfterFail = (user.login_attempts || 0) + 1;

          const updates = ["login_attempts=?"];

          const params = [attemptsAfterFail];

          if (attemptsAfterFail >= 5) {

            updates.push("lock_until=?");

            params.push(new Date(Date.now() + 15 * 60 * 1000));

          }

          params.push(email);

          db.query(

            `UPDATE yii_users SET ${updates.join(", ")} WHERE email=?`,

            params

          );

          return res.status(401).json({

            success: false,

            message: "Invalid credentials",

          });

        }

        db.query(

          `

          UPDATE yii_users

          SET login_attempts=0, lock_until=NULL

          WHERE email=?

          `,

          [email]

        );

        return res.json({

          success: true,

          token: generateToken(user),

        });

      } catch (error) {

        return sendSilentError(res, 500, "LOGIN", error);

      }

    }

  );

});

// ─── RESEND OTP ─────────────────────────────────

app.post("/resend-otp", otpLimiter, async (req, res) => {

  const email = req.body.email?.trim().toLowerCase();

  if (!email) {

    return res.status(400).json({

      success: false,

      message: "Missing email",

    });

  }

  db.query(

    "SELECT * FROM yii_users WHERE email=?",

    [email],

    async (err, rows) => {

      if (err) {

        return sendSilentError(res, 500, "RESEND_SELECT", err);

      }

      try {

        if (!rows.length) {

          return res.status(404).json({

            success: false,

            message: "User not found",

          });

        }

        const user = rows[0];

        if (user.email_verified) {

          return res.status(400).json({

            success: false,

            message: "Email already verified",

          });

        }

        const otp = generateOTP();

        const hashedOTP = await bcrypt.hash(otp.toString(), 10);

        const expiry = new Date(Date.now() + 3 * 60 * 1000);

        db.query(

          `

          UPDATE yii_users

          SET otp_code=?, otp_expiry=?, otp_attempts=0

          WHERE email=? AND email_verified=false

          `,

          [hashedOTP, expiry, email],

          async (updateErr, updateResult) => {

            if (updateErr) {

              return sendSilentError(res, 500, "RESEND_UPDATE", updateErr);

            }

            if (!updateResult.affectedRows) {

              return res.status(404).json({

                success: false,

                message: "User not found",

              });

            }

            try {

              await transporter.sendMail({

                from: process.env.EMAIL_USER,

                to: email,

                subject: "Library Locator Verification Code",

                text: `Your verification code is ${otp}`,

              });

              return res.json({

                success: true,

              });

            } catch (mailErr) {

              return sendSilentError(

                res,

                500,

                "RESEND_EMAIL",

                mailErr,

                "Email delivery failed"

              );

            }

          }

        );

      } catch (error) {

        return sendSilentError(res, 500, "RESEND", error);

      }

    }

  );

});

// ─── SEARCH ─────────────────────────────────────

app.get("/search", requireAuth, (req, res) => {

  const term = req.query.book?.trim();

  if (!term) {

    return res.status(400).json({

      success: false,

      message: "Missing search term",

    });

  }

  const pattern = `%${term}%`;
  console.log("[SEARCH] Request", { userId: req.user?.id, term });

  db.query(

    `

    SELECT

      oldbookid,

      bookname,

      bookauthor,

      bookpublisher,

      bookshelf,

      subject

    FROM yii_book

    JOIN yii_subject

      USING (idsubject)

    WHERE

      bookname LIKE ?

      OR bookauthor LIKE ?

    ORDER BY bookname ASC

    LIMIT 50

    `,

    [pattern, pattern],

    (err, results) => {

      if (err) {
        logError("SEARCH_QUERY", err, { userId: req.user?.id, term });

        return sendSilentError(res, 500, "SEARCH", err);

      }

      if (!Array.isArray(results)) {
        logError("SEARCH_RESULTS_INVALID", new Error("Search results are not an array"), {
          userId: req.user?.id,
          term,
        });
        return res.status(500).json({
          success: false,
          message: "Invalid search response from server",
        });
      }

      console.log("[SEARCH] Success", { userId: req.user?.id, term, count: results.length });

      return res.json({

        success: true,

        data: results,

      });

    }

  );

});

// ─── BOOKS PAGINATION ───────────────────────────

app.get("/books", requireAuth, (req, res) => {

  const page = parseInt(req.query.page) || 1;

  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  if (Number.isNaN(page) || page < 1) {
    return res.status(400).json({
      success: false,
      message: "Invalid page value",
    });
  }

  if (Number.isNaN(limit) || limit < 1) {
    return res.status(400).json({
      success: false,
      message: "Invalid limit value",
    });
  }

  const offset = (page - 1) * limit;
  console.log("[BOOKS] Request", { userId: req.user?.id, page, limit, offset });

  db.query(

    `

    SELECT

      oldbookid,

      bookname,

      bookauthor,

      bookpublisher,

      bookshelf,

      subject

    FROM yii_book

    JOIN yii_subject

      USING (idsubject)

    ORDER BY bookname ASC

    LIMIT ? OFFSET ?

    `,

    [limit, offset],

    (err, results) => {

      if (err) {
        logError("BOOKS_QUERY", err, { userId: req.user?.id, page, limit, offset });

        return sendSilentError(res, 500, "BOOKS", err);

      }

      if (!Array.isArray(results)) {
        logError("BOOKS_RESULTS_INVALID", new Error("Books results are not an array"), {
          userId: req.user?.id,
          page,
          limit,
          offset,
        });
        return res.status(500).json({
          success: false,
          message: "Invalid books response from server",
        });
      }

      console.log("[BOOKS] Success", { userId: req.user?.id, page, limit, count: results.length });

      return res.json({

        success: true,

        data: results,

        page,

        limit,

      });

    }

  );

});

// ─── CHANGE PASSWORD ────────────────────────────

app.post("/change-password", requireAuth, async (req, res) => {

  const userId = req.user.id;

  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {

    return res.status(400).json({

      success: false,

      message: "Missing password fields",

    });

  }

  if (!validatePassword(newPassword)) {

    return res.status(400).json({

      success: false,

      message: "Weak password",

    });

  }

  db.query(

    "SELECT password FROM yii_users WHERE id=?",

    [userId],

    async (err, rows) => {

      if (err) {

        return sendSilentError(res, 500, "CHANGE_PASSWORD_SELECT", err);

      }

      try {

        if (!rows.length) {

          return res.status(404).json({

            success: false,

            message: "User not found",

          });

        }

        const valid = await bcrypt.compare(oldPassword, rows[0].password);

        if (!valid) {

          return res.status(401).json({

            success: false,

            message: "Incorrect old password",

          });

        }

        const hashed = await bcrypt.hash(newPassword, 10);

        db.query(

          "UPDATE yii_users SET password=? WHERE id=?",

          [hashed, userId],

          (updateErr) => {

            if (updateErr) {

              return sendSilentError(res, 500, "CHANGE_PASSWORD_UPDATE", updateErr);

            }

            return res.json({

              success: true,

            });

          }

        );

      } catch (error) {

        return sendSilentError(res, 500, "CHANGE_PASSWORD", error);

      }

    }

  );

});

// ─── FORGOT PASSWORD ────────────────────────────

app.post("/forgot-password", generalLimiter, async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Missing email",
    });
  }

  db.query(
    "SELECT * FROM yii_users WHERE email=?",
    [email],
    async (err, rows) => {
      if (err) {
        return sendSilentError(res, 500, "FORGOT_SELECT", err);
      }

      try {
        if (!rows.length) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        const user = rows[0];

        if (!user.email_verified) {
          return res.status(403).json({
            success: false,
            message: "Email not verified",
          });
        }

        const otp = generateOTP();
        const hashedOTP = await bcrypt.hash(otp.toString(), 10);
        const expiry = new Date(Date.now() + 3 * 60 * 1000);

        db.query(
          `
          UPDATE yii_users
          SET otp_code=?, otp_expiry=?, otp_attempts=0
          WHERE email=?
          `,
          [hashedOTP, expiry, email],
          async (updateErr) => {
            if (updateErr) {
              return sendSilentError(res, 500, "FORGOT_UPDATE", updateErr);
            }

            try {
              await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: "Password Reset OTP",
                text: `Your password reset code is ${otp}`,
              });

              return res.json({
                success: true,
              });
            } catch (mailErr) {
              return sendSilentError(
                res,
                500,
                "FORGOT_EMAIL",
                mailErr,
                "Email delivery failed"
              );
            }
          }
        );
      } catch (error) {
        return sendSilentError(res, 500, "FORGOT", error);
      }
    }
  );
});

// ─── DELETE ACCOUNT ─────────────────────────────

app.post("/delete-account", requireAuth, async (req, res) => {
  const userId = req.user.id;
  if (Number(req.user.superuser) === 1) {

  return res.status(403).json({

    success: false,

    message: "Super admin account cannot be deleted",

  });

}
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      message: "Password required",
    });
  }

  db.query(
    "SELECT password FROM yii_users WHERE id=?",
    [userId],
    async (err, rows) => {
      if (err) {
        return sendSilentError(res, 500, "DELETE_SELECT", err);
      }

      try {
        if (!rows.length) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        const valid = await bcrypt.compare(password, rows[0].password);

        if (!valid) {
          return res.status(401).json({
            success: false,
            message: "Incorrect password",
          });
        }

        db.query(
          "DELETE FROM yii_users WHERE id=? LIMIT 1",
          [userId],
          (deleteErr, deleteResult) => {
            if (deleteErr) {
              return sendSilentError(res, 500, "DELETE_ACCOUNT", deleteErr, "Deletion failed");
            }

            if (!deleteResult.affectedRows) {
              return res.status(404).json({
                success: false,
                message: "User already deleted or not found",
              });
            }

            return res.json({ success: true });
          }
        );
      } catch (error) {
        return sendSilentError(res, 500, "DELETE_ACCOUNT_FLOW", error);
      }
    }
  );
});

// ─── RESET PASSWORD ─────────────────────────────

app.post("/reset-password", generalLimiter, async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const otp = req.body.otp;
  const newPassword = req.body.newPassword;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Missing fields",
    });
  }

  if (!validatePassword(newPassword)) {
    return res.status(400).json({
      success: false,
      message: "Weak password",
    });
  }

  db.query(
    "SELECT * FROM yii_users WHERE email=?",
    [email],
    async (err, rows) => {
      if (err) {
        return sendSilentError(res, 500, "RESET_SELECT", err);
      }

      try {
        if (!rows.length) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        const user = rows[0];

        if (user.otp_attempts >= 5) {
          return res.status(403).json({
            success: false,
            message: "Too many OTP attempts",
          });
        }

        if (!user.otp_code || !user.otp_expiry) {
          return res.status(400).json({
            success: false,
            message: "OTP not available",
          });
        }

        if (new Date(user.otp_expiry) < new Date()) {
          return res.status(410).json({
            success: false,
            message: "OTP expired",
          });
        }

        const validOTP = await bcrypt.compare(otp.toString(), user.otp_code);

        if (!validOTP) {
          db.query(
            "UPDATE yii_users SET otp_attempts=otp_attempts+1 WHERE email=?",
            [email]
          );

          return res.status(401).json({
            success: false,
            message: "Invalid OTP",
          });
        }

        const hashed = await bcrypt.hash(newPassword, 10);

        db.query(
          `
          UPDATE yii_users
          SET
            password=?,
            otp_code=NULL,
            otp_expiry=NULL,
            otp_attempts=0
          WHERE email=?
          `,
          [hashed, email],
          (updateErr) => {
            if (updateErr) {
              return sendSilentError(res, 500, "RESET_UPDATE", updateErr);
            }

            return res.json({
              success: true,
            });
          }
        );
      } catch (error) {
        return sendSilentError(res, 500, "RESET_PASSWORD", error);
      }
    }
  );
});

/*
────────────────────────────────────────
ADMIN ROUTES
────────────────────────────────────────
*/



// ─── ADMIN: GET ALL USERS ─────────────────────

app.get(
  "/admin/users",
  requireAuth,
  requireSuperAdmin,
  (req, res) => {

    db.query(
      `
      SELECT
        id,
        email,
        superuser,
        email_verified,
        create_at
      FROM yii_users
      ORDER BY id DESC
      `,
      (err, rows) => {

        if (err)
          return sendSilentError(res, 500, "ADMIN_USERS", err);

        res.json({
          success: true,
          users: rows
        });

      }
    );

  }
);

// ─── ADMIN: DELETE USER ─────────────────────

app.post(
  "/admin/delete-user",
  requireAuth,
  requireSuperAdmin,
  (req, res) => {

    const { userId } = req.body;

    if (!userId)
      return res.status(400).json({
        success: false,
        message: "User ID required"
      });

    db.query(
      "SELECT superuser FROM yii_users WHERE id=?",
      [userId],
      (err, rows) => {

        if (err)
          return sendSilentError(res, 500, "ADMIN_DELETE_SELECT", err);

        if (!rows.length)
          return res.status(404).json({
            success: false,
            message: "User not found"
          });

        if (Number(rows[0].superuser) === 1)
          return res.status(403).json({
            success: false,
            message: "Cannot delete super admin"
          });

        db.query(
          "DELETE FROM yii_users WHERE id=?",
          [userId],
          (deleteErr) => {

            if (deleteErr)
              return sendSilentError(res, 500, "ADMIN_DELETE_USER", deleteErr);

            res.json({
              success: true,
              message: "User deleted"
            });

          }
        );

      }
    );

  }
);


// ─── ADMIN: PROMOTE USER ─────────────────────

app.post(
  "/admin/promote-user",
  requireAuth,
  requireSuperAdmin,
  (req, res) => {

    const { userId } = req.body;

    if (!userId)
      return res.status(400).json({
        success: false,
        message: "User ID required"
      });

    db.query(
      "UPDATE yii_users SET superuser=1 WHERE id=?",
      [userId],
      (err) => {

        if (err)
          return sendSilentError(res, 500, "ADMIN_PROMOTE", err);

        res.json({
          success: true,
          message: "User promoted successfully"
        });

      }
    );

  }
);


// ─── ADMIN: ADD BOOK ENTRY ─────────────────────

app.get(
  "/admin/subjects",
  requireAuth,
  requireSuperAdmin,
  (req, res) => {
    db.query(
      `
      SELECT idsubject, subject
      FROM yii_subject
      ORDER BY subject ASC
      `,
      (err, rows) => {
        if (err) {
          return sendSilentError(res, 500, "ADMIN_SUBJECTS", err);
        }

        return res.json({
          success: true,
          subjects: rows
        });
      }
    );
  }
);

app.post(
  "/admin/add-book",
  requireAuth,
  requireSuperAdmin,
  (req, res) => {
    const {
      idsubject,
      bookname,
      bookauthor,
      bookpublisher,
      bookshelf,
      oldbookid
    } = req.body || {};

    const cleanSubject = Number(idsubject);
    const cleanName = bookname?.trim();
    const cleanAuthor = bookauthor?.trim();
    const cleanPublisher = bookpublisher?.trim();
    const cleanShelf = bookshelf?.trim();
    const cleanOldBookId = oldbookid?.trim() || null;

    if (!cleanSubject || cleanSubject < 1) {
      return res.status(400).json({
        success: false,
        message: "Valid subject ID is required"
      });
    }

    if (!cleanName || !cleanAuthor || !cleanPublisher || !cleanShelf) {
      return res.status(400).json({
        success: false,
        message: "Subject, book name, author, publisher and shelf are required"
      });
    }

    db.query(
      "SELECT idsubject FROM yii_subject WHERE idsubject=? LIMIT 1",
      [cleanSubject],
      (subjectErr, subjectRows) => {
        if (subjectErr) {
          return sendSilentError(res, 500, "ADMIN_ADD_BOOK_SUBJECT", subjectErr);
        }

        if (!subjectRows.length) {
          return res.status(404).json({
            success: false,
            message: "Subject not found"
          });
        }

        db.query(
          `
            SELECT idbook
            FROM yii_book
            WHERE bookname=? AND bookauthor=? AND bookshelf=?
            LIMIT 1
          `,
          [cleanName, cleanAuthor, cleanShelf],
          (dupErr, dupRows) => {
            if (dupErr) {
              return sendSilentError(res, 500, "ADMIN_ADD_BOOK_DUP", dupErr);
            }

            if (dupRows.length) {
              return res.status(409).json({
                success: false,
                message: "Book already exists for this author and shelf location"
              });
            }

            db.query(
          `
            INSERT INTO yii_book
            (
              idsubject,
              bookname,
              bookauthor,
              bookpublisher,
              bookshelf,
              oldbookid
            )
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          [cleanSubject, cleanName, cleanAuthor, cleanPublisher, cleanShelf, cleanOldBookId],
          (insertErr, insertResult) => {
            if (insertErr) {
              return sendSilentError(res, 500, "ADMIN_ADD_BOOK_INSERT", insertErr);
            }

            return res.json({
              success: true,
              message: "Book added successfully",
              idbook: insertResult.insertId
            });
          }
        );
          }
        );
      }
    );
  }
);






// ─── AUTO CLEANUP JOB ───────────────────────────

setInterval(() => {
  db.query(
    `
    DELETE FROM yii_users
    WHERE
      email_verified = false
      AND otp_expiry < NOW()
    `,
    (err) => {
      if (err) {
        logError("CLEANUP_JOB", err);
        return;
      }

      console.log("Expired signup accounts cleaned");
    }
  );
}, 10 * 60 * 1000);

// ─── 404 HANDLER ────────────────────────────────

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ─── GLOBAL ERROR HANDLER ───────────────────────

app.use((err, req, res, next) => {
  logError("GLOBAL_ERROR", err);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(err.status || 500).json({
    success: false,
    message: "Server error",
  });
});

// ─── SERVER START ───────────────────────────────

async function startServer() {
  try {
    await testDbConnection();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[SERVER RUNNING] http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    logError("SERVER_START", err);
    process.exit(1);
  }
}

startServer();

// ─── PROCESS-LEVEL SAFETY ───────────────────────

process.on("unhandledRejection", (err) => {
  logError("UNHANDLED_REJECTION", err);
});

process.on("uncaughtException", async (err) => {
  logError("UNCAUGHT_EXCEPTION", err);
  await closeDbPool();
  process.exit(1);
});

process.on("SIGINT", async () => {
  console.log("\n[SERVER] SIGINT received, closing DB pool...");
  await closeDbPool();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n[SERVER] SIGTERM received, closing DB pool...");
  await closeDbPool();
  process.exit(0);
});
