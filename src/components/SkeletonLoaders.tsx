import React from 'react';

interface TableDataSkeletonProps {
  rowCount?: number;
  columnCount?: number;
  showKpiCards?: boolean;
  showFilterBar?: boolean;
  titlePlaceholderWidth?: string;
}

export const TableDataSkeleton: React.FC<TableDataSkeletonProps> = ({
  rowCount = 5,
  columnCount = 6,
  showKpiCards = false,
  showFilterBar = true,
  titlePlaceholderWidth = 'w-56',
}) => {
  return (
    <div
      className="space-y-5 animate-pulse"
      role="status"
      aria-label="Memuat data tabel..."
    >
      {showKpiCards && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white border border-palette-accent rounded-xl p-5 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="h-3.5 w-28 bg-palette-accent/70 rounded" />
                <div className="h-4 w-16 bg-palette-accent/55 rounded" />
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <div className="h-7 w-14 bg-palette-accent/80 rounded" />
                <div className="h-3 w-20 bg-palette-accent/60 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {showFilterBar && (
        <div className="bg-white border border-palette-accent rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="h-9 w-full lg:w-80 bg-palette-accent/55 rounded-lg" />
          <div className="flex flex-wrap items-center gap-2">
            <div className="h-8 w-28 bg-palette-accent/60 rounded-lg" />
            <div className="h-8 w-24 bg-palette-accent/55 rounded-lg" />
            <div className="h-8 w-24 bg-palette-accent/55 rounded-lg" />
            <div className="h-8 w-20 bg-palette-accent/50 rounded-lg" />
          </div>
        </div>
      )}

      <div className="bg-white border border-palette-accent rounded-xl overflow-hidden">
        {/* Table Top Action Header Skeleton */}
        <div className="px-5 py-4 border-b border-palette-accent bg-palette-background/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-2">
            <div className={`h-4 ${titlePlaceholderWidth} bg-palette-accent/80 rounded`} />
            <div className="h-3 w-72 max-w-full bg-palette-accent/55 rounded" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="h-8 w-36 bg-palette-accent/65 rounded-lg" />
            <div className="h-8 w-28 bg-palette-accent/65 rounded-lg" />
            <div className="h-8 w-32 bg-palette-primary/30 rounded-lg" />
          </div>
        </div>

        {/* Table Rows Skeleton */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-palette-accent bg-palette-background">
                {Array.from({ length: columnCount }).map((_, colIdx) => (
                  <th key={colIdx} className="py-3.5 px-4">
                    <div
                      className={`h-3 bg-palette-accent/75 rounded ${
                        colIdx === 0 ? 'w-16' : colIdx === 1 ? 'w-32' : 'w-24'
                      }`}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-palette-accent/60">
              {Array.from({ length: rowCount }).map((_, rowIdx) => (
                <tr key={rowIdx}>
                  {Array.from({ length: columnCount }).map((__, colIdx) => (
                    <td key={colIdx} className="py-3.5 px-4">
                      {colIdx === 0 ? (
                        <div className="space-y-1.5">
                          <div className="h-3.5 w-24 bg-palette-accent/75 rounded" />
                          <div className="h-2.5 w-32 bg-palette-accent/50 rounded" />
                        </div>
                      ) : colIdx === 1 ? (
                        <div className="space-y-1.5">
                          <div className="h-3.5 w-40 bg-palette-accent/80 rounded" />
                          <div className="h-2.5 w-28 bg-palette-accent/50 rounded" />
                        </div>
                      ) : colIdx === columnCount - 1 ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="h-7 w-16 bg-palette-accent/65 rounded-md" />
                          <div className="h-7 w-7 bg-palette-accent/55 rounded-md" />
                        </div>
                      ) : (
                        <div className="h-4 w-20 bg-palette-accent/60 rounded" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer Skeleton */}
        <div className="px-5 py-3.5 border-t border-palette-accent bg-palette-background/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="h-3.5 w-48 bg-palette-accent/60 rounded" />
          <div className="flex items-center gap-2">
            <div className="h-7 w-20 bg-palette-accent/55 rounded-md" />
            <div className="h-7 w-7 bg-palette-accent/75 rounded-md" />
            <div className="h-7 w-7 bg-palette-accent/55 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const StudentResultCardSkeleton: React.FC = () => {
  return (
    <div
      className="bg-white border border-palette-accent rounded-xl overflow-hidden animate-pulse"
      role="status"
      aria-label="Memuat kartu hasil kelulusan peserta didik..."
    >
      {/* Top Status Banner Skeleton */}
      <div className="p-6 sm:p-8 border-b border-palette-accent bg-palette-background">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2">
              <div className="h-5 w-40 bg-palette-accent/80 rounded-md" />
              <div className="h-4 w-28 bg-palette-accent/60 rounded" />
            </div>
            <div className="h-8 w-64 sm:w-80 bg-palette-accent/85 rounded-lg" />
            <div className="h-4 w-56 bg-palette-accent/65 rounded" />
          </div>

          <div className="flex flex-col sm:items-end gap-2.5">
            <div className="h-9 w-44 bg-palette-accent/85 rounded-lg" />
            <div className="h-4 w-36 bg-palette-accent/60 rounded" />
          </div>
        </div>
      </div>

      {/* Main Body Skeleton */}
      <div className="p-6 sm:p-8 space-y-8">
        {/* Biodata Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-lg bg-palette-background border border-palette-accent">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="space-y-2">
              <div className="h-3 w-28 bg-palette-accent/65 rounded" />
              <div className="h-4 w-36 bg-palette-accent/85 rounded" />
            </div>
          ))}
        </div>

        {/* Academic Transcript Table Skeleton */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-60 bg-palette-accent/80 rounded" />
            <div className="h-3.5 w-28 bg-palette-accent/65 rounded" />
          </div>

          <div className="border border-palette-accent rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-palette-background border-b border-palette-accent">
                  <th className="py-3 px-4 w-12">
                    <div className="h-3 w-6 bg-palette-accent/75 rounded" />
                  </th>
                  <th className="py-3 px-4">
                    <div className="h-3 w-36 bg-palette-accent/75 rounded" />
                  </th>
                  <th className="py-3 px-4">
                    <div className="h-3 w-20 bg-palette-accent/75 rounded" />
                  </th>
                  <th className="py-3 px-4 text-right">
                    <div className="h-3 w-12 bg-palette-accent/75 rounded ml-auto" />
                  </th>
                  <th className="py-3 px-4 text-right">
                    <div className="h-3 w-16 bg-palette-accent/75 rounded ml-auto" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-palette-accent/70">
                {Array.from({ length: 8 }).map((_, rowIdx) => (
                  <tr key={rowIdx}>
                    <td className="py-3 px-4">
                      <div className="h-3.5 w-6 bg-palette-accent/60 rounded" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-3.5 w-48 max-w-full bg-palette-accent/75 rounded" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-3.5 w-20 bg-palette-accent/55 rounded" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-3.5 w-10 bg-palette-accent/55 rounded ml-auto" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 w-12 bg-palette-accent/80 rounded ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-palette-accent/35 border-t border-palette-accent">
                  <td colSpan={4} className="py-3.5 px-4">
                    <div className="h-4 w-44 bg-palette-accent/80 rounded" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="h-5 w-14 bg-palette-accent/90 rounded ml-auto" />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Bottom Action Footer Skeleton */}
        <div className="pt-4 border-t border-palette-accent flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="h-3.5 w-64 bg-palette-accent/60 rounded" />
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="h-9 w-28 bg-palette-accent/65 rounded-lg" />
            <div className="h-9 w-52 bg-palette-primary/35 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
};
