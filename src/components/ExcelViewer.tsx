import React, { useEffect, useMemo, useState } from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState
} from "@tanstack/react-table"
import * as XLSX from "xlsx"

import { validateFileBytes } from "~utils/file"
import { t, te } from "~utils/i18n"

interface ExcelViewerProps {
  blob: Blob
}

type SheetRow = (string | number | boolean | Date | null | undefined)[]

interface SheetColumn {
  id: string
  label: string
}

interface SheetModel {
  name: string
  columns: SheetColumn[]
  rows: Record<string, string>[]
}

function formatCell(value: unknown): string {
  if (value == null || value === "") return ""
  if (value instanceof Date) return value.toLocaleString()
  return String(value)
}

function columnLetter(index: number): string {
  let result = ""
  let n = index
  do {
    result = String.fromCharCode(65 + (n % 26)) + result
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return result
}

function buildSheetModel(name: string, sheet: XLSX.WorkSheet): SheetModel {
  const rawRows = XLSX.utils.sheet_to_json<SheetRow>(sheet, {
    header: 1,
    defval: "",
    raw: false
  })

  if (!rawRows.length) {
    return { name, columns: [], rows: [] }
  }

  const maxCols = rawRows.reduce((max, row) => Math.max(max, row.length), 0)

  const columns: SheetColumn[] = Array.from({ length: maxCols }, (_, index) => ({
    id: `col_${index}`,
    label: columnLetter(index)
  }))

  const rows = rawRows.map((row) => {
    const record: Record<string, string> = {}
    columns.forEach((col, index) => {
      record[col.id] = formatCell(row[index])
    })
    return record
  })

  return { name, columns, rows }
}

function ExcelDataGrid({ sheet }: { sheet: SheetModel }) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState("")

  const columns = useMemo<ColumnDef<Record<string, string>>[]>(
    () =>
      sheet.columns.map((col) => ({
        accessorKey: col.id,
        header: col.label,
        cell: (info) => info.getValue<string>() || "",
        filterFn: "includesString"
      })),
    [sheet.columns]
  )

  const table = useReactTable({
    data: sheet.rows,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  })

  const visibleCount = table.getFilteredRowModel().rows.length
  const totalCount = sheet.rows.length

  return (
    <div className="flex flex-col gap-3 min-h-0">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder={t("excel_globalSearch")}
          className="flex-1 min-w-[200px] px-3 py-2 text-sm border rounded-lg dp-viewer-input focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
        />
        <span className="text-xs dp-text-muted whitespace-nowrap">
          {t("excel_rowsShown", [String(visibleCount), String(totalCount)])}
        </span>
        {(globalFilter || columnFilters.length > 0 || sorting.length > 0) && (
          <button
            onClick={() => {
              setGlobalFilter("")
              setColumnFilters([])
              setSorting([])
            }}
            className="text-xs dp-text-muted hover:text-blue-600 px-2 py-1 rounded dp-surface-muted hover:opacity-90">
            {t("excel_clearFilters")}
          </button>
        )}
      </div>

      <div className="overflow-auto max-h-[calc(100vh-280px)] border rounded-lg dp-viewer-table dp-surface">
        <table className="dp-viewer-table w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 shadow-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="border-b border-r px-2 py-2 text-left align-top min-w-[120px] last:border-r-0">
                    {header.isPlaceholder ? null : (
                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1 font-medium hover:text-blue-600 w-full text-left"
                          style={{ color: "var(--dp-text)" }}>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {{
                            asc: " ↑",
                            desc: " ↓"
                          }[header.column.getIsSorted() as string] ?? (
                            <span className="dp-text-muted text-xs">↕</span>
                          )}
                        </button>
                        {header.column.getCanFilter() && (
                          <input
                            value={(header.column.getFilterValue() as string) ?? ""}
                            onChange={(e) =>
                              header.column.setFilterValue(e.target.value)
                            }
                            placeholder={t("excel_filter")}
                            className="w-full px-2 py-1 text-xs border rounded dp-viewer-input focus:outline-none focus:ring-1 focus:ring-blue-200"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={sheet.columns.length || 1}
                  className="px-4 py-8 text-center dp-text-muted">
                  {t("excel_noData")}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="border-b border-r px-2 py-1.5 align-top whitespace-pre-wrap break-words last:border-r-0">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ExcelViewer({ blob }: ExcelViewerProps) {
  const [sheets, setSheets] = useState<SheetModel[]>([])
  const [activeSheet, setActiveSheet] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const render = async () => {
      setLoading(true)
      setError(null)

      try {
        const buffer = await blob.arrayBuffer()
        const bytes = new Uint8Array(buffer)

        if (!validateFileBytes(bytes, "xlsx")) {
          throw te("excel_invalid")
        }

        const workbook = XLSX.read(buffer, {
          type: "array",
          codepage: 65001,
          cellText: true,
          cellDates: true
        })

        if (!workbook.SheetNames.length) {
          throw te("excel_noSheet")
        }

        const models = workbook.SheetNames.map((name) =>
          buildSheetModel(name, workbook.Sheets[name])
        )

        if (!cancelled) {
          setSheets(models)
          setActiveSheet(0)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("excel_parseFailed"))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    render()
    return () => {
      cancelled = true
    }
  }, [blob])

  if (error) {
    return <div className="text-red-500 text-sm">{error}</div>
  }

  if (loading || !sheets.length) {
    return (
      <div className="text-sm dp-text-muted">{t("excel_parsing")}</div>
    )
  }

  const current = sheets[activeSheet]

  return (
    <div className="flex flex-col gap-3 min-h-0">
      {sheets.length > 1 && (
        <div
          className="flex flex-wrap gap-1 border-b pb-2"
          style={{ borderColor: "var(--dp-border)" }}>
          {sheets.map((sheet, index) => (
            <button
              key={sheet.name}
              onClick={() => setActiveSheet(index)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                activeSheet === index
                  ? "bg-blue-600 text-white font-medium"
                  : "dp-surface-muted hover:opacity-90"
              }`}
              style={
                activeSheet === index ? undefined : { color: "var(--dp-text)" }
              }>
              {sheet.name}
            </button>
          ))}
        </div>
      )}

      {sheets.length === 1 && (
        <p className="text-xs dp-text-muted">{t("excel_sheet", current.name)}</p>
      )}

      <ExcelDataGrid key={current.name} sheet={current} />
    </div>
  )
}
