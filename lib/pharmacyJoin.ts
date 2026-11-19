/**
 * Pharmacies do not sign up themselves (founder, 2026-11-19). "For pharmacies"
 * in the menus and footer opens WhatsApp to the founder with this message
 * already typed, and the founder sets up the account by hand
 * (/admin/creator-partners). Wording is the founder's, word for word.
 */
const PHARMACY_MESSAGE =
  "Hello Glufloat, I want my pharmacy to partner with you.\nPharmacy name: \nState: ";

export const PHARMACY_WHATSAPP_URL = `https://wa.me/2348132097317?text=${encodeURIComponent(PHARMACY_MESSAGE)}`;
