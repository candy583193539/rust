export interface ConnectParams {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface TableColumn {
  name: string;
  data_type: string;
}

export interface QueryResult {
  columns: TableColumn[];
  rows: (string | number | boolean | null)[][];
  total: number;
}
