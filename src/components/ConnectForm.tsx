import { useState } from "react";
import { IconHost, IconPort, IconUser, IconLock, IconDatabase } from "./Icons";
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
          <div className="connect-form-logo-icon">
            <IconDatabase size={22} />
          </div>
        </div>
        <h2>连接 SQL Server</h2>
        <p className="connect-form-subtitle">输入数据库连接信息</p>
        <label>
          主机
          <div className="input-icon-wrap">
            <IconHost size={14} className="input-icon" />
            <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="192.168.x.x" />
          </div>
        </label>
        <label>
          端口
          <div className="input-icon-wrap">
            <IconPort size={14} className="input-icon" />
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              placeholder="1433"
            />
          </div>
        </label>
        <label>
          用户名
          <div className="input-icon-wrap">
            <IconUser size={14} className="input-icon" />
            <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="username" />
          </div>
        </label>
        <label>
          密码
          <div className="input-icon-wrap">
            <IconLock size={14} className="input-icon" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </label>
        <label>
          数据库
          <div className="input-icon-wrap">
            <IconDatabase size={14} className="input-icon" />
            <input
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              placeholder="database name"
            />
          </div>
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
