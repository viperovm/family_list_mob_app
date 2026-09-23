import * as Contacts from 'expo-contacts';

import { isValidPhone, normalizePhone } from './phone';

export interface PhoneContact {
  id: string;
  name: string;
  /** Normalized (E.164), unique phone numbers. */
  phones: string[];
}

export async function hasContactsPermission(): Promise<boolean> {
  const { granted } = await Contacts.getPermissionsAsync();
  return granted;
}

export async function requestContactsPermission(): Promise<boolean> {
  const { granted } = await Contacts.requestPermissionsAsync();
  return granted;
}

/**
 * Load the full contact book locally. The list is never sent to the server —
 * only explicitly selected numbers are.
 *
 * Uses the class-based `Contact.getAllDetails` API: the legacy
 * `getContactsAsync` entrypoint is deprecated in expo-contacts 57 and throws
 * at runtime when imported from the package root.
 */
export async function loadContacts(): Promise<PhoneContact[]> {
  const fields = [Contacts.ContactField.FULL_NAME, Contacts.ContactField.PHONES] as const;
  const details = await Contacts.Contact.getAllDetails(fields);

  const result: PhoneContact[] = [];

  for (const contact of details) {
    const phones: string[] = [];
    for (const p of contact.phones) {
      if (!p.number) continue;
      const e164 = normalizePhone(p.number);
      if (isValidPhone(e164) && !phones.includes(e164)) {
        phones.push(e164);
      }
    }
    if (phones.length > 0) {
      const name = (contact.fullName ?? '').trim();
      result.push({ id: contact.id, name: name || phones[0], phones });
    }
  }

  return result;
}

/** Search by name (case-insensitive) or by phone digits. */
export function searchContacts(contacts: PhoneContact[], query: string): PhoneContact[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const digits = q.replace(/\D/g, '');

  return contacts
    .filter((contact) => {
      const nameMatch = contact.name.toLowerCase().includes(q);
      const phoneMatch = digits.length > 0 && contact.phones.some((p) => p.includes(digits));
      return nameMatch || phoneMatch;
    })
    .slice(0, 30);
}
