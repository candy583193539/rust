import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import ConnectForm from "./components/ConnectForm";
import Sidebar from "./components/Sidebar";
import DataTable from "./components/DataTable";
import "./App.css";

const DEFAULT_CONN = {
  host: "192.168.16.248",
  port: 1433,
  user: "cpfirst",
  password: "cpfirst",
  database: "etads",
};

function App() {
  const [connected, setConnected] = useState(false);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [autoConnecting, setAutoConnecting] = useState(true);

  const doConnect = async (params: typeof DEFAULT_CONN) => {
    await invoke("connect", params);
    const tableList = await invoke<string[]>("get_tables");
    setTables(tableList);
    setConnected(true);
    setSelectedTable(null);
  };

  useEffect(() => {
    doConnect(DEFAULT_CONN)
      .catch(() => {})
      .finally(() => setAutoConnecting(false));
  }, []);

  const handleDisconnect = () => {
    setConnected(false);
    setTables([]);
    setSelectedTable(null);
  };

  if (autoConnecting) {
    return (
      <div className="connecting-screen">
        <div className="connecting-spinner" />
        <span className="connecting-text">正在连接数据库...</span>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="app">
        <ConnectForm onConnect={doConnect} />
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar
        tables={tables}
        selectedTable={selectedTable}
        onSelectTable={setSelectedTable}
        onDisconnect={handleDisconnect}
      />
      <main className="content">
        {selectedTable ? (
          <DataTable tableName={selectedTable} />
        ) : (
          <div className="placeholder">请从左侧选择一个表</div>
        )}
      </main>
    </div>
  );
}

export default App;
