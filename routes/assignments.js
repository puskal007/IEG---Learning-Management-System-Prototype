const express = require('express');
const { query } = require('../config/database');

const router = express.Router();

// Get All Assignments
router.get('/', async (req, res) => {
  try {
    const assignments = await query(`
      SELECT a.id, a.title, a.course_id, a.type, a.due_date, a.total_points, a.weight, a.status,
             c.name as course_name, c.code
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      WHERE a.status = 'published'
      ORDER BY a.due_date
    `);

    res.json({
      success: true,
      count: assignments.length,
      data: assignments
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Assignments by Course
router.get('/course/:courseId', async (req, res) => {
  try {
    const assignments = await query(`
      SELECT id, title, type, due_date, total_points, weight, status, description
      FROM assignments
      WHERE course_id = ? AND status = 'published'
      ORDER BY due_date
    `, [req.params.courseId]);

    res.json({
      success: true,
      count: assignments.length,
      data: assignments
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Assignment Details
router.get('/:id', async (req, res) => {
  try {
    const assignments = await query(
      'SELECT * FROM assignments WHERE id = ?',
      [req.params.id]
    );

    if (assignments.length === 0) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    res.json({ assignment: assignments[0] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
