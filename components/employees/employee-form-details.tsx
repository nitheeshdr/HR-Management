'use client';

import { useRef, useState } from 'react';
import { Camera, FileDown, Loader2, MapPin, ShieldCheck, Trash2, User, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Fields from the "AKASHGANGA Employee Details Form" PDF that are not part of the core
 * employee record (name, phone, DOB, gender, designation, joining date live in the main form).
 */
export interface EmployeeFormDetails {
  fatherOrHusbandName: string;
  maritalStatus: '' | 'UNMARRIED' | 'MARRIED';
  religion: string;
  bloodGroup: string;
  photo: string;
  address: string; // present address
  permanentAddress: string;
  familyMobileNumber: string;
  educationDetails: string;
  companyExperience: string;
  languagesKnown: string;
  policeVerification: '' | 'YES' | 'NO';
  shoeIssued: boolean;
  tShirtIssued: boolean;
  joiningCompany: string;
  aadharNo: string;
  panNo: string;
  uanNo: string;
  esicNo: string;
  bankAccountNo: string;
  ifscCode: string;
}

export const emptyEmployeeFormDetails: EmployeeFormDetails = {
  fatherOrHusbandName: '',
  maritalStatus: '',
  religion: '',
  bloodGroup: '',
  photo: '',
  address: '',
  permanentAddress: '',
  familyMobileNumber: '',
  educationDetails: '',
  companyExperience: '',
  languagesKnown: '',
  policeVerification: '',
  shoeIssued: false,
  tShirtIssued: false,
  joiningCompany: '',
  aadharNo: '',
  panNo: '',
  uanNo: '',
  esicNo: '',
  bankAccountNo: '',
  ifscCode: '',
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export function employeeFormDetailsFromRecord(emp: any): EmployeeFormDetails {
  return {
    fatherOrHusbandName: emp?.fatherOrHusbandName || '',
    maritalStatus: emp?.maritalStatus || '',
    religion: emp?.religion || '',
    bloodGroup: emp?.bloodGroup || '',
    photo: emp?.photo || '',
    address: emp?.address || '',
    permanentAddress: emp?.permanentAddress || '',
    familyMobileNumber: emp?.familyMobileNumber || emp?.emergencyContactPhone || '',
    educationDetails: emp?.educationDetails || '',
    companyExperience: emp?.companyExperience || '',
    languagesKnown: emp?.languagesKnown || '',
    policeVerification:
      emp?.policeVerification === true ? 'YES' : emp?.policeVerification === false ? 'NO' : '',
    shoeIssued: !!emp?.shoeIssued,
    tShirtIssued: !!emp?.tShirtIssued,
    joiningCompany: emp?.joiningCompany || '',
    aadharNo: emp?.aadharNo || '',
    panNo: emp?.panNo || '',
    uanNo: emp?.uanNo || '',
    esicNo: emp?.esicNo || '',
    bankAccountNo: emp?.bankAccountNo || '',
    ifscCode: emp?.ifscCode || '',
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Convert UI state to the API payload shape. */
export function employeeFormDetailsToPayload(d: EmployeeFormDetails) {
  return {
    ...d,
    policeVerification:
      d.policeVerification === 'YES' ? true : d.policeVerification === 'NO' ? false : undefined,
  };
}

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const inputClass =
  'w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelClass = 'block text-xs font-semibold text-slate-700 mb-1';

/** Resize an uploaded image to a passport-sized JPEG data URL (keeps DB documents small). */
async function resizePhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read image'));
      el.src = url;
    });
    const maxW = 360;
    const maxH = 480;
    const scale = Math.min(1, maxW / img.width, maxH / img.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof User;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
      <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
        <Icon className="size-4 text-blue-600" />
        {title}
      </h3>
      {children}
    </div>
  );
}

export function EmployeeFormDetailsFields({
  value,
  onChange,
}: {
  value: EmployeeFormDetails;
  onChange: (next: EmployeeFormDetails) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [sameAsPresent, setSameAsPresent] = useState(
    !!value.address && value.address === value.permanentAddress
  );

  const set = <K extends keyof EmployeeFormDetails>(key: K, v: EmployeeFormDetails[K]) => {
    const next = { ...value, [key]: v };
    if (sameAsPresent && key === 'address') next.permanentAddress = v as string;
    onChange(next);
  };

  const text = (key: keyof EmployeeFormDetails) => ({
    name: key,
    value: value[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      set(key, e.target.value as never),
  });

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    try {
      set('photo', await resizePhoto(file));
    } catch {
      toast.error('Could not process this photo');
    }
  };

  return (
    <>
      <Section icon={User} title="Employee Details Form (as per Aadhar card)">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass}>Father Name / Husband Name</label>
              <input type="text" {...text('fatherOrHusbandName')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Marital Status</label>
              <select {...text('maritalStatus')} className={inputClass}>
                <option value="">Select</option>
                <option value="UNMARRIED">Unmarried</option>
                <option value="MARRIED">Married</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Religion</label>
              <input type="text" {...text('religion')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Blood Group</label>
              <select {...text('bloodGroup')} className={inputClass}>
                <option value="">Select</option>
                {BLOOD_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Passport photo */}
          <div className="flex flex-col items-center gap-2">
            <span className={labelClass}>Passport Size Photo</span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-28 h-36 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 overflow-hidden flex items-center justify-center"
            >
              {value.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={value.photo} alt="Employee photo" className="w-full h-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-1 text-[11px] text-slate-500">
                  <Camera className="size-5" />
                  Upload
                </span>
              )}
            </button>
            {value.photo && (
              <button
                type="button"
                onClick={() => set('photo', '')}
                className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:underline"
              >
                <Trash2 className="size-3" /> Remove
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="user"
              onChange={handlePhoto}
              className="hidden"
            />
          </div>
        </div>
      </Section>

      <Section icon={MapPin} title="Communication Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              Present Address <span className="text-rose-500">*</span>
            </label>
            <textarea rows={3} required {...text('address')} className={inputClass} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Permanent Address <span className="text-rose-500">*</span>
              </label>
              <label className="flex items-center gap-1.5 text-[11px] text-slate-600">
                <input
                  type="checkbox"
                  checked={sameAsPresent}
                  onChange={(e) => {
                    setSameAsPresent(e.target.checked);
                    if (e.target.checked) onChange({ ...value, permanentAddress: value.address });
                  }}
                />
                Same as present
              </label>
            </div>
            <textarea
              rows={3}
              required
              disabled={sameAsPresent}
              {...text('permanentAddress')}
              className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-500`}
            />
          </div>
          <div>
            <label className={labelClass}>Family Mobile Number</label>
            <input type="tel" {...text('familyMobileNumber')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Education Details</label>
            <input type="text" {...text('educationDetails')} placeholder="e.g. SSC / Intermediate / Degree" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Company &amp; Experience</label>
            <input type="text" {...text('companyExperience')} placeholder="e.g. ABC Security – 2 years" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Languages Known</label>
            <input type="text" {...text('languagesKnown')} placeholder="e.g. Telugu, Tamil, Hindi" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>
              Police Verification <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-4 py-2 text-xs">
              {(['YES', 'NO'] as const).map((opt) => (
                <label key={opt} className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="policeVerification"
                    required
                    checked={value.policeVerification === opt}
                    onChange={() => set('policeVerification', opt)}
                  />
                  {opt === 'YES' ? 'Yes' : 'No'}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>Uniform Issued</label>
            <div className="flex items-center gap-4 py-2 text-xs">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={value.shoeIssued} onChange={(e) => set('shoeIssued', e.target.checked)} />
                Shoe
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={value.tShirtIssued} onChange={(e) => set('tShirtIssued', e.target.checked)} />
                T-Shirt
              </label>
            </div>
          </div>
        </div>
      </Section>

      <Section icon={ShieldCheck} title="For Office Use Only">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Joining Company</label>
            <input type="text" {...text('joiningCompany')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Aadhar No</label>
            <input type="text" inputMode="numeric" maxLength={14} {...text('aadharNo')} placeholder="1234 5678 9012" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>PAN No</label>
            <input type="text" maxLength={10} {...text('panNo')} placeholder="ABCDE1234F" className={`${inputClass} uppercase`} />
          </div>
          <div>
            <label className={labelClass}>UAN No</label>
            <input type="text" inputMode="numeric" {...text('uanNo')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>ESIC No</label>
            <input type="text" inputMode="numeric" {...text('esicNo')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Bank Account No</label>
            <input type="text" inputMode="numeric" {...text('bankAccountNo')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>IFSC Code</label>
            <input type="text" maxLength={11} {...text('ifscCode')} placeholder="SBIN0001234" className={`${inputClass} uppercase`} />
          </div>
        </div>
      </Section>
    </>
  );
}

/** Trigger a browser download of the filled employee details PDF. */
export async function downloadEmployeeForm(employeeId: string) {
  const res = await fetch(`/api/employees/${employeeId}/form-pdf`);
  if (!res.ok) {
    let message = 'Failed to generate the employee form';
    try {
      message = (await res.json()).error || message;
    } catch {}
    throw new Error(message);
  }
  const disposition = res.headers.get('Content-Disposition') || '';
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] || 'Employee_Details_Form.pdf';
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DownloadEmployeeFormButton({
  employeeId,
  className,
}: {
  employeeId: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await downloadEmployeeForm(employeeId);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Download failed');
        } finally {
          setBusy(false);
        }
      }}
      className={
        className ??
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs'
      }
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />}
      <span className="hidden sm:inline">Download Form PDF</span>
      <span className="sm:hidden">PDF</span>
    </button>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Read-only summary of the form fields, for employee profile pages. */
export function EmployeeFormDetailsView({ employee }: { employee: any }) {
  const d = employeeFormDetailsFromRecord(employee);
  const rows: Array<[string, string]> = [
    ['Father / Husband Name', d.fatherOrHusbandName],
    ['Marital Status', d.maritalStatus === 'MARRIED' ? 'Married' : d.maritalStatus === 'UNMARRIED' ? 'Unmarried' : ''],
    ['Religion', d.religion],
    ['Blood Group', d.bloodGroup],
    ['Present Address', d.address],
    ['Permanent Address', d.permanentAddress],
    ['Family Mobile', d.familyMobileNumber],
    ['Education', d.educationDetails],
    ['Company & Experience', d.companyExperience],
    ['Languages Known', d.languagesKnown],
    ['Police Verification', d.policeVerification === 'YES' ? 'Yes' : d.policeVerification === 'NO' ? 'No' : ''],
    ['Uniform Issued', [d.shoeIssued && 'Shoe', d.tShirtIssued && 'T-Shirt'].filter(Boolean).join(', ')],
    ['Joining Company', d.joiningCompany],
    ['Aadhar No', d.aadharNo],
    ['PAN No', d.panNo],
    ['UAN No', d.uanNo],
    ['ESIC No', d.esicNo],
    ['Bank Account No', d.bankAccountNo],
    ['IFSC Code', d.ifscCode],
  ];

  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 gap-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Briefcase className="size-4 text-blue-600" />
          Employee Details Form
        </h3>
        <DownloadEmployeeFormButton employeeId={employee._id} />
      </div>
      <div className="flex flex-col sm:flex-row gap-5">
        <div className="w-24 h-32 shrink-0 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center text-[11px] text-slate-400">
          {d.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.photo} alt={`${employee.fullName} photo`} className="w-full h-full object-cover" />
          ) : (
            'No photo'
          )}
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs flex-1 min-w-0">
          {rows.map(([label, val]) => (
            <div key={label} className="min-w-0">
              <dt className="text-slate-500">{label}</dt>
              <dd className="font-semibold text-slate-800 break-words">{val || '—'}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */
