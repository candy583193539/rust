import { useEffect, useState, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { QueryResult } from "../types";
import { getTableConfig, type ColumnConfig } from "../tableConfig";
import {
  IconFilter, IconSearch, IconChevronLeft, IconChevronRight,
  IconRows, IconSave, IconX, IconRefresh, IconInbox
} from "./Icons";
import "./DataTable.css";

interface Props {
  tableName: string;
}

const PAGE_SIZE = 50;

// Simple fuzzy match: all chars of pattern appear in order in str
function fuzzyMatch(str: string, pattern: string): boolean {
  if (!pattern) return true;
  const s = str.toLowerCase();
  const p = pattern.toLowerCase();
  let si = 0;
  for (let pi = 0; pi < p.length; pi++) {
    const idx = s.indexOf(p[pi], si);
    if (idx < 0) return false;
    si = idx + 1;
  }
  return true;
}

function DataTable({ tableName }: Props) {
  const [data, setData] = useState<QueryResult | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [filterOpen, setFilterOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<Record<string, string>>({});
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});

  const [detailRow, setDetailRow] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const config = getTableConfig(tableName);

  const displayColumns = useMemo(() => {
    if (!data) return [];
    if (config) {
      return config.columns
        .filter((cc) => cc.visible !== false)
        .map((cc) => {
          const dataIdx = data.columns.findIndex((dc) => dc.name === cc.field);
          return { ...cc, dataIdx };
        })
        .filter((cc) => cc.dataIdx >= 0);
    }
    return data.columns
      .map((dc, i) => ({ field: dc.name, label: dc.name, visible: true, editable: true, dataIdx: i }))
      .filter((_, i) => i > 0);
  }, [data, config]);

  const pkIdx = 0;

  const loadData = useCallback(async (p: number) => {
    setLoading(true);
    setError("");
    try {
      const result = await invoke<QueryResult>("query_table", {
        tableName,
        page: p,
        pageSize: PAGE_SIZE,
      });
      setData(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [tableName]);

  useEffect(() => {
    setPage(1);
    setDraftFilters({});
    setAppliedFilters({});
    setFilterOpen(false);
    setDetailRow(null);
    loadData(1);
  }, [tableName, loadData]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadData(newPage);
  };

  const handleSearch = () => {
    setAppliedFilters({ ...draftFilters });
  };

  const handleReset = () => {
    setDraftFilters({});
    setAppliedFilters({});
  };

  const activeFilterCount = Object.values(appliedFilters).filter(v => v.trim()).length;
  const hasDraft = Object.values(draftFilters).some(v => v.trim());

  const filteredRows = data
    ? data.rows.filter((row) =>
        Object.entries(appliedFilters).every(([field, keyword]) => {
          if (!keyword.trim()) return true;
          const colIdx = data.columns.findIndex((c) => c.name === field);
          if (colIdx < 0) return true;
          return fuzzyMatch(String(row[colIdx] ?? ""), keyword);
        })
      )
    : [];

  const openDetail = (filteredIdx: number) => {
    if (!data) return;
    const row = filteredRows[filteredIdx];
    const rowIdx = data.rows.indexOf(row);
    setDetailRow(rowIdx);
    const vals: Record<string, string> = {};
    data.columns.forEach((col, i) => {
      vals[col.name] = row[i] === null ? "" : String(row[i]);
    });
    setEditValues(vals);
  };

  const closeDetail = () => {
    setDetailRow(null);
    setEditValues({});
  };

  const detailColumns = useMemo(() => {
    if (!data) return [];
    if (config) {
      return config.columns
        .filter((cc) => cc.visible !== false)
        .map((cc) => {
          const dataIdx = data.columns.findIndex((dc) => dc.name === cc.field);
          return { ...cc, dataIdx };
        })
        .filter((cc) => cc.dataIdx >= 0);
    }
    return data.columns
      .map((dc, i) => ({ field: dc.name, label: dc.name, editable: true, dataIdx: i } as ColumnConfig & { dataIdx: number }))
      .filter((_, i) => i > 0);
  }, [data, config]);

  const handleSave = async () => {
    if (detailRow === null || !data || data.columns.length === 0) return;
    setSaving(true);
    setError("");
    const pkColumn = data.columns[pkIdx].name;
    const pkValue = String(data.rows[detailRow][pkIdx] ?? "");
    try {
      for (const dc of detailColumns) {
        if (dc.editable === false) continue;
        const oldVal = String(data.rows[detailRow][dc.dataIdx] ?? "");
        const newVal = editValues[dc.field] ?? "";
        if (newVal !== oldVal) {
          await invoke("update_row", { tableName, pkColumn, pkValue, column: dc.field, value: newVal });
        }
      }
      await loadData(page);
      closeDetail();
      setToast("保存成功");
      setTimeout(() => setToast(""), 2000);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) return (
    <div className="loading">
      <div className="loading-spinner" />
      加载中...
    </div>
  );
  if (error && !data) return <div className="table-error">{error}</div>;
  if (!data) return null;

  const totalPages = Math.ceil(data.total / PAGE_SIZE);
  const pageTitle = config?.title ?? tableName;

  return (
    <div className="data-table-wrapper">
      {/* Header */}
      <div className="table-header">
        <h3>{pageTitle}</h3>
        <div className="table-header-right">
          <div className="table-stats">
            <span className="table-stats-badge"><IconRows size={11} /> 共 {data.total} 条</span>
            {activeFilterCount > 0 && (
              <span className="table-stats-badge filtered">筛选后 {filteredRows.length} 条</span>
            )}
          </div>
          <button
            className={`filter-toggle-btn ${filterOpen ? "open" : ""} ${activeFilterCount > 0 ? "active" : ""}`}
            onClick={() => setFilterOpen(v => !v)}
          >
            <IconFilter size={13} />
            筛选
            {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
            <span className={`filter-chevron ${filterOpen ? "up" : ""}`}>›</span>
          </button>
        </div>
      </div>

      {/* Collapsible filter panel */}
      <div className={`filter-panel ${filterOpen ? "open" : ""}`}>
        <div className="filter-panel-inner">
          <div className="filter-fields">
            {displayColumns.map((col) => (
              <div className="filter-item" key={col.field}>
                <label className="filter-item-label">{col.label}</label>
                <input
                  className="filter-item-input"
                  placeholder="模糊搜索..."
                  value={draftFilters[col.field] ?? ""}
                  onChange={(e) =>
                    setDraftFilters((f) => ({ ...f, [col.field]: e.target.value }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
            ))}
          </div>
          <div className="filter-actions">
            <button className="filter-btn-search" onClick={handleSearch}>
              <IconSearch size={13} />
              搜索
            </button>
            {(hasDraft || activeFilterCount > 0) && (
              <button className="filter-btn-reset" onClick={handleReset}>重置</button>
            )}
          </div>
        </div>
      </div>

      {error && <div className="table-error">{error}</div>}

      {/* Table */}
      <div className="table-container">
        {filteredRows.length === 0 && !loading ? (
          <div className="table-empty">
            <IconInbox size={36} />
            <span>{activeFilterCount > 0 ? "没有匹配的数据" : "暂无数据"}</span>
          </div>
        ) : (
        <table>
          <thead>
            <tr>
              {displayColumns.map((col) => (
                <th key={col.field} title={col.field}>
                  <span>{col.label}</span>
                  {appliedFilters[col.field]?.trim() && (
                    <span className="th-filter-dot" />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, fIdx) => (
              <tr key={fIdx} onClick={() => openDetail(fIdx)}>
                {displayColumns.map((col) => (
                  <td key={col.field}>
                    {row[col.dataIdx] === null ? (
                      <span className="null-value">null</span>
                    ) : (
                      String(row[col.dataIdx])
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>
            <IconChevronLeft size={13} /> 上一页
          </button>
          <span className="pagination-info">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => handlePageChange(page + 1)}>
            下一页 <IconChevronRight size={13} />
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {detailRow !== null && data && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{pageTitle} - 详情</h3>
              <button className="modal-close" onClick={closeDetail}><IconX size={14} /></button>
            </div>
            <div className="modal-body">
              {detailColumns.map((col) => (
                <label key={col.field} className="detail-field">
                  <span className="detail-label">{col.label}</span>
                  <input
                    className="detail-input"
                    value={editValues[col.field] ?? ""}
                    readOnly={col.editable === false}
                    onChange={(e) =>
                      setEditValues((v) => ({ ...v, [col.field]: e.target.value }))
                    }
                  />
                </label>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeDetail}>
                <IconX size={13} /> 取消
              </button>
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <><span className="btn-spinner-sm" /> 保存中...</>
                ) : (
                  <><IconSave size={13} /> 保存</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default DataTable;
