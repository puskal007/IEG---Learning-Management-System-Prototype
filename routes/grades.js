const express = require('express');
const { query } = require('../config/database');

const router = express.Router();

// Get Grades for Student
router.get('/student/:studentId', async (req, res) => {
  try {
    const grades = await query(`
      SELECT g.id, g.score, g.percentage, g.letter_grade, c.name as course_name, c.code
      FROM grades g
      JOIN courses c ON g.course_id = c.id
      WHERE g.student_id = ?
      ORDER BY c.code
    `, [req.params.studentId]);

    res.json({
      success: true,
      count: grades.length,
      grades
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Grades for Course
router.get('/course/:courseId', async (req, res) => {
  try {
    const grades = await query(`
      SELECT g.id, g.score, g.percentage, g.letter_grade, u.name as student_name, s.roll_number
      FROM grades g
      JOIN students s ON g.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE g.course_id = ?
      ORDER BY u.name
    `, [req.params.courseId]);

    res.json({
      success: true,
      count: grades.length,
      grades
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
