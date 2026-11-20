import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEmployee extends Document {
  _id: mongoose.Types.ObjectId;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth?: Date;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  department: string;
  designation: string;
  joiningDate: Date;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
  employmentStatus: 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'RESIGNED' | 'ON_LEAVE';
  supervisorId: mongoose.Types.ObjectId;
  workLocation?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  address?: string;
  notes?: string;
  // --- Akashganga Employee Details Form fields ---
  fatherOrHusbandName?: string;
  maritalStatus?: 'UNMARRIED' | 'MARRIED';
  religion?: string;
  bloodGroup?: string;
  photo?: string; // passport photo as a data URL (image/jpeg or image/png)
  permanentAddress?: string;
  familyMobileNumber?: string;
  educationDetails?: string;
  companyExperience?: string;
  languagesKnown?: string;
  policeVerification?: boolean;
  shoeIssued?: boolean;
  tShirtIssued?: boolean;
  // Office use only
  joiningCompany?: string;
  aadharNo?: string;
  panNo?: string;
  uanNo?: string;
  esicNo?: string;
  bankAccountNo?: string;
  ifscCode?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    employeeCode: {
      type: String,
      required: [true, 'Employee code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [150, 'Full name cannot exceed 150 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      trim: true,
    },
    joiningDate: {
      type: Date,
      required: [true, 'Joining date is required'],
    },
    employmentType: {
      type: String,
      enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'],
      required: [true, 'Employment type is required'],
    },
    employmentStatus: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'TERMINATED', 'RESIGNED', 'ON_LEAVE'],
      default: 'ACTIVE',
    },
    supervisorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Supervisor is required'],
    },
    workLocation: {
      type: String,
      trim: true,
    },
    emergencyContactName: {
      type: String,
      trim: true,
    },
    emergencyContactPhone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    fatherOrHusbandName: { type: String, trim: true },
    maritalStatus: { type: String, enum: ['UNMARRIED', 'MARRIED'] },
    religion: { type: String, trim: true },
    bloodGroup: { type: String, trim: true },
    photo: { type: String },
    permanentAddress: { type: String, trim: true },
    familyMobileNumber: { type: String, trim: true },
    educationDetails: { type: String, trim: true },
    companyExperience: { type: String, trim: true },
    languagesKnown: { type: String, trim: true },
    policeVerification: { type: Boolean },
    shoeIssued: { type: Boolean, default: false },
    tShirtIssued: { type: Boolean, default: false },
    joiningCompany: { type: String, trim: true },
    aadharNo: { type: String, trim: true },
    panNo: { type: String, trim: true, uppercase: true },
    uanNo: { type: String, trim: true },
    esicNo: { type: String, trim: true },
    bankAccountNo: { type: String, trim: true },
    ifscCode: { type: String, trim: true, uppercase: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
EmployeeSchema.index({ employeeCode: 1 }, { unique: true });
EmployeeSchema.index({ email: 1 });
EmployeeSchema.index({ supervisorId: 1 });
EmployeeSchema.index({ createdBy: 1 });
EmployeeSchema.index({ department: 1 });
EmployeeSchema.index({ employmentStatus: 1 });
EmployeeSchema.index({ fullName: 'text', email: 'text', phone: 'text', employeeCode: 'text' });

const Employee: Model<IEmployee> =
  mongoose.models.Employee || mongoose.model<IEmployee>('Employee', EmployeeSchema);

export default Employee;
