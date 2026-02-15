/** Engineering branches available for student profiles */
export const BRANCHES = [
  { value: 'CSE', label: 'Computer Science & Engineering' },
  { value: 'ECE', label: 'Electronics & Communication' },
  { value: 'EEE', label: 'Electrical & Electronics' },
  { value: 'MECH', label: 'Mechanical Engineering' },
  { value: 'CIVIL', label: 'Civil Engineering' },
  { value: 'IT', label: 'Information Technology' },
] as const;

/** Valid academic years */
export const YEARS = [1, 2, 3, 4] as const;

/** Valid semesters per year */
export const SEMESTERS = [1, 2] as const;

/** UUID v4 regex for route param validation */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Password minimum length (NIST SP 800-63B recommends 8+) */
export const PASSWORD_MIN_LENGTH = 8;

/** Maximum message length for chatbot */
export const MAX_CHAT_MESSAGE_LENGTH = 2000;

/** Maximum contact form message length */
export const MAX_CONTACT_MESSAGE_LENGTH = 1000;
