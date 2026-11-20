import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

/**
 * Fills the "AKASHGANGA Employee Details Form" template with an employee's data.
 *
 * The template is a flat, single-page A4 scan (no AcroForm fields), so values are drawn
 * as text on top of the image. Coordinates below were measured on a 150-DPI render of the
 * template (1240 x 1754 px) and converted to PDF points by `pt()`.
 */

const TEMPLATE_PATH = path.join(process.cwd(), 'assets', 'employee-form-template.pdf');

const PX_TO_PT = 72 / 150;
const PAGE_HEIGHT = 841.89;
const INK = rgb(0.04, 0.09, 0.32);

export interface EmployeeFormData {
  employeeCode?: string;
  designation?: string;
  fullName?: string;
  fatherOrHusbandName?: string;
  dateOfBirth?: Date | string | null;
  gender?: string;
  maritalStatus?: string;
  religion?: string;
  bloodGroup?: string;
  photo?: string;
  address?: string;
  permanentAddress?: string;
  phone?: string;
  familyMobileNumber?: string;
  emergencyContactPhone?: string;
  educationDetails?: string;
  policeVerification?: boolean;
  companyExperience?: string;
  shoeIssued?: boolean;
  tShirtIssued?: boolean;
  languagesKnown?: string;
  createdAt?: Date | string | null;
  joiningCompany?: string;
  joiningDate?: Date | string | null;
  aadharNo?: string;
  panNo?: string;
  uanNo?: string;
  esicNo?: string;
  bankAccountNo?: string;
  ifscCode?: string;
}

/** Convert a template pixel x / baseline y to PDF points. */
function pt(px: number, py: number) {
  return { x: px * PX_TO_PT, y: PAGE_HEIGHT - py * PX_TO_PT };
}

/** Standard fonts are WinAnsi-only; drop characters they cannot encode. */
function clean(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\x20-\x7E -ÿ]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const tz = process.env.BUSINESS_TIMEZONE || 'Asia/Kolkata';
  // en-GB gives DD/MM/YYYY
  return d.toLocaleDateString('en-GB', { timeZone: tz });
}

function ageFrom(dob: Date | string | null | undefined): string {
  if (!dob) return '';
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return '';
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age >= 0 ? `${age} Years` : '';
}

/** Draw a single line of text, shrinking the font so it fits `widthPx`, then truncating. */
function drawFitted(
  page: PDFPage,
  font: PDFFont,
  text: string,
  px: number,
  py: number,
  widthPx: number,
  size = 10
) {
  let value = clean(text);
  if (!value) return;
  const maxWidth = widthPx * PX_TO_PT;
  let fontSize = size;
  while (fontSize > 6 && font.widthOfTextAtSize(value, fontSize) > maxWidth) {
    fontSize -= 0.5;
  }
  while (value.length > 1 && font.widthOfTextAtSize(value, fontSize) > maxWidth) {
    value = value.slice(0, -1);
  }
  const { x, y } = pt(px, py);
  page.drawText(value, { x, y, size: fontSize, font, color: INK });
}

/** Word-wrap text across several ruled lines (used for the address blocks). */
function drawWrapped(
  page: PDFPage,
  font: PDFFont,
  text: string,
  px: number,
  linesPy: number[],
  widthPx: number,
  size = 9
) {
  const value = clean(text);
  if (!value) return;
  const maxWidth = widthPx * PX_TO_PT;

  const wrap = (fontSize: number) => {
    const lines: string[] = [];
    let current = '';
    for (const word of value.split(' ')) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth || !current) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  let fontSize = size;
  let lines = wrap(fontSize);
  while (lines.length > linesPy.length && fontSize > 6.5) {
    fontSize -= 0.5;
    lines = wrap(fontSize);
  }

  linesPy.forEach((py, i) => {
    if (lines[i]) drawFitted(page, font, lines[i], px, py, widthPx, fontSize);
  });
}

/** Draw a tick mark inside a checkbox whose centre is at (cx, cy) in template pixels. */
function drawTick(page: PDFPage, cx: number, cy: number) {
  const c = pt(cx, cy);
  const s = 4.2; // half-size of the mark in points
  page.drawLine({
    start: { x: c.x - s, y: c.y },
    end: { x: c.x - s * 0.25, y: c.y - s * 0.8 },
    thickness: 1.6,
    color: INK,
  });
  page.drawLine({
    start: { x: c.x - s * 0.25, y: c.y - s * 0.8 },
    end: { x: c.x + s * 1.1, y: c.y + s * 1.1 },
    thickness: 1.6,
    color: INK,
  });
}

async function drawPhoto(pdf: PDFDocument, page: PDFPage, dataUrl: string) {
  const match = /^data:image\/(jpeg|png);base64,(.+)$/.exec(dataUrl);
  if (!match) return;
  // Copy into a standalone Uint8Array: small Buffers share a pooled ArrayBuffer, which pdf-lib misreads
  const bytes = new Uint8Array(Buffer.from(match[2], 'base64'));
  // Sniff the real format from magic bytes rather than trusting the data URL label
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  let image;
  try {
    image = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
  } catch (err) {
    console.error('Skipping unreadable employee photo:', err);
    return;
  }

  // Photo frame (inner area) in template pixels
  const left = 852, right = 1028, top = 471, bottom = 696;
  const frameW = (right - left) * PX_TO_PT;
  const frameH = (bottom - top) * PX_TO_PT;
  const origin = pt(left, bottom);

  // Hide the watermark logo, then draw the photo scaled to fit (contain) and centred
  page.drawRectangle({ x: origin.x, y: origin.y, width: frameW, height: frameH, color: rgb(1, 1, 1) });
  const scale = Math.min(frameW / image.width, frameH / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  page.drawImage(image, {
    x: origin.x + (frameW - w) / 2,
    y: origin.y + (frameH - h) / 2,
    width: w,
    height: h,
  });
}

export async function generateEmployeeFormPdf(emp: EmployeeFormData): Promise<Uint8Array> {
  const templateBytes = new Uint8Array(await readFile(TEMPLATE_PATH));
  const pdf = await PDFDocument.load(templateBytes);
  const page = pdf.getPages()[0];
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);

  pdf.setTitle(`Employee Details Form - ${clean(emp.fullName)} (${clean(emp.employeeCode)})`);
  pdf.setAuthor('Akashganga Manpower Services Pvt Ltd');
  pdf.setProducer('HRMS');

  // --- Personal details ---
  drawFitted(page, font, emp.designation ?? '', 466, 441, 308); // 01 Position desired
  drawFitted(page, font, emp.employeeCode ?? '', 900, 443, 130); // ID Number
  drawFitted(page, font, (emp.fullName ?? '').toUpperCase(), 466, 480, 308); // 02 Name
  drawFitted(page, font, (emp.fatherOrHusbandName ?? '').toUpperCase(), 466, 520, 308); // 03 Father/Husband
  drawFitted(page, font, formatDate(emp.dateOfBirth), 466, 561, 126); // 04 DOB
  drawFitted(page, font, ageFrom(emp.dateOfBirth), 675, 561, 120); // 05 Age

  if (emp.gender === 'MALE') drawTick(page, 477, 603); // 06 Gender
  if (emp.gender === 'FEMALE') drawTick(page, 591, 603);
  if (emp.maritalStatus === 'UNMARRIED') drawTick(page, 477, 645); // 07 Marital status
  if (emp.maritalStatus === 'MARRIED') drawTick(page, 618, 645);

  drawFitted(page, font, emp.religion ?? '', 466, 688, 118); // 08 Religion
  drawFitted(page, font, emp.bloodGroup ?? '', 731, 688, 96); // 09 Blood group

  if (emp.photo) await drawPhoto(pdf, page, emp.photo);

  // --- Communication details ---
  drawWrapped(page, font, emp.address ?? '', 214, [801, 835, 869], 372); // Present address
  drawWrapped(page, font, emp.permanentAddress ?? '', 650, [801, 835, 869], 372); // Permanent address

  drawFitted(page, font, emp.phone ?? '', 424, 931, 188); // 10 Mobile
  drawFitted(page, font, emp.familyMobileNumber || emp.emergencyContactPhone || '', 843, 933, 182); // 11 Family mobile
  drawFitted(page, font, emp.educationDetails ?? '', 424, 969, 296); // 12 Education
  if (emp.policeVerification === true) drawTick(page, 968, 968); // 13 Police verification
  if (emp.policeVerification === false) drawTick(page, 1039, 968);
  drawFitted(page, font, emp.companyExperience ?? '', 424, 1011, 296); // 14 Company & experience
  if (emp.shoeIssued) drawTick(page, 842, 1011); // 15 Shoe
  if (emp.tShirtIssued) drawTick(page, 952, 1011); // T-shirt
  drawFitted(page, font, emp.languagesKnown ?? '', 424, 1052, 296); // 16 Languages

  // --- Declaration ---
  drawFitted(page, font, formatDate(emp.createdAt ?? new Date()), 260, 1148, 178);

  // --- For office use only ---
  drawFitted(page, font, emp.joiningCompany ?? '', 399, 1226, 184); // 16 Joining company
  drawFitted(page, font, emp.aadharNo ?? '', 399, 1258, 184); // 17 Aadhar
  drawFitted(page, font, emp.uanNo ?? '', 399, 1289, 184); // 18 UAN
  drawFitted(page, font, emp.bankAccountNo ?? '', 399, 1321, 184); // 19 Bank account
  drawFitted(page, font, formatDate(emp.joiningDate), 815, 1226, 208); // 20 DOJ
  drawFitted(page, font, emp.panNo ?? '', 815, 1258, 208); // 21 PAN
  drawFitted(page, font, emp.esicNo ?? '', 815, 1289, 208); // 22 ESIC
  drawFitted(page, font, emp.ifscCode ?? '', 815, 1321, 208); // 23 IFSC

  return pdf.save();
}
