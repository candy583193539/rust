import { getTableLabel } from "../tableConfig";
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
          <span className="sidebar-title-dot" />
          数据表
        </div>
        <button className="disconnect-btn" onClick={onDisconnect}>
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
            {getTableLabel(table)}
          </div>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
