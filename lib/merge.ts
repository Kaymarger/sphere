import type { Contact, OfficeSettings } from "./types";
import { personName } from "./people";

export const MERGE_FIELDS: { token: string; label: string }[] = [
  { token: "greeting", label: "Letter greeting" },
  { token: "first_name", label: "First name" },
  { token: "spouse_first", label: "Spouse first name" },
  { token: "last_name", label: "Last name" },
  { token: "full_name", label: "Full name" },
  { token: "street", label: "Street" },
  { token: "city", label: "City" },
  { token: "agent", label: "Agent" },
  { token: "office", label: "Office name" },
  { token: "brokerage", label: "Brokerage" },
  { token: "sender", label: "Your name" },
  { token: "sender_phone", label: "Your phone" },
];

export function mergeText(
  template: string,
  contact: Contact | null,
  settings: Pick<
    OfficeSettings,
    "officeName" | "brokerage" | "userName" | "phone" | "email" | "agents"
  >,
): string {
  const map: Record<string, string> = {
    first_name: contact?.firstName ?? "",
    last_name: contact?.lastName ?? "",
    spouse_first: contact?.spouseFirst ?? "",
    full_name: contact ? personName(contact) : "",
    greeting: contact?.letterGreeting || (contact ? `Dear ${contact.firstName},` : "Hello,"),
    address: contact ? [contact.street, contact.city].filter(Boolean).join(", ") : "",
    street: contact?.street ?? "",
    city: contact?.city ?? "",
    agent: contact?.agent || settings.agents[0] || "",
    office: settings.officeName,
    brokerage: settings.brokerage,
    sender: settings.userName,
    sender_phone: settings.phone,
    sender_email: settings.email,
  };
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, key: string) => map[key.toLowerCase()] ?? "");
}
