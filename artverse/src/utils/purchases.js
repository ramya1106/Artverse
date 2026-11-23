// Remembers in this browser which artworks were paid for, so the visitor can download again.
//
// This is only a convenience and never proof of payment. The backend checks its own payment
// record every time a download link is requested, so a changed or made up value here gets nothing.

const KEY = 'artverse_purchases';

const readAll = () => {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {}; // storage blocked or the saved text is broken
  }
};

export const getSavedPayment = (artworkId) => readAll()[artworkId] || null;

export const savePayment = (artworkId, paymentId) => {
  try { localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [artworkId]: paymentId })); } catch { /* storage blocked, ignore */ }
};

export const forgetPayment = (artworkId) => {
  const { [artworkId]: removed, ...rest } = readAll(); // eslint-disable-line no-unused-vars
  try { localStorage.setItem(KEY, JSON.stringify(rest)); } catch { /* storage blocked, ignore */ }
};
