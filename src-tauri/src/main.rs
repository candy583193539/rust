#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Debug 模式下自动启动 Vite dev server
    #[cfg(debug_assertions)]
    let _vite = {
        use std::process::Command;
        // 项目根目录是 src-tauri 的上一级
        let project_root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .expect("无法获取项目根目录")
            .to_path_buf();

        Command::new("npm")
            .arg("run")
            .arg("dev")
            .current_dir(&project_root)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .expect("启动 Vite dev server 失败，请确保已运行 npm install")
    };

    // 等待 Vite 启动
    #[cfg(debug_assertions)]
    std::thread::sleep(std::time::Duration::from_secs(2));

    national_lib::run();
}
