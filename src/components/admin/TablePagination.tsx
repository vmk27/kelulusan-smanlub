import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TablePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel?: string;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemLabel = 'data',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, safePage * pageSize);

  const pageNumbers: number[] = [];
  const maxVisible = 5;
  let startPage = Math.max(1, safePage - Math.floor(maxVisible / 2));
  const endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="px-3.5 sm:px-4 py-3 bg-palette-background border-t border-palette-accent flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-palette-text/80">
      <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2.5 sm:gap-3 w-full sm:w-auto">
        <span>
          Menampilkan{' '}
          <strong className="font-mono tabular-nums text-palette-text">
            {startItem}–{endItem}
          </strong>{' '}
          dari{' '}
          <strong className="font-mono tabular-nums text-palette-text">{totalItems}</strong>{' '}
          {itemLabel}
        </span>

        <div className="flex items-center gap-1.5">
          <label className="text-palette-text/70">Baris:</label>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="px-2 py-1.5 min-h-[34px] text-xs font-mono tabular-nums bg-white border border-palette-accent rounded-md focus:outline-none focus:border-palette-primary text-palette-text cursor-pointer"
          >
            {[5, 10, 20, 50].map((sz) => (
              <option key={sz} value={sz}>
                {sz} / hal
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-1 w-full sm:w-auto">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-md bg-white border border-palette-accent text-palette-text hover:bg-palette-accent/40 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden xs:inline sm:inline">Sebelumnya</span>
        </button>

        <div className="flex items-center gap-1 px-0.5">
          {pageNumbers.map((pageNum) => (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              className={`w-8 h-8 rounded-md font-mono tabular-nums text-xs font-semibold transition-colors cursor-pointer ${
                pageNum === safePage
                  ? 'bg-palette-primary text-white'
                  : 'bg-white border border-palette-accent text-palette-text hover:bg-palette-accent/40'
              }`}
            >
              {pageNum}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-md bg-white border border-palette-accent text-palette-text hover:bg-palette-accent/40 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <span className="hidden xs:inline sm:inline">Berikutnya</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
