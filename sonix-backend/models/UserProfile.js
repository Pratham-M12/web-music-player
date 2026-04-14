const mongoose = require("mongoose");

const VALID_GENRES = [
    "pop", "rock", "hip-hop", "electronic", "jazz",
    "classical", "r&b", "metal", "indie", "folk",
    "latin", "country", "blues", "reggae", "soul",
];

const userProfileSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,   // one profile per user
            index: true,
        },

        // ── Display ──
        displayName: {
            type: String,
            trim: true,
            maxlength: [40, "Display name cannot exceed 40 characters"],
            default: "",
        },
        bio: {
            type: String,
            trim: true,
            maxlength: [200, "Bio cannot exceed 200 characters"],
            default: "",
        },
        avatarUrl: {
            type: String,
            trim: true,
            maxlength: [500, "Avatar URL too long"],
            default: "",
        },

        // ── Listening preferences ──
        preferences: {
            genres: {
                type: [String],
                enum: {
                    values: VALID_GENRES,
                    message: "'{VALUE}' is not a supported genre",
                },
                default: [],
                validate: {
                    validator: (arr) => arr.length <= 5,
                    message: "You can select at most 5 genres",
                },
            },
            explicitContent: {
                type: Boolean,
                default: true,
            },
            autoplay: {
                type: Boolean,
                default: true,
            },
            language: {
                type: String,
                trim: true,
                maxlength: [10, "Language code too long"],
                default: "en",
            },
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("UserProfile", userProfileSchema);
module.exports.VALID_GENRES = VALID_GENRES;