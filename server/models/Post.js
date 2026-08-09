const mongoose =
  require("mongoose");

const postSchema =
  new mongoose.Schema(
    {
      user: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: true,
      },

      caption: {
        type: String,

        default: "",

        trim: true,
      },

      image: {
        type: String,

        default: "",

        trim: true,
      },


      imageFileId: {
        type: String,

        default: "",

        trim: true,
      },

      likes: [
        {
          type:
            mongoose.Schema.Types
              .ObjectId,

          ref: "User",
        },
      ],

      comments: [
        {
          user: {
            type:
              mongoose.Schema.Types
                .ObjectId,

            ref: "User",
          },

          text: {
            type: String,

            default: "",

            trim: true,
          },

          createdAt: {
            type: Date,

            default: Date.now,
          },
        },
      ],
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "Post",
    postSchema
  );