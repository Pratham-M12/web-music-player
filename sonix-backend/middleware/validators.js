const { body, param, validationResult } = require("express-validator");
const { VALID_GENRES } = require("../models/UserProfile");

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

// ── Profile validations ──
const updateProfileRules = [
  body("displayName")
    .optional()
    .trim()
    .isLength({ max: 40 }).withMessage("Display name cannot exceed 40 characters"),

  body("bio")
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage("Bio cannot exceed 200 characters"),

  body("avatarUrl")
    .optional({ checkFalsy: true })
    .trim()
    .isURL({ require_protocol: true, protocols: ["http", "https"] })
    .withMessage("Avatar URL must be a valid http/https URL")
    .isLength({ max: 500 }).withMessage("Avatar URL too long"),

  body("preferences.genres")
    .optional()
    .isArray({ max: 5 }).withMessage("You can select at most 5 genres")
    .bail()
    .custom((genres) => {
      const invalid = genres.filter((g) => !VALID_GENRES.includes(g));
      if (invalid.length > 0) {
        throw new Error(`Unsupported genre(s): ${invalid.join(", ")}`);
      }
      return true;
    }),

  body("preferences.explicitContent")
    .optional()
    .isBoolean().withMessage("explicitContent must be a boolean"),

  body("preferences.autoplay")
    .optional()
    .isBoolean().withMessage("autoplay must be a boolean"),

  body("preferences.language")
    .optional()
    .trim()
    .isLength({ min: 2, max: 10 }).withMessage("Language code must be 2-10 characters"),
];

module.exports = {
  validate,
  registerRules,
  loginRules,
  createPlaylistRules,
  addSongRules,
  likeByUriRules,
  objectIdParam,
  updateProfileRules,
};
