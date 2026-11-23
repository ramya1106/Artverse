// Shortens a number for display, for example 120000 becomes { value: "120", suffix: "K" }.
// The suffix is separate so the UI can color it differently.
const formatCount = (n) => {
  if (!n && n !== 0) return { value: '—', suffix: '' }; // no data yet
  if (n >= 1_000_000) return { value: (n / 1_000_000).toFixed(1), suffix: 'M' };
  if (n >= 1_000) {
    const k = n / 1_000;
    return { value: Number.isInteger(k) ? k.toString() : k.toFixed(1), suffix: 'K' };
  }
  return { value: n.toString(), suffix: '' };
};

export default formatCount;
