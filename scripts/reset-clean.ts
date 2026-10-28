import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@hrms.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123456';

async function resetClean() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set');
    process.exit(1);
  }

  try {
    console.log('🔗 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected');

    const db = mongoose.connection.db;
    if (!db) throw new Error('No DB connection');

    console.log('🧹 Purging all existing collections (cleaning test data)...');
    await db.collection('attendances').deleteMany({});
    await db.collection('auditlogs').deleteMany({});
    await db.collection('employees').deleteMany({});
    await db.collection('users').deleteMany({});
    console.log('✅ All existing records purged cleanly.');

    // 1. Seed Clean Admin
    console.log('👤 Seeding System Administrator...');
    const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const adminRes = await db.collection('users').insertOne({
      name: 'System Administrator',
      email: ADMIN_EMAIL.toLowerCase().trim(),
      passwordHash: adminHash,
      role: 'ADMIN',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`✅ Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);

    // 2. Seed Clean Supervisor
    console.log('👤 Seeding Alex Rivera (Supervisor)...');
    const supEmail = 'supervisor@hrms.com';
    const supPassword = 'Supervisor@123456';
    const supHash = await bcrypt.hash(supPassword, 12);
    const supRes = await db.collection('users').insertOne({
      name: 'Alex Rivera',
      email: supEmail,
      passwordHash: supHash,
      role: 'SUPERVISOR',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`✅ Supervisor: ${supEmail} / ${supPassword}`);

    // 3. Seed 5 Clean Workforce Employees assigned to Supervisor
    console.log('👥 Seeding initial workforce roster...');
    const sampleEmployees = [
      {
        employeeCode: 'EMP-0001',
        fullName: 'David Miller',
        email: 'david.miller@company.com',
        phone: '+1-555-0101',
        dateOfBirth: new Date('1992-04-15'),
        gender: 'MALE',
        department: 'Engineering',
        designation: 'Senior Full Stack Engineer',
        joiningDate: new Date('2023-01-10'),
        employmentType: 'FULL_TIME',
        employmentStatus: 'ACTIVE',
        supervisorId: supRes.insertedId,
        workLocation: 'New York HQ (Floor 4)',
        emergencyContactName: 'Clara Miller',
        emergencyContactPhone: '+1-555-0102',
        address: '124 West End Ave, New York, NY',
        notes: 'Team lead for core backend initiatives.',
        createdBy: adminRes.insertedId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        employeeCode: 'EMP-0002',
        fullName: 'Elena Rostova',
        email: 'elena.rostova@company.com',
        phone: '+1-555-0103',
        dateOfBirth: new Date('1995-08-22'),
        gender: 'FEMALE',
        department: 'Engineering',
        designation: 'Frontend Specialist',
        joiningDate: new Date('2023-03-01'),
        employmentType: 'FULL_TIME',
        employmentStatus: 'ACTIVE',
        supervisorId: supRes.insertedId,
        workLocation: 'New York HQ (Floor 4)',
        emergencyContactName: 'Dmitri Rostov',
        emergencyContactPhone: '+1-555-0104',
        address: '450 Lexington Ave, New York, NY',
        notes: 'UI/UX system architect.',
        createdBy: adminRes.insertedId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        employeeCode: 'EMP-0003',
        fullName: 'Marcus Vance',
        email: 'marcus.vance@company.com',
        phone: '+1-555-0105',
        dateOfBirth: new Date('1988-11-05'),
        gender: 'MALE',
        department: 'Engineering',
        designation: 'DevOps & Cloud Architect',
        joiningDate: new Date('2022-06-15'),
        employmentType: 'FULL_TIME',
        employmentStatus: 'ACTIVE',
        supervisorId: supRes.insertedId,
        workLocation: 'Remote (US East)',
        emergencyContactName: 'Sarah Vance',
        emergencyContactPhone: '+1-555-0106',
        address: '88 Pine St, Philadelphia, PA',
        notes: 'Infrastructure and security compliance.',
        createdBy: adminRes.insertedId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        employeeCode: 'EMP-0004',
        fullName: 'Sophia Chen',
        email: 'sophia.chen@company.com',
        phone: '+1-555-0107',
        dateOfBirth: new Date('1996-01-30'),
        gender: 'FEMALE',
        department: 'Product',
        designation: 'Product Designer',
        joiningDate: new Date('2023-09-01'),
        employmentType: 'FULL_TIME',
        employmentStatus: 'ACTIVE',
        supervisorId: supRes.insertedId,
        workLocation: 'New York HQ (Floor 3)',
        emergencyContactName: 'Kevin Chen',
        emergencyContactPhone: '+1-555-0108',
        address: '320 Broadway, New York, NY',
        notes: 'Leading customer journey mapping.',
        createdBy: adminRes.insertedId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        employeeCode: 'EMP-0005',
        fullName: 'Liam Patel',
        email: 'liam.patel@company.com',
        phone: '+1-555-0109',
        dateOfBirth: new Date('1999-07-12'),
        gender: 'MALE',
        department: 'Engineering',
        designation: 'Software Engineering Intern',
        joiningDate: new Date('2024-01-15'),
        employmentType: 'INTERN',
        employmentStatus: 'ACTIVE',
        supervisorId: supRes.insertedId,
        workLocation: 'New York HQ (Floor 4)',
        emergencyContactName: 'Raj Patel',
        emergencyContactPhone: '+1-555-0110',
        address: '55 Water St, Brooklyn, NY',
        notes: 'Full-stack rotational intern.',
        createdBy: adminRes.insertedId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await db.collection('employees').insertMany(sampleEmployees);
    console.log('✅ Seeded 5 active team members assigned to Alex Rivera');

    // 4. Initial Audit Log
    await db.collection('auditlogs').insertOne({
      actor: {
        id: adminRes.insertedId.toString(),
        name: 'System Administrator',
        email: ADMIN_EMAIL,
        role: 'ADMIN',
      },
      action: 'SYSTEM_INITIALIZE',
      entityType: 'SYSTEM',
      entityId: 'SYSTEM_BOOT',
      after: { cleanInit: true, workforceCount: 5 },
      reason: 'Clean system deployment initialization',
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('\n✨ Database reset cleanly with 0 attendance records, ready for fresh production marking!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Reset failed:', err);
    process.exit(1);
  }
}

resetClean();
