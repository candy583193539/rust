mod db;

use db::{ConnectParams, DbClient};
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

#[tauri::command]
async fn connect(
    client: State<'_, DbClient>,
    host: String,
    port: u16,
    user: String,
    password: String,
    database: String,
) -> Result<String, String> {
    let params = ConnectParams {
        host,
        port,
        user,
        password,
        database,
    };
    let new_client = db::create_connection(&params).await?;
    let mut guard = client.lock().await;
    *guard = Some(new_client);
    Ok("连接成功".to_string())
}

#[tauri::command]
async fn get_tables(client: State<'_, DbClient>) -> Result<Vec<String>, String> {
    let mut guard = client.lock().await;
    let c = guard.as_mut().ok_or("未连接数据库")?;
    db::fetch_tables(c).await
}

#[tauri::command]
async fn query_table(
    client: State<'_, DbClient>,
    table_name: String,
    page: i64,
    page_size: i64,
) -> Result<db::QueryResult, String> {
    let mut guard = client.lock().await;
    let c = guard.as_mut().ok_or("未连接数据库")?;
    db::fetch_table_data(c, &table_name, page, page_size).await
}

#[tauri::command]
async fn update_row(
    client: State<'_, DbClient>,
    table_name: String,
    pk_column: String,
    pk_value: String,
    column: String,
    value: String,
) -> Result<u64, String> {
    let mut guard = client.lock().await;
    let c = guard.as_mut().ok_or("未连接数据库")?;
    db::execute_update(c, &table_name, &pk_column, &pk_value, &column, &value).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_client: DbClient = Arc::new(Mutex::new(None));

    tauri::Builder::default()
        .manage(db_client)
        .invoke_handler(tauri::generate_handler![
            connect,
            get_tables,
            query_table,
            update_row
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
