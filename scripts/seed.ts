import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@hrms.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123456';

async function seed() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in environment variables');
    process.exit(1);
  }

  try {
    console.log('🔗 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const usersCol = db.collection('users');
    const employeesCol = db.collection('employees');
    const attendanceCol = db.collection('attendances');
    const onboardingCol = db.collection('onboardings');
    const auditLogsCol = db.collection('auditlogs');

    // 1. Seed Admin
    let adminUser = await usersCol.findOne({ email: ADMIN_EMAIL.toLowerCase() });
    if (!adminUser) {
      console.log('Creating Admin account...');
      const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      const res = await usersCol.insertOne({
        name: 'System Administrator',
        email: ADMIN_EMAIL.toLowerCase().trim(),
        passwordHash: adminHash,
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      adminUser = await usersCol.findOne({ _id: res.insertedId });
      console.log(`✅ Admin created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    } else {
      console.log(`ℹ️ Admin already exists: ${ADMIN_EMAIL}`);
    }

    // 2. Seed Supervisor
    const supEmail = 'supervisor@hrms.com';
    const supPassword = 'Supervisor@123456';
    let supervisorUser = await usersCol.findOne({ email: supEmail });
    if (!supervisorUser) {
      console.log('Creating Supervisor account...');
      const supHash = await bcrypt.hash(supPassword, 12);
      const res = await usersCol.insertOne({
        name: 'Alex Rivera (Supervisor)',
        email: supEmail,
        passwordHash: supHash,
        role: 'SUPERVISOR',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      supervisorUser = await usersCol.findOne({ _id: res.insertedId });
      console.log(`✅ Supervisor created: ${supEmail} / ${supPassword}`);
    } else {
      console.log(`ℹ️ Supervisor already exists: ${supEmail}`);
    }

    // 3. Seed Sample Employees if none exist
    const empCount = await employeesCol.countDocuments();
    if (empCount === 0 && adminUser && supervisorUser) {
      console.log('Seeding initial employees...');
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
          supervisorId: supervisorUser._id,
          workLocation: 'New York HQ (Floor 4)',
          emergencyContactName: 'Clara Miller',
          emergencyContactPhone: '+1-555-0102',
          address: '124 West End Ave, New York, NY',
          notes: 'Team lead for core backend initiatives.',
          createdBy: adminUser._id,
          createdAt: new Date('2023-01-10'),
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
          supervisorId: supervisorUser._id,
          workLocation: 'New York HQ (Floor 4)',
          emergencyContactName: 'Igor Rostov',
          emergencyContactPhone: '+1-555-0104',
          address: '45 Greenpoint Ave, Brooklyn, NY',
          notes: 'Specializes in Next.js & UI design systems.',
          createdBy: adminUser._id,
          createdAt: new Date('2023-03-01'),
          updatedAt: new Date(),
        },
        {
          employeeCode: 'EMP-0003',
          fullName: 'Marcus Vance',
          email: 'marcus.vance@company.com',
          phone: '+1-555-0105',
          dateOfBirth: new Date('1990-11-05'),
          gender: 'MALE',
          department: 'Engineering',
          designation: 'DevOps & Cloud Architect',
          joiningDate: new Date('2023-05-15'),
          employmentType: 'FULL_TIME',
          employmentStatus: 'ACTIVE',
          supervisorId: supervisorUser._id,
          workLocation: 'Remote - Austin, TX',
          emergencyContactName: 'Kelly Vance',
          emergencyContactPhone: '+1-555-0106',
          address: '890 Barton Springs Rd, Austin, TX',
          notes: 'Manages AWS infrastructure and CI/CD pipelines.',
          createdBy: adminUser._id,
          createdAt: new Date('2023-05-15'),
          updatedAt: new Date(),
        },
        {
          employeeCode: 'EMP-0004',
          fullName: 'Sophia Chen',
          email: 'sophia.chen@company.com',
          phone: '+1-555-0107',
          dateOfBirth: new Date('1998-02-14'),
          gender: 'FEMALE',
          department: 'Product',
          designation: 'Product Designer',
          joiningDate: new Date('2024-02-01'),
          employmentType: 'FULL_TIME',
          employmentStatus: 'ACTIVE',
          supervisorId: adminUser._id,
          workLocation: 'San Francisco Office',
          emergencyContactName: 'Grace Chen',
          emergencyContactPhone: '+1-555-0108',
          address: '320 Market St, San Francisco, CA',
          notes: 'Leading customer journey mapping and mobile designs.',
          createdBy: adminUser._id,
          createdAt: new Date('2024-02-01'),
          updatedAt: new Date(),
        },
        {
          employeeCode: 'EMP-0005',
          fullName: 'Liam Patel',
          email: 'liam.patel@company.com',
          phone: '+1-555-0109',
          dateOfBirth: new Date('2001-07-19'),
          gender: 'MALE',
          department: 'Engineering',
          designation: 'Software Engineering Intern',
          joiningDate: new Date(),
          employmentType: 'INTERN',
          employmentStatus: 'ACTIVE',
          supervisorId: supervisorUser._id,
          workLocation: 'New York HQ (Floor 4)',
          emergencyContactName: 'Aarav Patel',
          emergencyContactPhone: '+1-555-0110',
          address: '77 Bleecker St, New York, NY',
          notes: 'Summer intern onboarded for feature development.',
          createdBy: adminUser._id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const inserted = await employeesCol.insertMany(sampleEmployees);
      console.log(`✅ Seeded ${Object.keys(inserted.insertedIds).length} employees`);

      // Seed Onboarding for the new intern
      const internId = inserted.insertedIds[4];
      await onboardingCol.insertOne({
        employeeId: internId,
        status: 'IN_PROGRESS',
        createdBy: adminUser._id,
        assignedSupervisorId: supervisorUser._id,
        notes: 'Complete workstation setup and security training.',
        statusHistory: [
          {
            status: 'IN_PROGRESS',
            changedBy: adminUser._id,
            changedAt: new Date(),
            reason: 'Onboarding initiated',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Seed attendance for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const attendanceRecords = [
        {
          employeeId: inserted.insertedIds[0],
          attendanceDate: today,
          status: 'PRESENT',
          checkIn: '09:00',
          checkOut: '17:30',
          workingMinutes: 510,
          markedBy: supervisorUser._id,
          notes: 'Regular shift',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          employeeId: inserted.insertedIds[1],
          attendanceDate: today,
          status: 'PRESENT',
          checkIn: '09:15',
          checkOut: '18:00',
          workingMinutes: 525,
          markedBy: supervisorUser._id,
          notes: 'Slight delay due to transit',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          employeeId: inserted.insertedIds[2],
          attendanceDate: today,
          status: 'HALF_DAY',
          checkIn: '09:00',
          checkOut: '13:00',
          workingMinutes: 240,
          markedBy: supervisorUser._id,
          notes: 'Medical appointment in afternoon',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          employeeId: inserted.insertedIds[3],
          attendanceDate: today,
          status: 'LEAVE',
          markedBy: adminUser._id,
          notes: 'Approved sick leave',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await attendanceCol.insertMany(attendanceRecords);
      console.log(`✅ Seeded sample attendance records for today`);

      // Seed initial audit log
      await auditLogsCol.insertOne({
        actorId: adminUser._id,
        actorRole: 'ADMIN',
        action: 'SYSTEM_SEED',
        entityType: 'SYSTEM',
        entityId: 'seed',
        after: { sampleCount: 5 },
        reason: 'Initial system provisioning and seed data',
        createdAt: new Date(),
      });
      console.log(`✅ Seeded initial audit log`);
    }

    console.log('🎉 Seeding completed successfully!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
