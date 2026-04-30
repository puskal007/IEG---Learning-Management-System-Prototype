const express = require('express');
const { query } = require('../config/database');

const router = express.Router();

// Get All Courses
router.get('/', async (req, res) => {
  try {
    const courses = await query(`
      SELECT id, name, code, credits, semester, department, instructor_name, 
             instructor_email, current_enrollment, max_students, status
      FROM courses
      WHERE status = 'active'
      ORDER BY semester, code
    `);

    res.json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Course by ID
router.get('/:id', async (req, res) => {
  try {
    const courses = await query(
      'SELECT * FROM courses WHERE id = ?',
      [req.params.id]
    );

    if (courses.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const course = courses[0];

    // Get enrolled students
    const students = await query(`
      SELECT u.id, u.name, u.email, s.roll_number
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE e.course_id = ? AND e.status = 'active'
    `, [req.params.id]);

    // Get assignments
    const assignments = await query(
      'SELECT id, title, due_date FROM assignments WHERE course_id = ? ORDER BY due_date',
      [req.params.id]
    );

    res.json({
      course: {
        ...course,
        students,
        assignments
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Enrollment Stats
router.get('/:id/stats', async (req, res) => {
  try {
    const courses = await query(
      'SELECT id, name, current_enrollment, max_students FROM courses WHERE id = ?',
      [req.params.id]
    );

    if (courses.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const course = courses[0];
    const occupancyRate = ((course.current_enrollment / course.max_students) * 100).toFixed(2);

    res.json({
      courseId: course.id,
      courseName: course.name,
      enrolled: course.current_enrollment,
      maxCapacity: course.max_students,
      occupancyRate: occupancyRate + '%',
      availableSeats: course.max_students - course.current_enrollment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
