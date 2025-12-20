const mongoose = require("mongoose")

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    startTime: String,
    endTime: String,
  },
  { timestamps: true }
)

module.exports = mongoose.model("Task", taskSchema)
