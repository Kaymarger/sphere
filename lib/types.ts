export type ContactType = "Client" | "Prospect" | "Personal" | "B2B";

export type MailPreference = "Email" | "Mail" | "Both" | "Do not market";

export interface Phone {
  id: string;
  label: string;
  number: string;
}

export interface EmailAddress {
  id: string;
  label: string;
  address: string;
}

export interface Note {
  id: string;
  at: string;
  author: string;
  text: string;
}

export interface Activity {
  id: string;
  at: string;
  kind: string;
  summary: string;
  by: string;
}

export interface Referral {
  id: string;
  at: string;
  name: string;
  side: "They referred someone" | "We referred them";
  kind: string;
  status: "In progress" | "Closed" | "Thanked" | "Did not proceed";
  notes: string;
}

export interface DocumentRecord {
  id: string;
  name: string;
  kind: string;
  at: string;
  note: string;
  /** Small file kept in this browser, as a data URL. Omitted when only the name was recorded. */
  dataUrl?: string;
  mime?: string;
}

export interface PropertyRecord {
  id: string;
  address: string;
  city: string;
  role: "Bought" | "Sold" | "Owns" | "Looking";
  date: string;
  price: number;
  mls: string;
}

export interface Pet {
  name: string;
  kind: string;
}

export interface Child {
  name: string;
  birthday: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  spouseFirst: string;
  spouseLast: string;
  phones: Phone[];
  emails: EmailAddress[];
  mailPreference: MailPreference;
  acceptMassEmail: boolean;
  salutation: string;
  envelopeLine: string;
  letterGreeting: string;
  street: string;
  city: string;
  province: string;
  postal: string;
  moveInDate: string;
  company: string;
  jobTitle: string;
  workStreet: string;
  workCity: string;
  workPhone: string;
  type: ContactType;
  source: string;
  birthday: string;
  spouseBirthday: string;
  anniversary: string;
  children: Child[];
  pets: Pet[];
  interests: string[];
  tags: string[];
  agent: string;
  referrals: Referral[];
  notes: Note[];
  documents: DocumentRecord[];
  properties: PropertyRecord[];
  activities: Activity[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Task {
  id: string;
  title: string;
  due: string;
  contactId: string;
  done: boolean;
  notes: string;
  kind: "Call" | "Email" | "To-do" | "Showing" | "Paperwork";
  deletedAt?: string | null;
}

export interface CalEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  contactId: string;
  kind: "Appointment" | "Showing" | "Open house" | "Office" | "Personal";
  notes: string;
  deletedAt?: string | null;
}

export interface TouchState {
  key: string;
  snoozeUntil?: string;
  dismissed?: boolean;
}

export interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  subject: string;
  body: string;
  createdBy: string;
  deletedAt?: string | null;
}

export interface Campaign {
  id: string;
  name: string;
  templateId: string;
  subject: string;
  body: string;
  audienceLabel: string;
  recipientIds: string[];
  status: "Draft" | "Sent";
  createdAt: string;
  sentAt: string;
  deletedAt?: string | null;
}

export interface LetterTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  body: string;
  enteredBy: string;
  deletedAt?: string | null;
}

export interface PlanStep {
  day: number;
  channel: "Email" | "Letter" | "Call" | "Task";
  title: string;
  detail: string;
}

export interface ActivityPlan {
  id: string;
  name: string;
  category: "Marketing" | "Listing" | "Closing";
  description: string;
  method: "Email" | "Letter" | "Mixed";
  steps: PlanStep[];
  deletedAt?: string | null;
}

export interface Enrollment {
  id: string;
  planId: string;
  contactId: string;
  startedAt: string;
  stepIndex: number;
  nextDue: string;
  status: "Running" | "Paused" | "Finished";
  deletedAt?: string | null;
}

export interface Listing {
  id: string;
  address: string;
  city: string;
  neighbourhood: string;
  status: "Coming soon" | "Active" | "Conditionally sold" | "Pending";
  price: number;
  beds: number;
  baths: number;
  propertyType: string;
  agent: string;
  listDate: string;
  expires: string;
  contactId: string;
  notes: string;
  deletedAt?: string | null;
}

export interface Buyer {
  id: string;
  contactId: string;
  status: "Looking" | "Offered" | "Under contract" | "Paused";
  areas: string;
  budget: string;
  beds: string;
  agent: string;
  preapproved: boolean;
  notes: string;
  deletedAt?: string | null;
}

export interface Deal {
  id: string;
  address: string;
  city: string;
  side: "Buyer" | "Seller" | "Both";
  price: number;
  status: "Conditional" | "Firm" | "Closed" | "Fell through";
  closeDate: string;
  agent: string;
  contactIds: string[];
  notes: string;
  deletedAt?: string | null;
}

export interface Vendor {
  id: string;
  name: string;
  company: string;
  category: string;
  phone: string;
  email: string;
  city: string;
  notes: string;
  tags: string[];
  deletedAt?: string | null;
}

export interface OfficeSettings {
  officeName: string;
  brokerage: string;
  city: string;
  userName: string;
  role: string;
  phone: string;
  email: string;
  timezone: string;
  showWelcome: boolean;
  seededOn: string;
  agents: string[];
  groups: string[];
}

export interface Database {
  version: number;
  settings: OfficeSettings;
  contacts: Contact[];
  tasks: Task[];
  events: CalEvent[];
  touches: TouchState[];
  emailTemplates: EmailTemplate[];
  campaigns: Campaign[];
  letterTemplates: LetterTemplate[];
  plans: ActivityPlan[];
  enrollments: Enrollment[];
  listings: Listing[];
  buyers: Buyer[];
  deals: Deal[];
  vendors: Vendor[];
}

export interface ContactDraft {
  firstName: string;
  lastName: string;
  spouseFirst?: string;
  spouseLast?: string;
  email?: string;
  spouseEmail?: string;
  mobile?: string;
  homePhone?: string;
  street?: string;
  city?: string;
  province?: string;
  postal?: string;
  birthday?: string;
  spouseBirthday?: string;
  anniversary?: string;
  moveInDate?: string;
  type?: ContactType;
  source?: string;
  tags?: string[];
  agent?: string;
  company?: string;
  jobTitle?: string;
  acceptMassEmail?: boolean;
  mailPreference?: MailPreference;
  notes?: string;
}

export type ContactPatch = Partial<
  Pick<
    Contact,
    | "firstName"
    | "lastName"
    | "spouseFirst"
    | "spouseLast"
    | "phones"
    | "emails"
    | "mailPreference"
    | "acceptMassEmail"
    | "salutation"
    | "envelopeLine"
    | "letterGreeting"
    | "street"
    | "city"
    | "province"
    | "postal"
    | "moveInDate"
    | "company"
    | "jobTitle"
    | "workStreet"
    | "workCity"
    | "workPhone"
    | "type"
    | "source"
    | "birthday"
    | "spouseBirthday"
    | "anniversary"
    | "children"
    | "pets"
    | "interests"
    | "tags"
    | "agent"
  >
>;

export type BinBucket =
  | "contacts"
  | "tasks"
  | "events"
  | "emailTemplates"
  | "letterTemplates"
  | "campaigns"
  | "plans"
  | "vendors"
  | "listings"
  | "buyers"
  | "deals"
  | "enrollments";
