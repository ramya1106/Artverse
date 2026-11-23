// One artwork tile in the masonry grid.
// Clicking it opens the preview modal, where the download and payment happens.
// Pass onSelect to handle the click yourself (the admin gallery does this).

import { useState } from 'react';
import PreviewModal from '../PreviewModal';
import {
  CardWrapper,
  CardImage,
  CardVideo,
  CardImagePlaceholder,
  CardOverlay,
  VideoPlayIndicator,
} from './styledComponents';

// Stops right click on the media (a small deterrent only, it can't really prevent saving)
const blockContext = (e) => e.preventDefault();

// Holds the image or video. The padding-bottom trick reserves the right height before the
// file loads, so the grid does not jump around.
const CardFrame = ({ artwork, onClick }) => {
  const [loaded, setLoaded] = useState(false);

  const aspectPct = artwork.height && artwork.width
    ? `${(artwork.height / artwork.width) * 100}%`
    : '133%'; // default 3:4

  const isVideo = artwork.mediaType === 'video';

  return (
    <div
      style={{ position: 'relative', width: '100%', paddingBottom: aspectPct, cursor: 'pointer' }}
      onClick={onClick}
    >
      <CardImagePlaceholder style={{ opacity: loaded ? 0 : 1 }} />

      {isVideo ? (
        <>
          <CardVideo
            src={artwork.imageURL}
            autoPlay
            muted
            loop
            playsInline
            $loaded={loaded}
            onCanPlay={() => setLoaded(true)}
            onContextMenu={blockContext}
          />
          <VideoPlayIndicator>VIDEO</VideoPlayIndicator>
        </>
      ) : (
        <CardImage
          src={artwork.imageURL}
          alt={artwork.category}
          className={loaded ? 'loaded' : ''}
          onLoad={() => setLoaded(true)}
          onContextMenu={blockContext}
          draggable={false}
        />
      )}

      {/* dark tint on hover, shows the card is clickable */}
      <CardOverlay />
    </div>
  );
};

const ArtworkCard = ({ artwork, onSelect }) => {
  const [modalOpen, setModalOpen] = useState(false);

  // Skip broken records instead of crashing the whole grid
  if (!artwork || !artwork.imageURL || artwork.mediaType === undefined) return null;

  return (
    <>
      <CardWrapper onContextMenu={blockContext}>
        <CardFrame
          artwork={artwork}
          onClick={() => (onSelect ? onSelect(artwork) : setModalOpen(true))}
        />
      </CardWrapper>

      {modalOpen && (
        <PreviewModal
          artwork={artwork}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
};

export default ArtworkCard;
