import { findDuplicate } from "./csv";
import { addDays, todayInTimeZone } from "./dates";
import { digits } from "./format";
import { nid } from "./ids";
import { suggestSalutations } from "./people";
import type {
  ActivityPlan,
  BinBucket,
  Buyer,
  CalEvent,
  Campaign,
  Contact,
  ContactDraft,
  ContactPatch,
  Database,
  Deal,
  EmailTemplate,
  LetterTemplate,
  Listing,
  Task,
  Vendor,
} from "./types";

/** A saved record with the id left off when the desk is creating it. */
type Save<T> = Omit<T, "deletedAt" | "id"> & { id?: string };

export type Action =
  | { type: "dismissWelcome" }
  | { type: "updateSettings"; patch: Partial<Pick<Database["settings"], "userName" | "role" | "phone" | "email" | "timezone" | "showWelcome">> }
  | { type: "addAgent"; name: string }
  | { type: "removeAgent"; name: string }
  | { type: "addGroup"; name: string }
  | { type: "removeGroup"; name: string }
  | { type: "createContact"; draft: ContactDraft }
  | { type: "updateContact"; id: string; patch: ContactPatch }
  | { type: "deleteContacts"; ids: string[] }
  | { type: "addNote"; contactId: string; text: string }
  | { type: "addReferral"; contactId: string; name: string; side: Contact["referrals"][number]["side"]; kind: string; status: Contact["referrals"][number]["status"]; notes: string }
  | { type: "deleteReferral"; contactId: string; referralId: string }
  | { type: "addDocument"; contactId: string; name: string; kind: string; note: string }
  | { type: "deleteDocument"; contactId: string; documentId: string }
  | { type: "addProperty"; contactId: string; address: string; city: string; role: Contact["properties"][number]["role"]; date: string; price: number; mls: string }
  | { type: "deleteProperty"; contactId: string; propertyId: string }
  | { type: "createTask"; title: string; due: string; contactId: string; kind: Task["kind"]; notes: string }
  | { type: "updateTask"; id: string; patch: Partial<Pick<Task, "title" | "due" | "done" | "notes" | "kind" | "contactId">> }
  | { type: "deleteTasks"; ids: string[] }
  | { type: "createEvent"; title: string; date: string; time: string; contactId: string; kind: CalEvent["kind"]; notes: string }
  | { type: "updateEvent"; id: string; patch: Partial<Pick<CalEvent, "title" | "date" | "time" | "notes" | "kind" | "contactId">> }
  | { type: "deleteEvents"; ids: string[] }
  | { type: "snoozeTouches"; keys: string[]; until: string }
  | { type: "dismissTouches"; keys: string[] }
  | { type: "saveEmailTemplate"; template: Save<EmailTemplate> }
  | { type: "deleteEmailTemplates"; ids: string[] }
  | { type: "saveCampaign"; campaign: Omit<Campaign, "deletedAt" | "createdAt" | "sentAt" | "status" | "id"> & { id?: string; send?: boolean } }
  | { type: "deleteCampaigns"; ids: string[] }
  | { type: "saveLetterTemplate"; template: Save<LetterTemplate> }
  | { type: "deleteLetterTemplates"; ids: string[] }
  | { type: "recordLetter"; contactId: string; templateName: string }
  | { type: "recordMailing"; contactIds: string[]; label: string }
  | { type: "savePlan"; plan: Save<ActivityPlan> }
  | { type: "copyPlan"; id: string }
  | { type: "deletePlans"; ids: string[] }
  | { type: "enroll"; planId: string; contactId: string }
  | { type: "advanceEnrollment"; id: string }
  | { type: "setEnrollmentStatus"; id: string; status: "Running" | "Paused" | "Finished" }
  | { type: "saveListing"; listing: Save<Listing> }
  | { type: "deleteListings"; ids: string[] }
  | { type: "saveBuyer"; buyer: Save<Buyer> }
  | { type: "deleteBuyers"; ids: string[] }
  | { type: "saveDeal"; deal: Save<Deal> }
  | { type: "deleteDeals"; ids: string[] }
  | { type: "saveVendor"; vendor: Save<Vendor> }
  | { type: "deleteVendors"; ids: string[] }
  | { type: "importContacts"; rows: { index: number; draft: ContactDraft; problems: string[] }[]; decisions: Record<string, "skip" | "import" | "fill"> }
  | { type: "restore"; bucket: BinBucket; ids: string[] }
  | { type: "purge"; bucket: BinBucket; ids: string[] }
  | { type: "emptyBin" };

export interface ApplyResult {
  db: Database;
  error?: string;
  result?: Record<string, string>;
}

function stamp() {
  return new Date().toISOString();
}

function openContact(db: Database, id: string) {
  return db.contacts.find((c) => c.id === id && !c.deletedAt);
}

function rememberGroups(db: Database, tags: string[]) {
  for (const tag of tags) {
    const clean = tag.trim();
    if (clean && !db.settings.groups.includes(clean)) db.settings.groups.push(clean);
  }
}

function rememberAgent(db: Database, agent: string) {
  const clean = agent.trim();
  if (clean && !db.settings.agents.includes(clean)) db.settings.agents.push(clean);
}

function logActivity(contact: Contact, kind: string, summary: string, by: string) {
  contact.activities.unshift({ id: nid("a"), at: stamp(), kind, summary, by });
  contact.updatedAt = stamp();
}

export function contactFromDraft(db: Database, draft: ContactDraft, how: string): Contact {
  const firstName = draft.firstName.trim();
  const lastName = draft.lastName.trim();
  const spouseFirst = (draft.spouseFirst ?? "").trim();
  const spouseLast = (draft.spouseLast ?? "").trim();
  const greet = suggestSalutations({ firstName, lastName, spouseFirst, spouseLast });
  const phones = [];
  if (draft.mobile?.trim()) phones.push({ id: nid("p"), label: "Mobile", number: draft.mobile.trim() });
  if (draft.homePhone?.trim()) phones.push({ id: nid("p"), label: "Home", number: draft.homePhone.trim() });
  const emails = [];
  if (draft.email?.trim()) emails.push({ id: nid("e"), label: "Personal", address: draft.email.trim() });
  if (draft.spouseEmail?.trim()) emails.push({ id: nid("e"), label: "Spouse", address: draft.spouseEmail.trim() });
  const tags = (draft.tags ?? []).map((t) => t.trim()).filter(Boolean);
  rememberGroups(db, tags);
  const agent = (draft.agent ?? "").trim() || db.settings.agents[0] || "";
  rememberAgent(db, agent);
  const contact: Contact = {
    id: nid("c"),
    firstName,
    lastName,
    spouseFirst,
    spouseLast,
    phones,
    emails,
    mailPreference: draft.mailPreference ?? "Email",
    acceptMassEmail: draft.acceptMassEmail ?? true,
    salutation: greet.salutation,
    envelopeLine: greet.envelopeLine,
    letterGreeting: greet.letterGreeting,
    street: (draft.street ?? "").trim(),
    city: (draft.city ?? "").trim() || "Vancouver",
    province: (draft.province ?? "").trim() || "BC",
    postal: (draft.postal ?? "").trim(),
    moveInDate: draft.moveInDate ?? "",
    company: (draft.company ?? "").trim(),
    jobTitle: (draft.jobTitle ?? "").trim(),
    workStreet: "",
    workCity: "",
    workPhone: "",
    type: draft.type ?? "Client",
    source: (draft.source ?? "").trim() || how,
    birthday: draft.birthday ?? "",
    spouseBirthday: draft.spouseBirthday ?? "",
    anniversary: draft.anniversary ?? "",
    children: [],
    pets: [],
    interests: [],
    tags,
    agent,
    referrals: [],
    notes: [],
    documents: [],
    properties: [],
    activities: [],
    createdAt: stamp(),
    updatedAt: stamp(),
  };
  if (draft.notes?.trim()) {
    contact.notes.push({ id: nid("n"), at: stamp(), author: db.settings.userName, text: draft.notes.trim() });
  }
  logActivity(contact, "Note", how === "Import" ? "Added from a spreadsheet." : "Added by hand.", db.settings.userName);
  return contact;
}

function fillBlanks(db: Database, contact: Contact, draft: ContactDraft) {
  const set = <K extends keyof Contact>(key: K, value: Contact[K] | undefined) => {
    if (typeof value === "string" && value.trim() && !contact[key]) {
      contact[key] = value.trim() as Contact[K];
    }
  };
  set("spouseFirst", draft.spouseFirst);
  set("spouseLast", draft.spouseLast);
  set("street", draft.street);
  set("city", draft.city);
  set("province", draft.province);
  set("postal", draft.postal);
  set("moveInDate", draft.moveInDate);
  set("company", draft.company);
  set("jobTitle", draft.jobTitle);
  set("birthday", draft.birthday);
  set("spouseBirthday", draft.spouseBirthday);
  set("anniversary", draft.anniversary);
  set("source", draft.source);
  if (!contact.agent && draft.agent) {
    contact.agent = draft.agent.trim();
    rememberAgent(db, contact.agent);
  }
  if (draft.email && !contact.emails.some((e) => e.address.toLowerCase() === draft.email!.trim().toLowerCase())) {
    contact.emails.push({ id: nid("e"), label: "Personal", address: draft.email.trim() });
  }
  if (draft.spouseEmail && !contact.emails.some((e) => e.address.toLowerCase() === draft.spouseEmail!.trim().toLowerCase())) {
    contact.emails.push({ id: nid("e"), label: "Spouse", address: draft.spouseEmail.trim() });
  }
  const addPhone = (label: string, number?: string) => {
    if (!number?.trim()) return;
    if (contact.phones.some((p) => digits(p.number) === digits(number))) return;
    contact.phones.push({ id: nid("p"), label, number: number.trim() });
  };
  addPhone("Mobile", draft.mobile);
  addPhone("Home", draft.homePhone);
  for (const tag of draft.tags ?? []) {
    if (tag && !contact.tags.includes(tag)) contact.tags.push(tag);
  }
  rememberGroups(db, contact.tags);
  if (draft.notes?.trim() && !contact.notes.some((n) => n.text === draft.notes!.trim())) {
    contact.notes.push({ id: nid("n"), at: stamp(), author: db.settings.userName, text: draft.notes.trim() });
  }
  const greet = suggestSalutations(contact);
  if (!contact.letterGreeting) contact.letterGreeting = greet.letterGreeting;
  if (!contact.envelopeLine) contact.envelopeLine = greet.envelopeLine;
  logActivity(contact, "Note", "Filled in blanks from a spreadsheet.", db.settings.userName);
}

function softDelete<T extends { id: string; deletedAt?: string | null }>(rows: T[], ids: string[]) {
  const set = new Set(ids);
  for (const row of rows) {
    if (set.has(row.id)) row.deletedAt = stamp();
  }
}

function bucketRows(db: Database, bucket: BinBucket) {
  return db[bucket] as { id: string; deletedAt?: string | null }[];
}

export function applyAction(db: Database, action: Action): ApplyResult {
  const today = todayInTimeZone(db.settings.timezone || "America/Vancouver");
  const fail = (error: string): ApplyResult => ({ db, error });

  switch (action.type) {
    case "dismissWelcome":
      db.settings.showWelcome = false;
      return { db };
    case "updateSettings": {
      const patch = action.patch;
      if (patch.userName !== undefined) db.settings.userName = patch.userName.trim() || db.settings.userName;
      if (patch.role !== undefined) db.settings.role = patch.role.trim();
      if (patch.phone !== undefined) db.settings.phone = patch.phone.trim();
      if (patch.email !== undefined) db.settings.email = patch.email.trim();
      if (patch.timezone !== undefined) db.settings.timezone = patch.timezone;
      if (patch.showWelcome !== undefined) db.settings.showWelcome = patch.showWelcome;
      return { db };
    }
    case "addAgent": {
      const name = action.name.trim();
      if (!name) return fail("Type the agent’s name first.");
      rememberAgent(db, name);
      return { db };
    }
    case "removeAgent":
      db.settings.agents = db.settings.agents.filter((a) => a !== action.name);
      return { db };
    case "addGroup": {
      const name = action.name.trim();
      if (!name) return fail("Type a group name first.");
      rememberGroups(db, [name]);
      return { db };
    }
    case "removeGroup":
      db.settings.groups = db.settings.groups.filter((g) => g !== action.name);
      for (const c of db.contacts) c.tags = c.tags.filter((t) => t !== action.name);
      return { db };
    case "createContact": {
      if (!action.draft.firstName?.trim() || !action.draft.lastName?.trim()) {
        return fail("A person needs a first name and a last name.");
      }
      const contact = contactFromDraft(db, action.draft, "Office");
      db.contacts.unshift(contact);
      return { db, result: { id: contact.id } };
    }
    case "updateContact": {
      const contact = openContact(db, action.id);
      if (!contact) return fail("That person is not in the book.");
      if (action.patch.firstName !== undefined && !action.patch.firstName.trim()) return fail("First name can’t be empty.");
      if (action.patch.lastName !== undefined && !action.patch.lastName.trim()) return fail("Last name can’t be empty.");
      Object.assign(contact, action.patch);
      if (action.patch.tags) rememberGroups(db, contact.tags);
      if (action.patch.agent) rememberAgent(db, contact.agent);
      contact.updatedAt = stamp();
      return { db };
    }
    case "deleteContacts":
      softDelete(db.contacts, action.ids);
      return { db };
    case "addNote": {
      const contact = openContact(db, action.contactId);
      if (!contact) return fail("That person is not in the book.");
      const text = action.text.trim();
      if (!text) return fail("Write a note before saving.");
      contact.notes.unshift({ id: nid("n"), at: stamp(), author: db.settings.userName, text });
      logActivity(contact, "Note", text, db.settings.userName);
      return { db };
    }
    case "addReferral": {
      const contact = openContact(db, action.contactId);
      if (!contact) return fail("That person is not in the book.");
      if (!action.name.trim()) return fail("Who was referred?");
      contact.referrals.unshift({
        id: nid("r"),
        at: today,
        name: action.name.trim(),
        side: action.side,
        kind: action.kind.trim() || "Buyer",
        status: action.status,
        notes: action.notes.trim(),
      });
      logActivity(contact, "Referral", `Referral: ${action.name.trim()}`, db.settings.userName);
      return { db };
    }
    case "deleteReferral": {
      const contact = openContact(db, action.contactId);
      if (!contact) return fail("That person is not in the book.");
      contact.referrals = contact.referrals.filter((r) => r.id !== action.referralId);
      contact.updatedAt = stamp();
      return { db };
    }
    case "addDocument": {
      const contact = openContact(db, action.contactId);
      if (!contact) return fail("That person is not in the book.");
      if (!action.name.trim()) return fail("Give the file a name.");
      contact.documents.unshift({
        id: nid("d"),
        name: action.name.trim(),
        kind: action.kind.trim() || "File",
        at: today,
        note: action.note.trim() || "Sample file record. Nothing was uploaded.",
      });
      logActivity(contact, "File", `File noted: ${action.name.trim()}`, db.settings.userName);
      return { db };
    }
    case "deleteDocument": {
      const contact = openContact(db, action.contactId);
      if (!contact) return fail("That person is not in the book.");
      contact.documents = contact.documents.filter((d) => d.id !== action.documentId);
      return { db };
    }
    case "addProperty": {
      const contact = openContact(db, action.contactId);
      if (!contact) return fail("That person is not in the book.");
      if (!action.address.trim()) return fail("Add the property address.");
      contact.properties.unshift({
        id: nid("pr"),
        address: action.address.trim(),
        city: action.city.trim() || contact.city,
        role: action.role,
        date: action.date,
        price: Number(action.price) || 0,
        mls: action.mls.trim(),
      });
      logActivity(contact, "Property", `${action.role}: ${action.address.trim()}`, db.settings.userName);
      return { db };
    }
    case "deleteProperty": {
      const contact = openContact(db, action.contactId);
      if (!contact) return fail("That person is not in the book.");
      contact.properties = contact.properties.filter((p) => p.id !== action.propertyId);
      return { db };
    }
    case "createTask": {
      if (!action.title.trim()) return fail("What is the task?");
      if (!action.due) return fail("Pick a due date.");
      const task: Task = {
        id: nid("t"),
        title: action.title.trim(),
        due: action.due,
        contactId: action.contactId,
        done: false,
        notes: action.notes.trim(),
        kind: action.kind,
      };
      db.tasks.unshift(task);
      const contact = action.contactId ? openContact(db, action.contactId) : undefined;
      if (contact) logActivity(contact, "Task", `Task added: ${task.title}`, db.settings.userName);
      return { db, result: { id: task.id } };
    }
    case "updateTask": {
      const task = db.tasks.find((t) => t.id === action.id && !t.deletedAt);
      if (!task) return fail("That task is gone.");
      const wasDone = task.done;
      Object.assign(task, action.patch);
      if (!wasDone && task.done && task.contactId) {
        const contact = openContact(db, task.contactId);
        if (contact) logActivity(contact, "Task", `Finished a task: ${task.title}`, db.settings.userName);
      }
      return { db };
    }
    case "deleteTasks":
      softDelete(db.tasks, action.ids);
      return { db };
    case "createEvent": {
      if (!action.title.trim()) return fail("What is the appointment?");
      if (!action.date) return fail("Pick a date.");
      const event: CalEvent = {
        id: nid("ev"),
        title: action.title.trim(),
        date: action.date,
        time: action.time || "09:00",
        contactId: action.contactId,
        kind: action.kind,
        notes: action.notes.trim(),
      };
      db.events.unshift(event);
      return { db, result: { id: event.id } };
    }
    case "updateEvent": {
      const event = db.events.find((e) => e.id === action.id && !e.deletedAt);
      if (!event) return fail("That appointment is gone.");
      Object.assign(event, action.patch);
      return { db };
    }
    case "deleteEvents":
      softDelete(db.events, action.ids);
      return { db };
    case "snoozeTouches": {
      for (const key of action.keys) {
        const existing = db.touches.find((t) => t.key === key);
        if (existing) {
          existing.snoozeUntil = action.until;
          existing.dismissed = false;
        } else {
          db.touches.push({ key, snoozeUntil: action.until });
        }
      }
      return { db };
    }
    case "dismissTouches": {
      for (const key of action.keys) {
        const existing = db.touches.find((t) => t.key === key);
        if (existing) existing.dismissed = true;
        else db.touches.push({ key, dismissed: true });
      }
      return { db };
    }
    case "saveEmailTemplate": {
      const name = action.template.name.trim();
      if (!name) return fail("Name the template.");
      if (action.template.id) {
        const found = db.emailTemplates.find((t) => t.id === action.template.id && !t.deletedAt);
        if (!found) return fail("That template is gone.");
        Object.assign(found, { ...action.template, name });
        return { db, result: { id: found.id } };
      }
      const created: EmailTemplate = {
        id: nid("em"),
        name,
        category: action.template.category.trim() || "Office",
        description: action.template.description.trim(),
        subject: action.template.subject.trim(),
        body: action.template.body,
        createdBy: db.settings.userName,
      };
      db.emailTemplates.unshift(created);
      return { db, result: { id: created.id } };
    }
    case "deleteEmailTemplates":
      softDelete(db.emailTemplates, action.ids);
      return { db };
    case "saveCampaign": {
      if (!action.campaign.subject.trim()) return fail("Write a subject line.");
      if (action.campaign.send && action.campaign.recipientIds.length === 0) {
        return fail("Nobody in that group can receive mass email.");
      }
      let campaign = action.campaign.id
        ? db.campaigns.find((c) => c.id === action.campaign.id && !c.deletedAt)
        : undefined;
      if (action.campaign.id && !campaign) return fail("That campaign is gone.");
      if (!campaign) {
        campaign = {
          id: nid("cp"),
          name: action.campaign.name.trim() || action.campaign.subject.trim(),
          templateId: action.campaign.templateId,
          subject: action.campaign.subject.trim(),
          body: action.campaign.body,
          audienceLabel: action.campaign.audienceLabel,
          recipientIds: action.campaign.recipientIds,
          status: "Draft",
          createdAt: stamp(),
          sentAt: "",
        };
        db.campaigns.unshift(campaign);
      } else if (campaign.status === "Sent") {
        return fail("That campaign was already recorded as sent.");
      } else {
        Object.assign(campaign, {
          name: action.campaign.name.trim() || campaign.name,
          templateId: action.campaign.templateId,
          subject: action.campaign.subject.trim(),
          body: action.campaign.body,
          audienceLabel: action.campaign.audienceLabel,
          recipientIds: action.campaign.recipientIds,
        });
      }
      if (action.campaign.send) {
        campaign.status = "Sent";
        campaign.sentAt = stamp();
        for (const id of campaign.recipientIds) {
          const contact = openContact(db, id);
          if (contact) logActivity(contact, "Campaign", `Mass email: ${campaign.name}`, db.settings.userName);
        }
      }
      return { db, result: { id: campaign.id } };
    }
    case "deleteCampaigns":
      softDelete(db.campaigns, action.ids);
      return { db };
    case "saveLetterTemplate": {
      if (!action.template.name.trim()) return fail("Name the letter.");
      if (action.template.id) {
        const found = db.letterTemplates.find((t) => t.id === action.template.id && !t.deletedAt);
        if (!found) return fail("That letter is gone.");
        Object.assign(found, action.template);
        return { db, result: { id: found.id } };
      }
      const created: LetterTemplate = {
        id: nid("lt"),
        name: action.template.name.trim(),
        category: action.template.category.trim() || "Letters",
        description: action.template.description.trim(),
        body: action.template.body,
        enteredBy: db.settings.userName,
      };
      db.letterTemplates.unshift(created);
      return { db, result: { id: created.id } };
    }
    case "deleteLetterTemplates":
      softDelete(db.letterTemplates, action.ids);
      return { db };
    case "recordLetter": {
      const contact = openContact(db, action.contactId);
      if (!contact) return fail("Pick a person first.");
      logActivity(contact, "Letter", `Letter prepared: ${action.templateName}`, db.settings.userName);
      return { db };
    }
    case "recordMailing": {
      let count = 0;
      for (const id of action.contactIds) {
        const contact = openContact(db, id);
        if (!contact) continue;
        logActivity(contact, "Letter", action.label, db.settings.userName);
        count += 1;
      }
      return { db, result: { count: String(count) } };
    }
    case "savePlan": {
      if (!action.plan.name.trim()) return fail("Name the plan.");
      const steps = action.plan.steps
        .filter((s) => s.title.trim())
        .map((s) => ({ ...s, day: Math.max(0, Number(s.day) || 0), title: s.title.trim(), detail: s.detail.trim() }))
        .sort((a, b) => a.day - b.day);
      if (!steps.length) return fail("Add at least one step.");
      if (action.plan.id) {
        const found = db.plans.find((p) => p.id === action.plan.id && !p.deletedAt);
        if (!found) return fail("That plan is gone.");
        Object.assign(found, { ...action.plan, name: action.plan.name.trim(), steps });
        return { db, result: { id: found.id } };
      }
      const created: ActivityPlan = {
        id: nid("plan"),
        name: action.plan.name.trim(),
        category: action.plan.category,
        description: action.plan.description.trim(),
        method: action.plan.method,
        steps,
      };
      db.plans.unshift(created);
      return { db, result: { id: created.id } };
    }
    case "copyPlan": {
      const plan = db.plans.find((p) => p.id === action.id && !p.deletedAt);
      if (!plan) return fail("That plan is gone.");
      const copy: ActivityPlan = {
        ...plan,
        id: nid("plan"),
        name: `${plan.name} (copy)`,
        steps: plan.steps.map((s) => ({ ...s })),
      };
      db.plans.unshift(copy);
      return { db, result: { id: copy.id } };
    }
    case "deletePlans":
      softDelete(db.plans, action.ids);
      return { db };
    case "enroll": {
      const plan = db.plans.find((p) => p.id === action.planId && !p.deletedAt);
      const contact = openContact(db, action.contactId);
      if (!plan || !contact) return fail("Pick a plan and a person.");
      const already = db.enrollments.find(
        (e) => e.planId === plan.id && e.contactId === contact.id && e.status === "Running" && !e.deletedAt,
      );
      if (already) return fail("They are already on this plan.");
      const first = plan.steps[0];
      db.enrollments.unshift({
        id: nid("en"),
        planId: plan.id,
        contactId: contact.id,
        startedAt: today,
        stepIndex: 0,
        nextDue: addDays(today, first?.day ?? 0),
        status: "Running",
      });
      logActivity(contact, "Plan", `Started the plan: ${plan.name}`, db.settings.userName);
      return { db };
    }
    case "advanceEnrollment": {
      const enrollment = db.enrollments.find((e) => e.id === action.id && !e.deletedAt);
      if (!enrollment) return fail("That enrollment is gone.");
      if (enrollment.status === "Paused") return fail("Resume the plan before marking a step done.");
      const plan = db.plans.find((p) => p.id === enrollment.planId);
      if (!plan) return fail("The plan is missing.");
      const next = enrollment.stepIndex + 1;
      if (next >= plan.steps.length) {
        enrollment.status = "Finished";
        return { db };
      }
      const gap = plan.steps[next].day - plan.steps[enrollment.stepIndex].day;
      enrollment.stepIndex = next;
      enrollment.nextDue = addDays(today, Math.max(gap, 1));
      return { db };
    }
    case "setEnrollmentStatus": {
      const enrollment = db.enrollments.find((e) => e.id === action.id && !e.deletedAt);
      if (!enrollment) return fail("That enrollment is gone.");
      enrollment.status = action.status;
      return { db };
    }
    case "saveListing": {
      if (!action.listing.address.trim()) return fail("Add the listing address.");
      const listing = { ...action.listing, price: Number(action.listing.price) || 0, address: action.listing.address.trim() };
      if (action.listing.id) {
        const found = db.listings.find((l) => l.id === action.listing.id && !l.deletedAt);
        if (!found) return fail("That listing is gone.");
        Object.assign(found, listing);
        return { db, result: { id: found.id } };
      }
      const created: Listing = { ...listing, id: nid("ls") };
      db.listings.unshift(created);
      return { db, result: { id: created.id } };
    }
    case "deleteListings":
      softDelete(db.listings, action.ids);
      return { db };
    case "saveBuyer": {
      if (!action.buyer.contactId) return fail("Which person is the buyer?");
      if (action.buyer.id) {
        const found = db.buyers.find((b) => b.id === action.buyer.id && !b.deletedAt);
        if (!found) return fail("That buyer file is gone.");
        Object.assign(found, action.buyer);
        return { db, result: { id: found.id } };
      }
      const created: Buyer = { ...action.buyer, id: nid("b") };
      db.buyers.unshift(created);
      return { db, result: { id: created.id } };
    }
    case "deleteBuyers":
      softDelete(db.buyers, action.ids);
      return { db };
    case "saveDeal": {
      if (!action.deal.address.trim()) return fail("Add the property address.");
      const deal = { ...action.deal, price: Number(action.deal.price) || 0, address: action.deal.address.trim() };
      if (action.deal.id) {
        const found = db.deals.find((d) => d.id === action.deal.id && !d.deletedAt);
        if (!found) return fail("That deal is gone.");
        Object.assign(found, deal);
        return { db, result: { id: found.id } };
      }
      const created: Deal = { ...deal, id: nid("dl") };
      db.deals.unshift(created);
      return { db, result: { id: created.id } };
    }
    case "deleteDeals":
      softDelete(db.deals, action.ids);
      return { db };
    case "saveVendor": {
      if (!action.vendor.name.trim() || !action.vendor.company.trim()) return fail("A vendor needs a name and a company.");
      if (action.vendor.id) {
        const found = db.vendors.find((v) => v.id === action.vendor.id && !v.deletedAt);
        if (!found) return fail("That vendor is gone.");
        Object.assign(found, { ...action.vendor, name: action.vendor.name.trim(), company: action.vendor.company.trim() });
        return { db, result: { id: found.id } };
      }
      const created: Vendor = {
        ...action.vendor,
        id: nid("v"),
        name: action.vendor.name.trim(),
        company: action.vendor.company.trim(),
        tags: action.vendor.tags ?? [],
      };
      db.vendors.unshift(created);
      return { db, result: { id: created.id } };
    }
    case "deleteVendors":
      softDelete(db.vendors, action.ids);
      return { db };
    case "importContacts": {
      let added = 0;
      let filled = 0;
      let skipped = 0;
      for (const row of action.rows) {
        const decision = action.decisions[String(row.index)] ?? (row.problems.length ? "skip" : "import");
        if (row.problems.length || decision === "skip") {
          skipped += 1;
          continue;
        }
        const match = findDuplicate(db, row.draft);
        if (decision === "fill" && match) {
          const contact = openContact(db, match.contactId);
          if (!contact) {
            skipped += 1;
            continue;
          }
          fillBlanks(db, contact, row.draft);
          filled += 1;
          continue;
        }
        if (!row.draft.firstName?.trim() || !row.draft.lastName?.trim()) {
          skipped += 1;
          continue;
        }
        db.contacts.unshift(contactFromDraft(db, row.draft, "Import"));
        added += 1;
      }
      return { db, result: { added: String(added), filled: String(filled), skipped: String(skipped) } };
    }
    case "restore": {
      const ids = new Set(action.ids);
      for (const row of bucketRows(db, action.bucket)) {
        if (ids.has(row.id)) row.deletedAt = null;
      }
      return { db };
    }
    case "purge": {
      const ids = new Set(action.ids);
      const key = action.bucket;
      if (key === "contacts") db.contacts = db.contacts.filter((r) => !ids.has(r.id));
      else if (key === "tasks") db.tasks = db.tasks.filter((r) => !ids.has(r.id));
      else if (key === "events") db.events = db.events.filter((r) => !ids.has(r.id));
      else if (key === "emailTemplates") db.emailTemplates = db.emailTemplates.filter((r) => !ids.has(r.id));
      else if (key === "letterTemplates") db.letterTemplates = db.letterTemplates.filter((r) => !ids.has(r.id));
      else if (key === "campaigns") db.campaigns = db.campaigns.filter((r) => !ids.has(r.id));
      else if (key === "plans") db.plans = db.plans.filter((r) => !ids.has(r.id));
      else if (key === "vendors") db.vendors = db.vendors.filter((r) => !ids.has(r.id));
      else if (key === "listings") db.listings = db.listings.filter((r) => !ids.has(r.id));
      else if (key === "buyers") db.buyers = db.buyers.filter((r) => !ids.has(r.id));
      else db.deals = db.deals.filter((r) => !ids.has(r.id));
      return { db };
    }
    case "emptyBin": {
      const keep = <T extends { deletedAt?: string | null }>(rows: T[]) => rows.filter((r) => !r.deletedAt);
      db.contacts = keep(db.contacts);
      db.tasks = keep(db.tasks);
      db.events = keep(db.events);
      db.emailTemplates = keep(db.emailTemplates);
      db.letterTemplates = keep(db.letterTemplates);
      db.campaigns = keep(db.campaigns);
      db.plans = keep(db.plans);
      db.vendors = keep(db.vendors);
      db.listings = keep(db.listings);
      db.buyers = keep(db.buyers);
      db.deals = keep(db.deals);
      return { db };
    }
    default:
      return fail("That action is not available.");
  }
}
