import { useMemo } from "react";
import { ITEMS_PER_PAGE } from "../../data/artworks";
import {
  PaginationWrapper,
  PageButton,
  PageNavButton,
  PageEllipsis,
} from "./styledComponents";

const ChevronLeft  = () => <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>;
const ChevronRight = () => <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>;

const buildPageRange = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4)          return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3)  return [1, "…", total-4, total-3, total-2, total-1, total];
  return [1, "…", current-1, current, current+1, "…", total];
};

// totalItems is the number of artworks in the current filter
// currentPage is the page being shown
// onPageChange is called with the new page number
const Pagination = ({ totalItems, currentPage, onPageChange }) => {
  const totalPages = useMemo(
    () => Math.ceil(totalItems / ITEMS_PER_PAGE),
    [totalItems]
  );

  if (totalPages <= 1) return null;

  const pages = buildPageRange(currentPage, totalPages);

  const handlePage = (page) => {
    onPageChange(page);
    // Scroll back up to the filter bar. The admin gallery has no anchor, so it just stays put.
    const el = document.getElementById("filterbar-anchor");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <PaginationWrapper>
      <PageNavButton
        disabled={currentPage === 1}
        onClick={() => handlePage(currentPage - 1)}
      >
        <ChevronLeft />
        <span>Back</span>
      </PageNavButton>

      {pages.map((p, i) =>
        p === "…" ? (
          <PageEllipsis key={`ellipsis-${i}`}>…</PageEllipsis>
        ) : (
          <PageButton
            key={p}
            $active={p === currentPage}
            onClick={() => handlePage(p)}
          >
            {p}
          </PageButton>
        )
      )}

      <PageNavButton
        disabled={currentPage === totalPages}
        onClick={() => handlePage(currentPage + 1)}
      >
        <span>Next</span>
        <ChevronRight />
      </PageNavButton>
    </PaginationWrapper>
  );
};

export default Pagination;
