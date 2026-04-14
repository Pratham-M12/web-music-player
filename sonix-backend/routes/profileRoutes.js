const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { updateProfileRules, validate } = require("../middleware/validators");
const UserProfile = require("../models/UserProfile");
const User = require("../models/User");

const router = express.Router();

// ── GET my profile ──
router.get("/me", authMiddleware, async (req, res, next) => {
    try {
        // Find-or-create: first visit auto-initialises an empty profile
        let profile = await UserProfile.findOne({ userId: req.user.id });

        if (!profile) {
            profile = await UserProfile.create({ userId: req.user.id });
        }

        // Attach the base username/email from the User document so the client
        // only needs one request to paint the full profile page
        const user = await User.findById(req.user.id).select("username email");

        res.json({
            success: true,
            data: {
                username: user.username,
                email: user.email,
                ...profile.toObject(),
            },
        });
    } catch (err) {
        next(err);
    }
});

// ── PUT update my profile ──
router.put("/me", authMiddleware, updateProfileRules, validate, async (req, res, next) => {
    try {
        const { displayName, bio, avatarUrl, preferences } = req.body;

        // Build the update object — only include keys that were actually sent
        const update = {};
        if (displayName !== undefined) update.displayName = displayName;
        if (bio !== undefined) update.bio = bio;
        if (avatarUrl !== undefined) update.avatarUrl = avatarUrl;

        if (preferences !== undefined) {
            // Merge nested preferences rather than overwriting the whole object,
            // so a client that only sends { explicitContent: false } doesn't wipe genres
            if (preferences.genres !== undefined) update["preferences.genres"] = preferences.genres;
            if (preferences.explicitContent !== undefined) update["preferences.explicitContent"] = preferences.explicitContent;
            if (preferences.autoplay !== undefined) update["preferences.autoplay"] = preferences.autoplay;
            if (preferences.language !== undefined) update["preferences.language"] = preferences.language;
        }

        const profile = await UserProfile.findOneAndUpdate(
            { userId: req.user.id },
            { $set: update },
            { new: true, upsert: true, runValidators: true }
        );

        res.json({ success: true, data: profile });
    } catch (err) {
        next(err);
    }
});

// ── DELETE my profile (resets to defaults, does not delete the account) ──
router.delete("/me", authMiddleware, async (req, res, next) => {
    try {
        await UserProfile.findOneAndDelete({ userId: req.user.id });
        res.json({ success: true, message: "Profile reset to defaults" });
    } catch (err) {
        next(err);
    }
});

module.exports = router;