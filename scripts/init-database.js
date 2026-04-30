const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  port: parseInt(process.env.MYSQL_PORT) || 3306,
  waitForConnections: true, connectionLimit: 5, multipleStatements: true
});

async function init() {
  let conn;
  try {
    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║  🎓 IEG LMS — Database Initialization       ║');
    console.log('╚══════════════════════════════════════════════╝\n');

    conn = await pool.getConnection();
    const db = process.env.MYSQL_DATABASE || 'iets_lms';

    console.log(`📊 Creating database "${db}"...`);
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${db}\``);
    console.log('✅ Database ready\n');

    console.log('🔄 Dropping old tables...');
    await conn.query('SET FOREIGN_KEY_CHECKS=0');
    for (const t of ['grades','assignments','teacher_courses','enrollments','attendance','teachers','students','courses','users'])
      await conn.query(`DROP TABLE IF EXISTS \`${t}\``);
    await conn.query('SET FOREIGN_KEY_CHECKS=1');
    console.log('✅ Done\n');

    console.log('📝 Creating tables...');
    await conn.query(`
      CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('student','teacher','admin') DEFAULT 'student',
        phone VARCHAR(20), address VARCHAR(255), city VARCHAR(50), country VARCHAR(50),
        status ENUM('active','inactive','suspended') DEFAULT 'active',
        is_verified TINYINT(1) DEFAULT 0,
        last_login DATETIME, login_count INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_email (email),
        INDEX idx_role (role), INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        roll_number VARCHAR(50) NOT NULL,
        semester INT DEFAULT 1, batch VARCHAR(20), section VARCHAR(10),
        gpa DECIMAL(3,2) DEFAULT 0.00,
        enrollment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_id (user_id), UNIQUE KEY uq_roll (roll_number),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_semester (semester)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE teachers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        employee_id VARCHAR(50) NOT NULL,
        department VARCHAR(100),
        specialization VARCHAR(150),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_id (user_id), UNIQUE KEY uq_emp (employee_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        code VARCHAR(20) NOT NULL,
        description TEXT,
        credits INT DEFAULT 3, semester INT DEFAULT 1,
        department VARCHAR(100),
        instructor_id INT, instructor_name VARCHAR(100), instructor_email VARCHAR(100), instructor_phone VARCHAR(20),
        max_students INT DEFAULT 60, current_enrollment INT DEFAULT 0,
        status ENUM('active','archived','draft') DEFAULT 'active',
        start_date DATE, end_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_code (code),
        INDEX idx_status (status), INDEX idx_semester (semester)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE teacher_courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        teacher_id INT NOT NULL, course_id INT NOT NULL,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_tc (teacher_id, course_id),
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE enrollments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL, course_id INT NOT NULL,
        status ENUM('active','completed','dropped') DEFAULT 'active',
        enrollment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_enrollment (student_id, course_id),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        INDEX idx_student_id (student_id), INDEX idx_course_id (course_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT, instructions TEXT,
        type ENUM('homework','project','essay','quiz','presentation','exam') DEFAULT 'homework',
        total_points INT DEFAULT 100, weight INT DEFAULT 5,
        due_date DATETIME NOT NULL,
        allow_late_submission TINYINT(1) DEFAULT 1, late_penalty_percent INT DEFAULT 5,
        status ENUM('draft','published','closed') DEFAULT 'published',
        created_by VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        INDEX idx_course_id (course_id), INDEX idx_due_date (due_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE grades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL, course_id INT NOT NULL, assignment_id INT,
        score INT DEFAULT 0, max_score INT DEFAULT 100, percentage INT DEFAULT 0,
        letter_grade CHAR(2), feedback TEXT, graded_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE SET NULL,
        INDEX idx_student_course (student_id, course_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ All tables created!\n');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  Tables: users, students, teachers, courses  ║');
    console.log('║          teacher_courses, enrollments,        ║');
    console.log('║          assignments, grades                  ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log('║  Next: npm run seed                          ║');
    console.log('╚══════════════════════════════════════════════╝\n');

    conn.release();
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Init failed:', err.message);
    if (conn) conn.release();
    await pool.end();
    process.exit(1);
  }
}

init();