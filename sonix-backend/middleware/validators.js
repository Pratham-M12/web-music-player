const { body, param, validationResult } = require("express-validator");

/**
 * Middleware to check validation results and return 400 if invalid.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ── Auth validations ──
const registerRules = [
  body("username")
    .trim()
    .notEmpty().withMessage("Username is required")
    .isLength({ min: 2, max: 30 }).withMessage("Username must be 2-30 characters"),
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Must be a valid email"),
  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

const loginRules = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Must be a valid email"),
  body("password")
    .notEmpty().withMessage("Password is required"),
];

// ── Playlist validations ──
const createPlaylistRules = [
  body("name")
    .trim()
    .notEmpty().withMessage("Playlist name is required")
    .isLength({ max: 100 }).withMessage("Name too long (max 100 chars)"),
];

const addSongRules = [
  body("spotifyUrl")
    .notEmpty().withMessage("spotifyUrl is required"),
];

// ── Song like validation ──
const likeByUriRules = [
  body("spotifyUrl")
    .notEmpty().withMessage("spotifyUrl is required"),
];

// ── Param validation ──
const objectIdParam = (paramName = "id") => [
  param(paramName).isMongoId().withMessage(`Invalid ${paramName} format`),
];

module.exports = {
  validate,
  registerRules,
  loginRules,
  createPlaylistRules,
  addSongRules,
  likeByUriRules,
  objectIdParam,
};
