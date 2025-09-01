const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true } // auto adds createdAt & updatedAt
);

module.exports = mongoose.model("Note", noteSchema);
