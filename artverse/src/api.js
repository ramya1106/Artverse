// All backend calls live in this file.
//
// In development the paths start with /artverse and Vite's proxy (vite.config.js) forwards them
// to the backend. When the website and backend are on different domains in production, set
// VITE_API_URL (for example https://api.mysite.com) before building.
const API_BASE = import.meta.env.VITE_API_URL || '';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// Runs a request and returns the JSON. If the server says no, it throws an Error with the
// server's message (or the fallback text) and keeps the status code on error.status.
const request = async (path, options = {}, fallbackMsg = 'Request failed') => {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(body.error || fallbackMsg);
    error.status = res.status;
    throw error;
  }
  return res.json();
};

// Admin token

// sessionStorage keeps the login after a page refresh but clears it when the tab is closed.
const TOKEN_KEY = 'artverse_admin_token';
export const getAdminToken   = () => { try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setAdminToken   = (t) => { try { sessionStorage.setItem(TOKEN_KEY, t); } catch { /* storage can be blocked, ignore */ } };
export const clearAdminToken = () => { try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* storage can be blocked, ignore */ } };

// AuthContext sets this so any admin request that gets a 401 can log the admin out.
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

// Same as request, but sends the admin token.
const adminRequest = async (path, options = {}, fallbackMsg) => {
  const token = getAdminToken();
  const headers = token ? { ...options.headers, Authorization: `Bearer ${token}` } : options.headers;
  try {
    return await request(path, { ...options, headers }, fallbackMsg);
  } catch (err) {
    if (err.status === 401) onUnauthorized();
    throw err;
  }
};

export const loginAdmin = (username, password) =>
  request('/artverse/admin/login', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ username, password }),
  }, 'Login failed'); // returns { token }

export const checkAdminSession = () =>
  adminRequest('/artverse/admin/me', {}, 'Session invalid');

// Public gallery data

export const fetchGallery = () =>
  request('/artverse/gallery', {}, 'Failed to fetch gallery');

export const fetchGalleryByCategory = (category) =>
  request(`/artverse/gallery/${encodeURIComponent(category)}`, {}, 'Failed to fetch gallery');

export const fetchLatest = () =>
  request('/artverse/latest', {}, 'Failed to fetch latest');

export const fetchStats = () =>
  request('/artverse/stats', {}, 'Failed to fetch stats');

// Used only to show prices. The server sets the real price when the order is created.
export const fetchPricing = () =>
  request('/artverse/pricing', {}, 'Failed to fetch pricing');

// Admin actions

// Takes either (file, category) or a ready made FormData.
export const uploadArtwork = (fileOrFormData, category) => {
  let formData = fileOrFormData;
  if (!(fileOrFormData instanceof FormData)) {
    formData = new FormData();
    formData.append('image', fileOrFormData); // the name must match upload.single("image") in the backend
    formData.append('category', category);
  }
  // No Content-Type here, the browser adds it with the multipart boundary.
  return adminRequest('/artverse/upload', { method: 'POST', body: formData }, 'Upload failed');
};

export const updateArtworkCategory = (id, category) =>
  adminRequest(`/artverse/admin/gallery/${id}`, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify({ category }),
  }, 'Failed to update category');

export const deleteArtwork = (id) =>
  adminRequest(`/artverse/admin/gallery/${id}`, { method: 'DELETE' }, 'Failed to delete artwork');

export const fetchArtworkStats = (id) =>
  adminRequest(`/artverse/admin/artwork-stats/${id}`, {}, 'Failed to load artwork stats');

export const fetchRevenue = () =>
  adminRequest('/artverse/admin/revenue', {}, 'Failed to load revenue');

export const updateFollowers = (count) =>
  adminRequest('/artverse/stats/followers', {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify({ instagramFollowers: count }),
  }, 'Failed to update followers');

// Downloads

// Asks the backend for a link to the original file. The backend decides if the visitor may have
// it and counts the download. Paid artworks need the paymentId, which the backend checks against
// its own payment record every time. Returns { url, expiresAt, counted }.
export const requestDownloadLink = (artworkId, paymentId) =>
  request(`/artverse/download/${artworkId}`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(paymentId ? { razorpay_payment_id: paymentId } : {}),
  }, 'Download failed');

// Razorpay payment
//
// How a paid download works:
//   1. createRazorpayOrder: the backend makes the order and sends back { id, amount, currency, key }
//   2. The user pays in the Razorpay popup
//   3. verifyRazorpayPayment: the backend checks the signature and sends back { success, paymentId }
//   4. The file is downloaded only after step 3 succeeds

// No amount is sent, the server decides the price from the artwork's category.
export const createRazorpayOrder = (artworkId) =>
  request('/artverse/payment/order', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ artworkId }),
  }, 'Failed to create payment order');

export const verifyRazorpayPayment = ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) =>
  request('/artverse/payment/verify', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ razorpay_order_id, razorpay_payment_id, razorpay_signature }),
  }, 'Payment verification failed');
