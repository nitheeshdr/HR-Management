import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAttendance extends Document {
  _id: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  attendanceDate: Date;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | 'HOLIDAY' | 'WEEKLY_OFF';
  checkIn?: string;
  checkOut?: string;
  workingMinutes?: number;
  markedBy: mongoose.Types.ObjectId;
  notes?: string;
  isLocked?: boolean;
  lockedAt?: Date;
  lockedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee ID is required'],
    },
    attendanceDate: {
      type: Date,
      required: [true, 'Attendance date is required'],
    },
    status: {
      type: String,
      enum: ['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY', 'WEEKLY_OFF'],
      required: [true, 'Status is required'],
    },
    checkIn: {
      type: String,
      trim: true,
      validate: {
        validator: function (v: string) {
          if (!v) return true;
          return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
        },
        message: 'Check-in time must be in HH:mm format',
      },
    },
    checkOut: {
      type: String,
      trim: true,
      validate: {
        validator: function (v: string) {
          if (!v) return true;
          return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
        },
        message: 'Check-out time must be in HH:mm format',
      },
    },
    workingMinutes: {
      type: Number,
      min: [0, 'Working minutes cannot be negative'],
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Marked by is required'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    lockedAt: {
      type: Date,
    },
    lockedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index: one attendance record per employee per day
AttendanceSchema.index({ employeeId: 1, attendanceDate: 1 }, { unique: true });
AttendanceSchema.index({ attendanceDate: 1 });
AttendanceSchema.index({ markedBy: 1 });
AttendanceSchema.index({ status: 1 });

// Pre-save: calculate working minutes from check-in/check-out
AttendanceSchema.pre('save', function () {
  const doc = this as any;
  if (doc.checkIn && doc.checkOut) {
    const [inH, inM] = doc.checkIn.split(':').map(Number);
    const [outH, outM] = doc.checkOut.split(':').map(Number);
    doc.workingMinutes = (outH * 60 + outM) - (inH * 60 + inM);
  }
});

const Attendance: Model<IAttendance> =
  mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', AttendanceSchema);

export default Attendance;
