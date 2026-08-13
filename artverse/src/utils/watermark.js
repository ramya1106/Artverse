const WATERMARK_TEXT = 'ARTVERSE';

export const getWatermarkedUrl = (url, isVideo = false) => {
  if (!url) return url;

  const transformation =
    `l_text:Arial_60_bold:${WATERMARK_TEXT},co_white,o_28,a_-30,fl_tiled`;

  if (!url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/${transformation}/`);
};
