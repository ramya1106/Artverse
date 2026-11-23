// Full screen preview of one artwork. It opens when a card is clicked.
//
// Visitors see the category and a download button. Free artworks download straight away,
// paid ones open Razorpay checkout first and download only after the backend verifies the payment.
// With adminMode it shows purchase and download counts, a category editor and a delete button instead.

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  requestDownloadLink,
  createRazorpayOrder,
  verifyRazorpayPayment,
  fetchPricing,
  fetchArtworkStats,
  updateArtworkCategory,
  deleteArtwork,
} from '../../api';
import {
  Backdrop,
  ModalBox,
  CloseButton,
  MediaWrapper,
  ModalImage,
  ModalVideo,
  ModalFooter,
  DownloadBtn,
  BtnSpinner,
  CategoryChip,
  AdminStatsRow,
  StatTile,
  AdminControls,
  CategorySelect,
  AdminBtn,
  ConfirmOverlay,
  ConfirmBox,
} from './styledComponents';
import { FILTER_CATEGORIES } from '../../data/artworks';
import { getSavedPayment, savePayment, forgetPayment } from '../../utils/purchases';

// Used only until the real prices arrive from the backend (PRICE_MAP in backend/index.js).
// The backend is the source of truth, change prices there.
const PRICE_MAP = {
  'Epic':           0,
  'Top':            1,
  'Premium':        0,
  'Live Wallpapers': 0,
};

// Fetched once and reused, so opening more modals doesn't call the API again
let pricingCache = null;
const usePricing = () => {
  const [pricing, setPricing] = useState(pricingCache || PRICE_MAP);
  useEffect(() => {
    if (pricingCache) return;
    fetchPricing().then((p) => { pricingCache = p; setPricing(p); }).catch(() => {});
  }, []);
  return pricing;
};

// Loads Razorpay's checkout script the first time it is needed
const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

// Close on the Escape key
const useEscapeKey = (onClose) => {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);
};

// Stops the page behind the modal from scrolling. The scrollbar width is added as padding so
// the page does not shift sideways when the scrollbar disappears. Everything is put back on close.
const useLockScroll = () => {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPad: body.style.paddingRight,
    };
    const scrollbar = window.innerWidth - html.clientWidth;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.paddingRight = prev.bodyPad;
    };
  }, []);
};

// Saves the file the link points to. The file is read into the page first so the browser saves
// it instead of opening it in a tab. If the browser is not allowed to read it (the file is on
// another site), the link is clicked instead and the browser downloads it by itself.
const saveFile = async (url, baseName, isVideo) => {
  const clickLink = (href, filename) => {
    const link = document.createElement('a');
    link.href = href;
    if (filename) link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  let blob;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Download failed');
    blob = await response.blob();
  } catch (err) {
    if (err instanceof TypeError) { clickLink(url); return; } // blocked by the browser, not a bad link
    throw err;
  }
  const blobUrl = URL.createObjectURL(blob);
  const ext = isVideo ? 'mp4' : (blob.type.split('/')[1] || 'jpg');
  clickLink(blobUrl, `${baseName}.${ext}`);
  URL.revokeObjectURL(blobUrl);
};

const PreviewModal = ({ artwork, onClose, adminMode = false, onCategoryChange, onDeleted }) => {
  const [downloading, setDownloading] = useState(false);
  const [error,       setError]       = useState(null);
  const [downloaded,  setDownloaded]  = useState(false);
  // Set when this browser paid for the artwork earlier. Only a hint, the backend checks it again.
  const [paymentId,   setPaymentId]   = useState(() => getSavedPayment(artwork._id));

  const pricing = usePricing();

  // Admin only state
  const [stats,        setStats]        = useState(null); // { totalPurchases, totalDownloads }
  const [statsError,   setStatsError]   = useState(false);
  const [newCategory,  setNewCategory]  = useState(artwork.category);
  const [savingCat,    setSavingCat]    = useState(false);
  const [catSaved,     setCatSaved]     = useState(false);
  const [confirmOpen,  setConfirmOpen]  = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [adminError,   setAdminError]   = useState(null);

  // Escape closes the confirm dialog first, then the modal
  useEscapeKey(confirmOpen && !deleting ? () => setConfirmOpen(false) : onClose);
  useLockScroll();

  // Load the counts fresh every time the admin opens an artwork
  useEffect(() => {
    if (!adminMode) return;
    let cancelled = false; // ignore the answer if the admin moved to another artwork meanwhile
    setStats(null);
    setStatsError(false);
    fetchArtworkStats(artwork._id)
      .then((d) => { if (!cancelled) setStats(d); })
      .catch(() => { if (!cancelled) setStatsError(true); });
    return () => { cancelled = true; };
  }, [adminMode, artwork._id]);

  useEffect(() => { setNewCategory(artwork.category); }, [artwork.category]);

  const price   = pricing[artwork?.category] ?? 0;
  const isPaid  = price > 0;
  const isVideo = artwork?.mediaType === 'video';

  // Stops right click on the media
  const blockContext = useCallback((e) => e.preventDefault(), []);

  // Asks the backend for a fresh download link and saves the file. The backend decides if this
  // download is allowed and counts it. For paid artwork it checks its own payment record.
  const performDownload = useCallback(async (paymentIdToUse) => {
    const { url } = await requestDownloadLink(artwork._id, paymentIdToUse);
    await saveFile(url, `artverse-${artwork._id}`, isVideo);
    setDownloaded(true);
  }, [artwork, isVideo]);

  // Free artworks, and paid ones this browser already paid for ("Download Again")
  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      await performDownload(paymentId);
    } catch (err) {
      // The backend said the saved payment is not valid (refunded, too old or unknown)
      if (isPaid && paymentId && (err.status === 402 || err.status === 403)) {
        forgetPayment(artwork._id);
        setPaymentId(null);
      }
      // Only these messages are written for visitors, anything else gets the general text
      setError([402, 403, 429].includes(err.status) ? err.message : 'Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // First time paying: create order, pay in the Razorpay popup, verify on the backend, then download
  const handlePaidDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Payment gateway failed to load.');

      // 1. The backend creates the order and sets the price
      const order = await createRazorpayOrder(artwork._id);

      // 2. Open the Razorpay popup. The promise finishes when the download is done, or fails if
      //    the user closes the popup or the payment fails.
      await new Promise((resolve, reject) => {
        const options = {
          key:         order.key,
          amount:      order.amount, // in paise
          currency:    order.currency,
          name:        'Artverse',
          description: `Download — ${artwork.category}`,
          order_id:    order.id,
          theme:       { color: '#c0392b' },
          handler: async (response) => {
            // 3. The backend checks the signature. Never trust the popup result alone.
            let verified;
            try {
              verified = await verifyRazorpayPayment({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
              });
            } catch {
              reject(new Error('Payment verification failed.'));
              return;
            }

            // The payment is saved before the download starts. If the download fails, the button
            // becomes "Download Again" and the visitor is never asked to pay twice.
            savePayment(artwork._id, verified.paymentId);
            setPaymentId(verified.paymentId);

            // 4. Verified, so the file can be downloaded now
            try {
              await performDownload(verified.paymentId);
              resolve();
            } catch {
              reject(new Error('Payment received, but the download did not start. Press Download Again, you will not be charged again.'));
            }
          },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled.')),
          },
        };
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', () => reject(new Error('Payment failed.')));
        rzp.open();
      });
    } catch (err) {
      // Closing the popup is not an error, so no message for it
      if (err.message !== 'Payment cancelled.') {
        setError(err.message);
      }
    } finally {
      setDownloading(false);
    }
  };

  // A paid artwork only needs the Razorpay popup if this browser has no earlier payment for it
  const needsPayment = isPaid && !paymentId;

  // Admin actions
  // Videos can only be Live Wallpapers and images can't be, same rule as the backend
  const adminCategories = FILTER_CATEGORIES.filter((c) =>
    c !== 'All' && (isVideo ? c === 'Live Wallpapers' : c !== 'Live Wallpapers')
  );

  const handleSaveCategory = async () => {
    setSavingCat(true);
    setAdminError(null);
    setCatSaved(false);
    try {
      const updated = await updateArtworkCategory(artwork._id, newCategory);
      if (onCategoryChange) onCategoryChange(updated);
      setCatSaved(true);
      setTimeout(() => setCatSaved(false), 2500);
    } catch (err) {
      setAdminError(err.message);
    } finally {
      setSavingCat(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setAdminError(null);
    try {
      await deleteArtwork(artwork._id);
      if (onDeleted) onDeleted(artwork._id);
      onClose();
    } catch (err) {
      setAdminError(err.message);
      setConfirmOpen(false);
      setDeleting(false);
    }
  };

  const modal = (
    <Backdrop onClick={onClose} role="dialog" aria-modal="true">
      <ModalBox onClick={(e) => e.stopPropagation()}>

        <CloseButton onClick={onClose} aria-label="Close preview">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </CloseButton>

        <MediaWrapper>
          {isVideo ? (
            <ModalVideo
              $admin={adminMode}
              src={artwork.imageURL}
              autoPlay
              muted
              loop
              playsInline
              onContextMenu={blockContext}
            />
          ) : (
            <ModalImage
              $admin={adminMode}
              src={artwork.imageURL}
              alt={`Artwork — ${artwork.category}`}
              onContextMenu={blockContext}
              draggable={false}
            />
          )}
        </MediaWrapper>

        {adminMode ? (
          <>
            <AdminStatsRow>
              <StatTile>
                <span>Total Purchases</span>
                <strong>{stats ? stats.totalPurchases : statsError ? '—' : '…'}</strong>
              </StatTile>
              <StatTile>
                <span>Total Downloads</span>
                <strong>{stats ? stats.totalDownloads : statsError ? '—' : '…'}</strong>
              </StatTile>
            </AdminStatsRow>

            <ModalFooter>
              <AdminControls>
                <label htmlFor="admin-category">Edit Category</label>
                <CategorySelect
                  id="admin-category"
                  value={newCategory}
                  onChange={(e) => { setNewCategory(e.target.value); setCatSaved(false); }}
                  disabled={savingCat || adminCategories.length < 2}
                >
                  {adminCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                </CategorySelect>
                <AdminBtn
                  onClick={handleSaveCategory}
                  disabled={savingCat || newCategory === artwork.category}
                >
                  {savingCat ? <><BtnSpinner /> Saving…</> : catSaved ? '✓ Saved' : 'Save'}
                </AdminBtn>
              </AdminControls>

              <AdminBtn $danger onClick={() => setConfirmOpen(true)}>Delete Artwork</AdminBtn>

              {adminError && (
                <p style={{ color: '#e74c3c', fontSize: '0.65rem', letterSpacing: '0.05em', flexBasis: '100%' }}>
                  ⚠ {adminError}
                </p>
              )}
            </ModalFooter>

            {confirmOpen && (
              <ConfirmOverlay onClick={() => !deleting && setConfirmOpen(false)}>
                <ConfirmBox onClick={(e) => e.stopPropagation()}>
                  <h4>Delete this artwork?</h4>
                  <p>It will be removed from the gallery permanently. Past purchase and download records are kept.</p>
                  <div>
                    <AdminBtn onClick={() => setConfirmOpen(false)} disabled={deleting}>Cancel</AdminBtn>
                    <AdminBtn $danger onClick={handleDelete} disabled={deleting}>
                      {deleting ? <><BtnSpinner /> Deleting…</> : 'Yes, Delete'}
                    </AdminBtn>
                  </div>
                </ConfirmBox>
              </ConfirmOverlay>
            )}
          </>
        ) : (
        <ModalFooter>
          <CategoryChip>{artwork.category}</CategoryChip>

          {error && (
            <p style={{ color: '#e74c3c', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
              ⚠ {error}
            </p>
          )}

          {downloaded ? (
            <DownloadBtn as="span" disabled style={{ background: '#27ae60', opacity: 1, cursor: 'default' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Downloaded Successfully
            </DownloadBtn>
          ) : (
            <DownloadBtn onClick={needsPayment ? handlePaidDownload : handleDownload} disabled={downloading}>
              {downloading ? (
                <><BtnSpinner /> Processing…</>
              ) : needsPayment ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                    <rect x="2" y="11" width="20" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  Pay ₹{price} &amp; Download
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                    <path d="M12 15V3"/><path d="M7 10l5 5 5-5"/>
                    <path d="M3 17l.621 2.485A2 2 0 005.561 21h12.878a2 2 0 001.94-1.515L22 17"/>
                  </svg>
                  {isPaid ? 'Download Again' : 'Download Free'}
                </>
              )}
            </DownloadBtn>
          )}
        </ModalFooter>
        )}

      </ModalBox>
    </Backdrop>
  );

  // Render at <body> level so no parent stacking context (sticky filter bar,
  // masonry columns, page wrappers) can ever sit above the modal.
  return createPortal(modal, document.body);
};

export default PreviewModal;