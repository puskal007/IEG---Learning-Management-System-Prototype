const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const jwt = require('jsonwebtoken');

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// ============================================
// MAIN DASHBOARD
// ============================================
router.get('/', authenticateToken, async (req, res) => {
    try {
        console.log('Dashboard requested by:', req.user);
        
        // For admin - return all stats
        if (req.user.role === 'admin') {
            // Get counts
            const totalStudents = await query('SELECT COUNT(*) as count FROM students');
            const totalCourses = await query('SELECT COUNT(*) as count FROM courses WHERE status = "active"');
            const totalAssignments = await query('SELECT COUNT(*) as count FROM assignments');
            const activeStudents = await query(`
                SELECT COUNT(*) as count 
                FROM students s 
                JOIN users u ON s.user_id = u.id 
                WHERE u.status = 'active'
            `);
            
            // Get recent courses
            const recentCourses = await query(`
                SELECT c.*, COUNT(e.id) as enrolled_count
                FROM courses c
                LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
                WHERE c.status = 'active'
                GROUP BY c.id
                LIMIT 5
            `);
            
            return res.json({
                success: true,
                role: 'admin',
                data: {
                    stats: {
                        total_students: totalStudents[0]?.count || 0,
                        total_courses: totalCourses[0]?.count || 0,
                        total_assignments: totalAssignments[0]?.count || 0,
                        active_students: activeStudents[0]?.count || 0
                    },
                    recent_courses: recentCourses
                }
            });
        }
        
        // For student - return personal data
        if (req.user.role === 'student') {
            const studentRows = await query(
                'SELECT id FROM students WHERE user_id = ?',
                [req.user.id]
            );
            
            if (!studentRows || studentRows.length === 0) {
                return res.json({
                    success: true,
                    role: 'student',
                    data: {
                        stats: {
                            enrolled_courses: 0,
                            total_assignments: 0,
                            completed_assignments: 0,
                            pending_assignments: 0,
                            overall_gpa: 0
                        },
                        courses: []
                    }
                });
            }
            
            const studentId = studentRows[0].id;
            
            const courses = await query(`
                SELECT c.id, c.code, c.name, c.credits, c.instructor_name
                FROM courses c
                JOIN enrollments e ON c.id = e.course_id
                WHERE e.student_id = ? AND e.status = 'active'
            `, [studentId]);
            
            const studentInfo = await query(`
                SELECT u.name, s.roll_number, s.semester
                FROM users u
                JOIN students s ON u.id = s.user_id
                WHERE s.id = ?
            `, [studentId]);
            
            return res.json({
                success: true,
                role: 'student',
                data: {
                    student: studentInfo[0] || null,
                    stats: {
                        enrolled_courses: courses.length,
                        overall_gpa: 3.5
                    },
                    courses: courses
                }
            });
        }
        
        res.status(403).json({ message: 'Invalid role' });
        
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// GET STUDENTS LIST
// ============================================
router.get('/students', authenticateToken, async (req, res) => {
    try {
        console.log('Students list requested by:', req.user.role);
        
        // Only admin can see all students
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        
        const students = await query(`
            SELECT s.id, s.roll_number, u.name, u.email, u.phone, u.status
            FROM students s
            JOIN users u ON s.user_id = u.id
            ORDER BY s.id
            LIMIT 100
        `);
        
        console.log(`Found ${students.length} students`);
        
        res.json({ 
            success: true, 
            data: students 
        });
    } catch (error) {
        console.error('Students error:', error);
        res.status(500).json({ message: error.message });
    }
});

// ============================================
// GET COURSES LIST
// ============================================
router.get('/courses', authenticateToken, async (req, res) => {
    try {
        console.log('Courses list requested by:', req.user.role);
        
        let courses;
        
        if (req.user.role === 'admin') {
            // Admin sees all courses with enrollment counts
            courses = await query(`
                SELECT c.*, COUNT(e.id) as current_enrollment
                FROM courses c
                LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
                WHERE c.status = 'active'
                GROUP BY c.id
                ORDER BY c.id
            `);
        } else {
            // Student sees only their enrolled courses
            const studentRows = await query(
                'SELECT id FROM students WHERE user_id = ?',
                [req.user.id]
            );
            
            if (studentRows && studentRows[0]) {
                courses = await query(`
                    SELECT c.*, e.status as enrollment_status
                    FROM courses c
                    JOIN enrollments e ON c.id = e.course_id
                    WHERE e.student_id = ? AND e.status = 'active'
                `, [studentRows[0].id]);
            } else {
                courses = [];
            }
        }
        
        console.log(`Found ${courses.length} courses`);
        
        res.json({ 
            success: true, 
            data: courses 
        });
    } catch (error) {
        console.error('Courses error:', error);
        res.status(500).json({ message: error.message });
    }
});

// ============================================
// GET SINGLE COURSE DETAILS
// ============================================
router.get('/courses/:id', authenticateToken, async (req, res) => {
    try {
        const courseId = req.params.id;
        
        const course = await query(`
            SELECT c.*, COUNT(e.id) as current_enrollment
            FROM courses c
            LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
            WHERE c.id = ?
            GROUP BY c.id
        `, [courseId]);
        
        if (course.length === 0) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        res.json({ 
            success: true, 
            data: course[0] 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============================================
// GET ASSIGNMENTS
// ============================================
router.get('/assignments', authenticateToken, async (req, res) => {
    try {
        let assignments;
        
        if (req.user.role === 'admin') {
            assignments = await query(`
                SELECT a.*, c.name as course_name
                FROM assignments a
                JOIN courses c ON a.course_id = c.id
                ORDER BY a.due_date DESC
                LIMIT 50
            `);
        } else {
            const studentRows = await query(
                'SELECT id FROM students WHERE user_id = ?',
                [req.user.id]
            );
            
            if (studentRows && studentRows[0]) {
                assignments = await query(`
                    SELECT a.*, c.name as course_name,
                           g.score, g.percentage, g.letter_grade
                    FROM assignments a
                    JOIN courses c ON a.course_id = c.id
                    JOIN enrollments e ON c.id = e.course_id
                    LEFT JOIN grades g ON a.id = g.assignment_id AND g.student_id = ?
                    WHERE e.student_id = ? AND e.status = 'active'
                    ORDER BY a.due_date DESC
                `, [studentRows[0].id, studentRows[0].id]);
            } else {
                assignments = [];
            }
        }
        
        res.json({ 
            success: true, 
            data: assignments 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;