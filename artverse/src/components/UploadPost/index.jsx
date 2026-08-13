import React, { useState, useCallback, useRef } from 'react';
import { uploadArtwork } from '../../api';
import {
  FormWrapper,
  DropZone,
  DropIcon,
  DropLabel,
  DropHint,
  HiddenInput,
  PreviewWrapper,
  PreviewImage,
  PreviewVideo,
  PreviewOverlay,
  RemoveButton,
  FormGroup,
  Label,
  Select,
  VideoBadge,
  SubmitButton,
  Spinner,
  SuccessCard,
  SuccessIconWrapper,
  SuccessTitle,
  SuccessSub,
  ResetButton,
} from './styledComponents';

const IMAGE_CATEGORIES = ['Epic', 'Top', 'Premium'];

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const UploadPost = () => {
  const [file,      setFile]      = useState(null);
  const [preview,   setPreview]   = useState(null);
  const [isVideo,   setIsVideo]   = useState(false);
  const [category,  setCategory]  = useState('Epic');
  const [dragging,  setDragging]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState(null);
  const [success,   setSuccess]   = useState(false);
  const inputRef = useRef(null);

  const processFile = useCallback((f) => {
    if (!f) return;
    const fileIsVideo = f.type === 'video/mp4';
    const fileIsImage = f.type.startsWith('image/');
    if (!fileIsImage && !fileIsVideo) {
      setError('Only image files and MP4 videos are supported.');
      return;
    }
    setFile(f);
    setIsVideo(fileIsVideo);
    setPreview(URL.createObjectURL(f));
    setError(null);
    if (fileIsVideo) setCategory('Live Wallpapers');
  }, []);

  const handleDrop      = useCallback((e) => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]); }, [processFile]);
  const handleDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);
  const handleFileInput = (e) => processFile(e.target.files[0]);

  const handleRemove = () => {
    setFile(null);
    setPreview(null);
    setIsVideo(false);
    setError(null);
    setCategory('Epic');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadArtwork(file, category);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSuccess(false);
    setFile(null);
    setPreview(null);
    setIsVideo(false);
    setCategory('Epic');
    setError(null);
  };

  if (success) {
    return (
      <SuccessCard>
        <SuccessIconWrapper><CheckIcon /></SuccessIconWrapper>
        <SuccessTitle>{isVideo ? 'Wallpaper Published' : 'Artwork Published'}</SuccessTitle>
        <SuccessSub>"{file?.name}" added to {category}.</SuccessSub>
        <ResetButton onClick={handleReset}>Upload another</ResetButton>
      </SuccessCard>
    );
  }

  return (
    <FormWrapper>
      {!preview ? (
        <DropZone
          $dragging={dragging}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
        >
          <DropIcon><UploadIcon /></DropIcon>
          <DropLabel>Drop image or video here or <span>browse files</span></DropLabel>
          <DropHint>Images: JPG, PNG, WEBP — Videos: MP4 (max 100MB)</DropHint>
          <HiddenInput
            ref={inputRef}
            type="file"
            accept="image/*,video/mp4"
            onChange={handleFileInput}
          />
        </DropZone>
      ) : (
        <PreviewWrapper>
          {isVideo
            ? <PreviewVideo src={preview} muted loop autoPlay playsInline />
            : <PreviewImage src={preview} alt="Preview" />
          }
          <PreviewOverlay>
            <RemoveButton onClick={handleRemove} title="Remove">
              <XIcon />
            </RemoveButton>
          </PreviewOverlay>
        </PreviewWrapper>
      )}

      {isVideo ? (
        <VideoBadge>
          📹 This MP4 will be automatically added to <strong>Live Wallpapers</strong>
        </VideoBadge>
      ) : (
        <FormGroup>
          <Label htmlFor="category">Category</Label>
          <Select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {IMAGE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </FormGroup>
      )}

      {error && (
        <p style={{ color: '#e74c3c', fontSize: '0.7rem', marginBottom: '1rem', letterSpacing: '0.05em' }}>
          ⚠ {error}
        </p>
      )}

      <SubmitButton onClick={handleSubmit} disabled={!file || uploading}>
        {uploading
          ? <><Spinner /> Uploading…</>
          : isVideo ? 'Publish Wallpaper' : 'Publish Artwork'
        }
      </SubmitButton>
    </FormWrapper>
  );
};

export default UploadPost;
