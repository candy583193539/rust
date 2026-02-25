import { useEffect, useState, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { QueryResult } from "../types";
import { getTableConfig, type ColumnConfig } from "../tableConfig";
import "./DataTable.css";

interface Props {
  tableName: string;
}

const PAGE_SIZE = 50;

function DataTable({ tableName }: Props) {
  const [data, setData] = useState<QueryResult | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // draft: what user is typing; applied: what's actually filtering
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

  const hasActiveDraft = Object.values(draftFilters).some(v => v.trim());
  const hasActiveFilter = Object.values(appliedFilters).some(v => v.trim());

  const filteredRows = data
    ? data.rows.filter((row) =>
        Object.entries(appliedFilters).every(([field, keyword]) => {
          if (!keyword.trim()) return true;
          const colIdx = data.columns.findIndex((c) => c.name === field);
          if (colIdx < 0) return true;
          const val = row[colIdx];
          return String(val ?? "").toLowerCase().includes(keyword.toLowerCase());
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
        <div className="table-stats">
          <span className="table-stats-badge">共 {data.total} 条</span>
          {hasActiveFilter && (
            <span className="table-stats-badge filtered">筛选后 {filteredRows.length} 条</span>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="filter-fields">
          {displayColumns.map((col) => (
            <div className="filter-item" key={col.field}>
              <label className="filter-item-label">{col.label}</label>
              <input
                className="filter-item-input"
                placeholder="输入筛选..."
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
            <span className="filter-btn-icon">⌕</span>
            搜索
          </button>
          {(hasActiveDraft || hasActiveFilter) && (
            <button className="filter-btn-reset" onClick={handleReset}>
              重置
            </button>
          )}
        </div>
      </div>

      {error && <div className="table-error">{error}</div>}

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              {displayColumns.map((col) => (
                <th key={col.field} title={col.field}>
                  {col.label}
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
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>
            ← 上一页
          </button>
          <span className="pagination-info">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => handlePageChange(page + 1)}>
            下一页 →
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {detailRow !== null && data && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{pageTitle} - 详情</h3>
              <button className="modal-close" onClick={closeDetail}>×</button>
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
              <button className="btn-cancel" onClick={closeDetail}>取消</button>
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? "保存中..." : "保存"}
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
