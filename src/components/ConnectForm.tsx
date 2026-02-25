import { useState } from "react";
import "./ConnectForm.css";

interface Props {
  onConnect: (params: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  }) => Promise<void>;
}

function ConnectForm({ onConnect }: Props) {
  const [host, setHost] = useState("192.168.16.248");
  const [port, setPort] = useState(1433);
  const [user, setUser] = useState("cpfirst");
  const [password, setPassword] = useState("cpfirst");
  const [database, setDatabase] = useState("etads");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await onConnect({ host, port, user, password, database });
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="connect-wrapper">
      <form className="connect-form" onSubmit={handleSubmit}>
        <div className="connect-form-logo">
          <div className="connect-form-logo-icon">🗄️</div>
        </div>
        <h2>连接 SQL Server</h2>
        <p className="connect-form-subtitle">输入数据库连接信息</p>
        <label>
          主机
          <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="192.168.x.x" />
        </label>
        <label>
          端口
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(Number(e.target.value))}
            placeholder="1433"
          />
        </label>
        <label>
          用户名
          <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="username" />
        </label>
        <label>
          密码
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>
        <label>
          数据库
          <input
            value={database}
            onChange={(e) => setDatabase(e.target.value)}
            placeholder="database name"
          />
        </label>
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? (
            <span className="btn-loading">
              <span className="btn-spinner" />
              连接中...
            </span>
          ) : "连接"}
        </button>
      </form>
    </div>
  );
}

export default ConnectForm;
