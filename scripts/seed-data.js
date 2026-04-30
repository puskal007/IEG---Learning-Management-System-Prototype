const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'iets_lms',
  port: parseInt(process.env.MYSQL_PORT) || 3306,
  waitForConnections: true, connectionLimit: 5
});

const COURSES = [
  { name: 'Introduction to Computer Science', code: 'CS101', credits: 3, semester: 1, department: 'Computer Science', instructor_name: 'Dr. John Smith', instructor_email: 'john.smith@iets.edu' },
  { name: 'Data Structures & Algorithms',     code: 'CS201', credits: 4, semester: 2, department: 'Computer Science', instructor_name: 'Dr. Sarah Johnson', instructor_email: 'sarah.j@iets.edu' },
  { name: 'Web Development',                  code: 'CS301', credits: 3, semester: 3, department: 'Computer Science', instructor_name: 'Prof. Michael Chen', instructor_email: 'michael.chen@iets.edu' },
  { name: 'Database Management',              code: 'CS302', credits: 3, semester: 3, department: 'Computer Science', instructor_name: 'Prof. Emily Davis', instructor_email: 'emily.davis@iets.edu' },
  { name: 'Calculus I',                       code: 'MATH101', credits: 4, semester: 1, department: 'Mathematics', instructor_name: 'Dr. Robert Wilson', instructor_email: 'robert.wilson@iets.edu' },
  { name: 'Linear Algebra',                   code: 'MATH201', credits: 3, semester: 2, department: 'Mathematics', instructor_name: 'Dr. Jennifer Taylor', instructor_email: 'jennifer.taylor@iets.edu' },
  { name: 'Physics I',                        code: 'PHY101', credits: 4, semester: 1, department: 'Physics', instructor_name: 'Dr. Ahmed Hassan', instructor_email: 'ahmed.hassan@iets.edu' },
  { name: 'Technical Communication',          code: 'ENG201', credits: 2, semester: 2, department: 'English', instructor_name: 'Prof. Lisa Brown', instructor_email: 'lisa.brown@iets.edu' },
];

const STUDENTS = [
  { name: 'Ahmed Khan',     email: 'student1@iets.edu' },
  { name: 'Sara Ali',       email: 'student2@iets.edu' },
  { name: 'Omar Sheikh',    email: 'student3@iets.edu' },
  { name: 'Fatima Malik',   email: 'student4@iets.edu' },
  { name: 'Bilal Hussain',  email: 'student5@iets.edu' },
  { name: 'Ayesha Raza',    email: 'student6@iets.edu' },
  { name: 'Usman Baig',     email: 'student7@iets.edu' },
  { name: 'Zara Mirza',     email: 'student8@iets.edu' },
  { name: 'Hassan Butt',    email: 'student9@iets.edu' },
  { name: 'Nadia Nawaz',    email: 'student10@iets.edu' },
  { name: 'Tariq Hashmi',   email: 'student11@iets.edu' },
  { name: 'Hina Shah',      email: 'student12@iets.edu' },
  { name: 'Faisal Rana',    email: 'student13@iets.edu' },
  { name: 'Sana Abbasi',    email: 'student14@iets.edu' },
  { name: 'Imran Aslam',    email: 'student15@iets.edu' },
  { name: 'Rabia Qureshi',  email: 'student16@iets.edu' },
  { name: 'Kamran Akhtar',  email: 'student17@iets.edu' },
  { name: 'Maria Siddiqui', email: 'student18@iets.edu' },
  { name: 'Adeel Chaudhry', email: 'student19@iets.edu' },
  { name: 'Ali Ahmed',      email: 'student20@iets.edu' },
  { name: 'Farah Khan',     email: 'student21@iets.edu' },
  { name: 'Junaid Malik',   email: 'student22@iets.edu' },
  { name: 'Saima Sheikh',   email: 'student23@iets.edu' },
  { name: 'Rizwan Ali',     email: 'student24@iets.edu' },
  { name: 'Mehwish Raza',   email: 'student25@iets.edu' },
];

async function seed() {
  let conn;
  try {
    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║  🎓 IEG LMS — Seeding Database              ║');
    console.log('╚══════════════════════════════════════════════╝\n');
    conn = await pool.getConnection();

    console.log('👤 Creating admin...');
    const adminPwd = await bcrypt.hash('Admin@123', 12);
    await conn.execute('INSERT IGNORE INTO users (name,email,password,role,status,is_verified) VALUES (?,?,?,"admin","active",1)',
      ['Administrator', 'admin@iets.edu', adminPwd]);

    console.log('📚 Creating courses...');
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 15).toISOString().slice(0,10);
    const end   = new Date(today.getFullYear(), 5, 30).toISOString().slice(0,10);
    const courseIds = [];
    for (const c of COURSES) {
      const [ex] = await conn.execute('SELECT id FROM courses WHERE code=?', [c.code]);
      if (ex.length) { courseIds.push(ex[0].id); continue; }
      const [r] = await conn.execute(
        'INSERT INTO courses (name,code,credits,semester,department,instructor_name,instructor_email,max_students,start_date,end_date) VALUES (?,?,?,?,?,?,?,60,?,?)',
        [c.name, c.code, c.credits, c.semester, c.department, c.instructor_name, c.instructor_email, start, end]
      );
      courseIds.push(r.insertId);
    }
    console.log(`   ✅ ${courseIds.length} courses`);

    console.log('👩‍🏫 Creating teachers...');
    const teacherPwd = await bcrypt.hash('Teacher@123', 12);
    const teachers = [
      { name: 'Dr. John Smith',    email: 'teacher1@iets.edu', dept: 'Computer Science', spec: 'Programming & Algorithms' },
      { name: 'Prof. Emily Davis', email: 'teacher2@iets.edu', dept: 'Computer Science', spec: 'Database Systems' },
      { name: 'Dr. Robert Wilson', email: 'teacher3@iets.edu', dept: 'Mathematics',       spec: 'Calculus & Linear Algebra' },
    ];
    const teacherIds = [];
    for (const t of teachers) {
      const [ex] = await conn.execute('SELECT id FROM users WHERE email=?', [t.email]);
      let uid;
      if (ex.length) { uid = ex[0].id; } else {
        const [r] = await conn.execute('INSERT INTO users (name,email,password,role,status,is_verified) VALUES (?,?,?,"teacher","active",1)',
          [t.name, t.email, teacherPwd]);
        uid = r.insertId;
      }
      const empId = `TCH${String(uid).padStart(4,'0')}`;
      const [et] = await conn.execute('SELECT id FROM teachers WHERE user_id=?', [uid]);
      let tid;
      if (et.length) { tid = et[0].id; } else {
        const [r] = await conn.execute('INSERT INTO teachers (user_id,employee_id,department,specialization) VALUES (?,?,?,?)',
          [uid, empId, t.dept, t.spec]);
        tid = r.insertId;
      }
      teacherIds.push(tid);
    }
    console.log(`   ✅ ${teacherIds.length} teachers (pass: Teacher@123)`);

    console.log('📋 Assigning courses to teachers...');
    const assignments_tc = [
      [teacherIds[0], courseIds[0]], [teacherIds[0], courseIds[1]], [teacherIds[0], courseIds[2]],
      [teacherIds[1], courseIds[3]], [teacherIds[1], courseIds[7]],
      [teacherIds[2], courseIds[4]], [teacherIds[2], courseIds[5]], [teacherIds[2], courseIds[6]],
    ];
    for (const [tid, cid] of assignments_tc) {
      await conn.execute('INSERT IGNORE INTO teacher_courses (teacher_id,course_id) VALUES (?,?)', [tid, cid]);
    }
    console.log(`   ✅ ${assignments_tc.length} assignments`);

    console.log('👥 Creating 25 students...');
    const studentPwd = await bcrypt.hash('Student@123', 12);
    const studentIds = [];
    for (let i = 0; i < STUDENTS.length; i++) {
      const { name, email } = STUDENTS[i];
      const semester = (i % 6) + 1;
      const [ex] = await conn.execute('SELECT id FROM users WHERE email=?', [email]);
      let uid;
      if (ex.length) { uid = ex[0].id; } else {
        const [r] = await conn.execute('INSERT INTO users (name,email,password,role,status,is_verified) VALUES (?,?,?,"student","active",1)',
          [name, email, studentPwd]);
        uid = r.insertId;
      }
      const roll = `IEG${String(uid).padStart(5,'0')}`;
      const [es] = await conn.execute('SELECT id FROM students WHERE user_id=?', [uid]);
      let sid;
      if (es.length) { sid = es[0].id; } else {
        const gpa = (Math.random() * 2 + 2).toFixed(2);
        const [r] = await conn.execute('INSERT INTO students (user_id,roll_number,semester,batch,gpa) VALUES (?,?,?,?,?)',
          [uid, roll, semester, '2024-2028', gpa]);
        sid = r.insertId;
      }
      studentIds.push({ id: sid, semester });
    }
    console.log(`   ✅ 25 students (pass: Student@123)`);

    console.log('📋 Enrolling students...');
    let enrollCount = 0;
    for (const { id: sid, semester } of studentIds) {
      const eligible = courseIds.filter((_, idx) => (COURSES[idx]?.semester || 1) <= semester);
      for (const cid of eligible.slice(0, 4)) {
        try {
          await conn.execute('INSERT IGNORE INTO enrollments (student_id,course_id) VALUES (?,?)', [sid, cid]);
          enrollCount++;
        } catch(e) {}
      }
    }
    for (const cid of courseIds) {
      const [cnt] = await conn.execute('SELECT COUNT(*) as c FROM enrollments WHERE course_id=? AND status="active"', [cid]);
      await conn.execute('UPDATE courses SET current_enrollment=? WHERE id=?', [cnt[0].c, cid]);
    }
    console.log(`   ✅ ${enrollCount} enrollments`);

    console.log('📝 Creating assignments...');
    const aTemplates = [
      { title: 'Assignment 1 – Fundamentals', type: 'homework', points: 100, days: 14 },
      { title: 'Midterm Project',             type: 'project',  points: 150, days: 30 },
      { title: 'Quiz 1',                      type: 'quiz',     points: 50,  days: 7  },
    ];
    const aIds = [];
    for (const cid of courseIds.slice(0, 5)) {
      for (const t of aTemplates) {
        const due = new Date(Date.now() + t.days * 86400000).toISOString().slice(0,19).replace('T',' ');
        const [r] = await conn.execute(
          'INSERT INTO assignments (course_id,title,type,total_points,weight,due_date,status,created_by) VALUES (?,?,?,?,10,?,"published","System")',
          [cid, t.title, t.type, t.points, due]
        );
        aIds.push({ id: r.insertId, cid, points: t.points });
      }
    }
    console.log(`   ✅ ${aIds.length} assignments`);

    console.log('🎯 Adding sample grades...');
    let gCount = 0;
    const scores = [95,88,79,92,65,84,73,91,57,87];
    for (const { id: sid } of studentIds.slice(0, 12)) {
      for (let i = 0; i < Math.min(3, aIds.length); i++) {
        const { id: aid, cid, points } = aIds[i];
        const [enrolled] = await conn.execute('SELECT id FROM enrollments WHERE student_id=? AND course_id=?', [sid, cid]);
        if (!enrolled.length) continue;
        const s = Math.round(points * scores[(sid + i) % scores.length] / 100);
        const pct = Math.round((s / points) * 100);
        const letter = pct>=90?'A':pct>=80?'B':pct>=70?'C':pct>=60?'D':'F';
        try {
          await conn.execute(
            'INSERT IGNORE INTO grades (student_id,course_id,assignment_id,score,max_score,percentage,letter_grade,graded_at) VALUES (?,?,?,?,?,?,?,NOW())',
            [sid, cid, aid, s, points, pct, letter]
          );
          gCount++;
        } catch(e) {}
      }
    }
    console.log(`   ✅ ${gCount} grades`);

    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║  ✅ Seeding complete!                        ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log('║  Admin:   admin@iets.edu    / Admin@123      ║');
    console.log('║  Teacher: teacher1@iets.edu / Teacher@123    ║');
    console.log('║  Student: student1@iets.edu / Student@123    ║');
    console.log('╚══════════════════════════════════════════════╝\n');

    conn.release();
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    if (conn) conn.release();
    await pool.end();
    process.exit(1);
  }
}

seed();