use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tiberius::{AuthMethod, Client, Config, EncryptionLevel, Row, numeric::Decimal};
use tokio::net::TcpStream;
use tokio::sync::Mutex;
use tokio_util::compat::TokioAsyncWriteCompatExt;
use chrono::NaiveDateTime;

pub type DbClient = Arc<Mutex<Option<Client<tokio_util::compat::Compat<TcpStream>>>>>;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConnectParams {
    pub host: String,
    pub port: u16,
    pub user: String,
    pub password: String,
    pub database: String,
}

#[derive(Debug, Serialize)]
pub struct TableColumn {
    pub name: String,
    pub data_type: String,
}

#[derive(Debug, Serialize)]
pub struct QueryResult {
    pub columns: Vec<TableColumn>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub total: i64,
}

pub async fn create_connection(
    params: &ConnectParams,
) -> Result<Client<tokio_util::compat::Compat<TcpStream>>, String> {
    let mut config = Config::new();
    config.host(&params.host);
    config.port(params.port);
    config.authentication(AuthMethod::sql_server(&params.user, &params.password));
    config.database(&params.database);
    config.trust_cert();
    config.encryption(EncryptionLevel::NotSupported);

    let tcp = TcpStream::connect(config.get_addr())
        .await
        .map_err(|e| format!("TCP 连接失败: {}", e))?;
    tcp.set_nodelay(true)
        .map_err(|e| format!("设置 TCP 选项失败: {}", e))?;

    let client = Client::connect(config, tcp.compat_write())
        .await
        .map_err(|e| format!("SQL Server 连接失败: {}", e))?;

    Ok(client)
}

pub async fn fetch_tables(
    client: &mut Client<tokio_util::compat::Compat<TcpStream>>,
) -> Result<Vec<String>, String> {
    let stream = client
        .simple_query(
            "SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_SCHEMA, TABLE_NAME",
        )
        .await
        .map_err(|e| format!("查询表列表失败: {}", e))?;

    let rows = stream
        .into_first_result()
        .await
        .map_err(|e| format!("读取结果失败: {}", e))?;

    let tables: Vec<String> = rows
        .iter()
        .map(|row| {
            let schema: &str = row.get(0).unwrap_or("dbo");
            let name: &str = row.get(1).unwrap_or("");
            format!("{}.{}", schema, name)
        })
        .collect();

    Ok(tables)
}

fn row_to_json_values(row: &Row) -> Vec<serde_json::Value> {
    let mut values = Vec::new();
    for i in 0..row.columns().len() {
        let val = try_extract_value(row, i);
        values.push(val);
    }
    values
}

fn try_extract_value(row: &Row, idx: usize) -> serde_json::Value {
    // String types: varchar, nvarchar, char, nchar, text, ntext
    if let Some(v) = row.try_get::<&str, _>(idx).ok().flatten() {
        return serde_json::Value::String(v.to_string());
    }
    // tinyint -> u8
    if let Some(v) = row.try_get::<u8, _>(idx).ok().flatten() {
        return serde_json::json!(v);
    }
    // smallint -> i16
    if let Some(v) = row.try_get::<i16, _>(idx).ok().flatten() {
        return serde_json::json!(v);
    }
    // int -> i32
    if let Some(v) = row.try_get::<i32, _>(idx).ok().flatten() {
        return serde_json::json!(v);
    }
    // bigint -> i64
    if let Some(v) = row.try_get::<i64, _>(idx).ok().flatten() {
        return serde_json::json!(v);
    }
    // real -> f32
    if let Some(v) = row.try_get::<f32, _>(idx).ok().flatten() {
        return serde_json::json!(v);
    }
    // float -> f64
    if let Some(v) = row.try_get::<f64, _>(idx).ok().flatten() {
        return serde_json::json!(v);
    }
    // decimal, numeric, money, smallmoney
    if let Some(v) = row.try_get::<Decimal, _>(idx).ok().flatten() {
        return serde_json::Value::String(format!("{}", v));
    }
    // bit -> bool
    if let Some(v) = row.try_get::<bool, _>(idx).ok().flatten() {
        return serde_json::json!(v);
    }
    // datetime, datetime2, smalldatetime
    if let Some(v) = row.try_get::<NaiveDateTime, _>(idx).ok().flatten() {
        return serde_json::Value::String(v.format("%Y-%m-%d %H:%M:%S").to_string());
    }
    // date
    if let Some(v) = row.try_get::<chrono::NaiveDate, _>(idx).ok().flatten() {
        return serde_json::Value::String(v.format("%Y-%m-%d").to_string());
    }
    // time
    if let Some(v) = row.try_get::<chrono::NaiveTime, _>(idx).ok().flatten() {
        return serde_json::Value::String(v.format("%H:%M:%S").to_string());
    }
    // uniqueidentifier (uuid) -> read as string via Uuid
    if let Some(v) = row.try_get::<tiberius::Uuid, _>(idx).ok().flatten() {
        return serde_json::Value::String(v.to_string());
    }
    // binary, varbinary, image
    if let Some(v) = row.try_get::<&[u8], _>(idx).ok().flatten() {
        let hex: String = v.iter().map(|b| format!("{:02x}", b)).collect();
        return serde_json::Value::String(hex);
    }
    serde_json::Value::Null
}

pub async fn fetch_table_data(
    client: &mut Client<tokio_util::compat::Compat<TcpStream>>,
    table_name: &str,
    page: i64,
    page_size: i64,
) -> Result<QueryResult, String> {
    // Validate table name to prevent SQL injection (must be schema.table format)
    if !table_name
        .chars()
        .all(|c| c.is_alphanumeric() || c == '.' || c == '_')
    {
        return Err("无效的表名".to_string());
    }

    let offset = (page - 1) * page_size;

    // Get total count
    let count_sql = format!("SELECT COUNT(*) FROM [{}]", table_name.replace('.', "].["));
    let count_stream = client
        .simple_query(&count_sql)
        .await
        .map_err(|e| format!("查询总数失败: {}", e))?;
    let count_rows = count_stream
        .into_first_result()
        .await
        .map_err(|e| format!("读取总数失败: {}", e))?;
    let total: i32 = count_rows
        .first()
        .and_then(|r| r.get(0))
        .unwrap_or(0);

    // Get paginated data - use ROW_NUMBER() for compatibility with older SQL Server
    let escaped_table = table_name.replace('.', "].[");

    // First get column names to exclude __rownum__ from outer SELECT
    let col_sql = format!(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '{}' AND TABLE_NAME = '{}' ORDER BY ORDINAL_POSITION",
        if let Some(dot) = table_name.find('.') { &table_name[..dot] } else { "dbo" },
        if let Some(dot) = table_name.find('.') { &table_name[dot+1..] } else { table_name }
    );
    let col_stream = client
        .simple_query(&col_sql)
        .await
        .map_err(|e| format!("查询列名失败: {}", e))?;
    let col_rows = col_stream
        .into_first_result()
        .await
        .map_err(|e| format!("读取列名失败: {}", e))?;
    let real_columns: Vec<String> = col_rows
        .iter()
        .filter_map(|r| r.get::<&str, _>(0).map(|s| s.to_string()))
        .collect();
    let has_exchange_time = real_columns.iter().any(|c| c == "exchangeTime");
    let order_by = if has_exchange_time { "[exchangeTime] DESC" } else { "(SELECT NULL)" };
    let columns_list = real_columns.iter().map(|c| format!("[{}]", c)).collect::<Vec<_>>().join(", ");

    let data_sql = format!(
        "SELECT {} FROM (SELECT ROW_NUMBER() OVER (ORDER BY {}) AS __rownum__, * FROM [{}]) AS __t__ WHERE __rownum__ > {} AND __rownum__ <= {} ORDER BY __rownum__",
        columns_list,
        order_by,
        escaped_table,
        offset,
        offset + page_size
    );
    let data_stream = client
        .simple_query(&data_sql)
        .await
        .map_err(|e| format!("查询数据失败: {}", e))?;
    let data_rows = data_stream
        .into_first_result()
        .await
        .map_err(|e| format!("读取数据失败: {}", e))?;

    let columns: Vec<TableColumn> = if let Some(first_row) = data_rows.first() {
        first_row
            .columns()
            .iter()
            .map(|col| TableColumn {
                name: col.name().to_string(),
                data_type: format!("{:?}", col.column_type()),
            })
            .collect()
    } else {
        Vec::new()
    };

    let rows: Vec<Vec<serde_json::Value>> = data_rows.iter().map(row_to_json_values).collect();

    Ok(QueryResult {
        columns,
        rows,
        total: total as i64,
    })
}

pub async fn execute_update(
    client: &mut Client<tokio_util::compat::Compat<TcpStream>>,
    table_name: &str,
    pk_column: &str,
    pk_value: &str,
    column: &str,
    value: &str,
) -> Result<u64, String> {
    // Validate identifiers
    for name in [table_name, pk_column, column] {
        if !name
            .chars()
            .all(|c| c.is_alphanumeric() || c == '.' || c == '_')
        {
            return Err(format!("无效的标识符: {}", name));
        }
    }

    let sql = format!(
        "UPDATE [{}] SET [{}] = @P1 WHERE [{}] = @P2",
        table_name.replace('.', "].["),
        column,
        pk_column
    );

    let result = client
        .execute(&sql, &[&value, &pk_value])
        .await
        .map_err(|e| format!("更新失败: {}", e))?;

    Ok(result.total())
}
