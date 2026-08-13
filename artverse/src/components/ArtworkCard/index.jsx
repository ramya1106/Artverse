import React, { useRef, useState } from 'react';
import { trackDownload } from '../../api';
import { getWatermarkedUrl } from '../../utils/watermark';
import {
  CardWrapper,
  CardImage,
  CardVideo,
  CardImagePlaceholder,
  CardOverlay,
  DownloadButton,
  DownloadSpinner,
  VideoPlayIndicator,
} from './styledComponents';

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M12 15V3" />
    <path d="M7 10l5 5 5-5" />
    <path d="M3 17l.621 2.485A2 2 0 005.561 21h12.878a2 2 0 001.94-1.515L22 17" />
  </svg>
);

// ── Image card ─────────────────────────────────────────────
const ImageCard = ({ artwork, onDownload, downloading }) => {
  const imgRef = useRef(null);

  const handleLoad = () => {
    if (imgRef.current) {
      const placeholder = imgRef.current.previousSibling;
      if (placeholder) placeholder.style.display = 'none';
      imgRef.current.classList.add('loaded');
    }
  };

  const aspectPadding = artwork.width && artwork.height
    ? `${(artwork.height / artwork.width) * 100}%`
    : '133%';

  return (
    <CardWrapper>
      <div style={{ position: 'relative', width: '100%', paddingBottom: aspectPadding }}>
        <CardImagePlaceholder />
        <CardImage
          ref={imgRef}
          src={artwork.imageURL}
          alt={`Artwork — ${artwork.category}`}
          loading="lazy"
          onLoad={handleLoad}
        />
        <CardOverlay>
          <DownloadButton onClick={onDownload} title="Download" disabled={downloading}>
            {downloading ? <DownloadSpinner /> : <DownloadIcon />}
          </DownloadButton>
        </CardOverlay>
      </div>
    </CardWrapper>
  );
};

// ── Video card — hover to play ──────────────────────────────
const VideoCard = ({ artwork, onDownload, downloading }) => {
  const videoRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  const aspectPadding = artwork.width && artwork.height
    ? `${(artwork.height / artwork.width) * 100}%`
    : '177%'; // 9:16 portrait default for wallpapers

  const handleMouseEnter = () => {
    if (videoRef.current) videoRef.current.play().catch(() => {});
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <CardWrapper onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div style={{ position: 'relative', width: '100%', paddingBottom: aspectPadding }}>
        {!loaded && <CardImagePlaceholder />}
        <CardVideo
          ref={videoRef}
          src={artwork.imageURL}
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedMetadata={() => setLoaded(true)}
          $loaded={loaded}
        />
        <VideoPlayIndicator>▶</VideoPlayIndicator>
        <CardOverlay>
          <DownloadButton onClick={onDownload} title="Download MP4" disabled={downloading}>
            {downloading ? <DownloadSpinner /> : <DownloadIcon />}
          </DownloadButton>
        </CardOverlay>
      </div>
    </CardWrapper>
  );
};

// ── Main component ──────────────────────────────────────────
const ArtworkCard = React.memo(({ artwork }) => {
  const [downloading, setDownloading] = useState(false);

  // GUARD: if artwork is undefined or null for any reason, render nothing
  // instead of crashing the whole page
  if (!artwork) return null;

  const handleDownload = async (e) => {
    e.stopPropagation();
    if (downloading) return;

    setDownloading(true);
    trackDownload(artwork._id);

    try {
      const isVideoDownload = artwork.mediaType === 'video';
      const downloadUrl = getWatermarkedUrl(artwork.imageURL, isVideoDownload);
      const response = await fetch(downloadUrl);
      const blob     = await response.blob();
      const blobUrl  = URL.createObjectURL(blob);
      const link     = document.createElement('a');
      link.href      = blobUrl;
      const isVideo  = artwork.mediaType === 'video';
      const ext      = isVideo ? 'mp4' : (blob.type.split('/')[1] || 'jpg');
      link.download  = `artverse-${artwork._id}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(downloadUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  if (artwork.mediaType === 'video') {
    return <VideoCard artwork={artwork} onDownload={handleDownload} downloading={downloading} />;
  }

  return <ImageCard artwork={artwork} onDownload={handleDownload} downloading={downloading} />;
});

ArtworkCard.displayName = 'ArtworkCard';

export default ArtworkCard;
