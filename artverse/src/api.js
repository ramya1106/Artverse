
// ============================================================
// Admin auth token — kept in sessionStorage so a page refresh
// doesn't log the admin out, but closing the tab/browser does.
// ============================================================
const TOKEN_KEY = "artverse_admin_token";

export const setAdminToken = (token) => sessionStorage.setItem(TOKEN_KEY, token);
export const clearAdminToken = () => sessionStorage.removeItem(TOKEN_KEY);
export const getAdminToken = () => sessionStorage.getItem(TOKEN_KEY);

// Small helper so upload/updateFollowers don't each repeat this
const authHeader = () => {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ============================================================
// POST /artverse/auth/login
// Checks username/password against the DB and returns a JWT
// ============================================================
export const loginAdmin = async (username, password) => {
  const response = await fetch("/artverse/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Login failed");
  }
  return response.json(); // { token }
};

export const fetchGallery = async () => {
  // fetch() sends an HTTP GET request (GET is the default)
  const response = await fetch("/artverse/gallery");

  // If the server returned an error code (like 500), throw an error
  if (!response.ok) {
    throw new Error("Failed to load gallery");
  }

  // .json() reads the response body and converts it from JSON text
  // into a real JavaScript array/object
  return response.json();
};

// ============================================================
// GET /artverse/gallery/:category
// Returns artworks for one category only
// ============================================================
export const fetchGalleryByCategory = async (category) => {
  const response = await fetch(`/artverse/gallery/${category}`);

  if (!response.ok) {
    throw new Error(`Failed to load ${category} artworks`);
  }

  return response.json();
};

// ============================================================
// GET /artverse/latest
// Returns 6 most recently uploaded artworks
// ============================================================
export const fetchLatest = async () => {
  const response = await fetch("/artverse/latest");

  if (!response.ok) {
    throw new Error("Failed to load latest artworks");
  }

  return response.json();
};

// ============================================================
// GET /artverse/stats
// Returns { totalPosts, totalDownloads, instagramFollowers }
// ============================================================
export const fetchStats = async () => {
  const response = await fetch("/artverse/stats");

  if (!response.ok) {
    throw new Error("Failed to load stats");
  }

  return response.json();
};

// ============================================================
// POST /artverse/download/:id
// Tells the backend "this artwork was downloaded"
// Call this when the user taps the download button
// ============================================================
export const trackDownload = async (artworkId) => {
  const response = await fetch(`/artverse/download/${artworkId}`, {
    method: "POST", // this is a POST request, not GET
  });

  if (!response.ok) {
    // Don't crash the whole page if tracking fails
    // Just log it quietly
    console.warn("Download tracking failed for artwork:", artworkId);
    return null;
  }

  return response.json();
};

// ============================================================
// POST /artverse/upload
// Admin: upload an image file + category to the backend
//
// FormData is a special object for sending files.
// You can't send a file as normal JSON.
// ============================================================
export const uploadArtwork = async (file, category) => {
  // FormData lets you package a file alongside text fields
  const formData = new FormData();
  formData.append("image", file);       // "image" must match multer's upload.single("image")
  formData.append("category", category);

  const response = await fetch("/artverse/upload", {
    method: "POST",
    headers: authHeader(),
    // DO NOT set Content-Type header manually when using FormData.
    // The browser sets it automatically with the correct boundary.
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Upload failed");
  }

  return response.json(); // returns the saved MongoDB document
};

// ============================================================
// PATCH /artverse/stats/followers
// Admin: update the Instagram follower count
// ============================================================
export const updateFollowers = async (count) => {
  const response = await fetch("/artverse/stats/followers", {
    method: "PATCH", // PATCH = partial update
    headers: {
      // Tell the backend we're sending JSON
      "Content-Type": "application/json",
      ...authHeader(),
    },
    // JSON.stringify converts the JS object to a JSON string
    body: JSON.stringify({ instagramFollowers: count }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to update followers");
  }

  return response.json();
};
