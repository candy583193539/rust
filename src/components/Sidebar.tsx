import { getTableLabel } from "../tableConfig";
import { IconDatabase, IconTable, IconUnlink } from "./Icons";
import "./Sidebar.css";

interface Props {
  tables: string[];
  selectedTable: string | null;
  onSelectTable: (table: string) => void;
  onDisconnect: () => void;
}

function Sidebar({ tables, selectedTable, onSelectTable, onDisconnect }: Props) {
  const configuredTables = tables.filter((t) => getTableLabel(t));

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <IconDatabase size={14} />
          数据表
          <span className="sidebar-title-dot" />
        </div>
        <button className="disconnect-btn" onClick={onDisconnect}>
          <IconUnlink size={12} />
          断开
        </button>
      </div>
      <nav className="sidebar-nav">
        {configuredTables.map((table) => (
          <div
            key={table}
            className={`table-item ${selectedTable === table ? "active" : ""}`}
            onClick={() => onSelectTable(table)}
          >
            <IconTable size={13} className="table-item-icon" />
            {getTableLabel(table)}
          </div>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
