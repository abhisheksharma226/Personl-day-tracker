const express = require("express")
const router = express.Router()
const Task = require("../models/Tasks")

// GET all tasks for user
router.get("/:userId", async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.params.userId })
    res.json(tasks)
  } catch (err) {
    res.status(500).json({ message: "Failed to load tasks" })
  }
})

// POST add tasks
router.post("/", async (req, res) => {
  try {
    const { userId, date, tasks } = req.body

    const savedTasks = await Task.insertMany(
      tasks.map((t) => ({
        userId,
        date,
        text: t.text,
        startTime: t.startTime,
        endTime: t.endTime,
      }))
    )

    res.status(201).json(savedTasks)
  } catch (err) {
    res.status(500).json({ message: "Failed to add tasks" })
  }
})

// PATCH toggle task
router.patch("/:id/toggle", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
    task.completed = !task.completed
    await task.save()
    res.json(task)
  } catch (err) {
    res.status(500).json({ message: "Toggle failed" })
  }
})

// PUT update task
router.put("/:id", async (req, res) => {
  try {
    const { text, startTime, endTime } = req.body
    const updated = await Task.findByIdAndUpdate(
      req.params.id,
      { text, startTime, endTime },
      { new: true }
    )
    res.json(updated)
  } catch (err) {
    res.status(500).json({ message: "Update failed" })
  }
})

// DELETE task
router.delete("/:id", async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id)
    res.json({ message: "Task deleted" })
  } catch (err) {
    res.status(500).json({ message: "Delete failed" })
  }
})

module.exports = router
