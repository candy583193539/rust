// 表配置：每个表的中文名、列定义（中文名 + 是否显示 + 是否可编辑）
// 后续新增表只需在这里加配置即可

export interface ColumnConfig {
  field: string;       // 数据库字段名
  label: string;       // 中文显示名
  visible?: boolean;   // 是否在表格中显示，默认 true
  editable?: boolean;  // 是否可编辑，默认 true
}

export interface TableConfig {
  tableName: string;       // schema.table 全名
  title: string;           // 中文页面标题
  columns: ColumnConfig[];
}

export const TABLE_CONFIGS: Record<string, TableConfig> = {
  "dbo.DEEP_GF_WasteInWarehouseDetail": {
    tableName: "dbo.DEEP_GF_WasteInWarehouseDetail",
    title: "产物入库",
    columns: [
      { field: "DWIWDID", label: "主键", visible: false, editable: false },
      { field: "deepWasteBarcode", label: "条码" },
      { field: "POBNum", label: "入库单号" },
      { field: "wasteName", label: "废物名称" },
      { field: "wasteCode", label: "废物代码" },
      { field: "deepwasteName", label: "细分废物名称" },
      { field: "deepwasteCode", label: "细分废物代码" },
      { field: "wasteInWHWeightCode", label: "称重编号" },
      { field: "wasteNum", label: "数量" },
      { field: "wasteWeight", label: "重量(kg)" },
      { field: "warehouseName", label: "仓库名称" },
      { field: "wasteInWHMan", label: "入库人" },
      { field: "wasteInWHTime", label: "入库时间" },
      { field: "workDate", label: "工作日期" },
      { field: "exchangeTime", label: "交换时间" },
      { field: "daytime", label: "日期" },
      { field: "id", label: "序号", editable: false },
      { field: "orgcode", label: "机构代码" },
    ],
  },
  "dbo.GF_ProductInWareHouseRecord": {
    tableName: "dbo.GF_ProductInWareHouseRecord",
    title: "产品入库",
    columns: [
      { field: "inWareID", label: "主键", visible: false, editable: false },
      { field: "proBarcode", label: "条码" },
      { field: "productName", label: "产品名称" },
      { field: "productCode", label: "产品代码" },
      { field: "number", label: "数量" },
      { field: "weight", label: "重量(kg)" },
      { field: "warehouseName", label: "仓库名称" },
      { field: "WHChargeMan", label: "仓管员" },
      { field: "inFacCode", label: "入库设施编号" },
      { field: "inWareType", label: "入库类型" },
      { field: "inWareTime", label: "入库时间" },
      { field: "workDate", label: "工作日期" },
      { field: "exchangeTime", label: "交换时间" },
      { field: "daytime", label: "日期" },
      { field: "id", label: "序号", editable: false },
      { field: "orgCode", label: "机构代码" },
      { field: "beizhu", label: "备注" },
    ],
  },
  "dbo.GF_ProDisdetail": {
    tableName: "dbo.GF_ProDisdetail",
    title: "拆解与领料",
    columns: [
      { field: "disDetailID", label: "主键", visible: false, editable: false },
      { field: "proBarcode", label: "条码" },
      { field: "productName", label: "产品名称" },
      { field: "productCode", label: "产品代码" },
      { field: "POBNum", label: "单号" },
      { field: "proNum", label: "数量" },
      { field: "proWeight", label: "重量(kg)" },
      { field: "disSweepTime", label: "扫码时间" },
      { field: "workDate", label: "工作日期" },
      { field: "exchangeTime", label: "交换时间" },
      { field: "daytime", label: "日期" },
      { field: "id", label: "序号", editable: false },
      { field: "orgCode", label: "机构代码" },
    ],
  },
  "dbo.GF_WasteOutWHDetail": {
    tableName: "dbo.GF_WasteOutWHDetail",
    title: "产物出库",
    columns: [
      { field: "WOWHDetailID", label: "主键", visible: false, editable: false },
      { field: "proBarcode", label: "条码" },
      { field: "WOWHCode", label: "出库单号" },
      { field: "wasteName", label: "废物名称" },
      { field: "wasteInWarehouseCode", label: "入库编号" },
      { field: "wasteNum", label: "数量" },
      { field: "wasteWeight", label: "重量(kg)" },
      { field: "warehouseName", label: "仓库名称" },
      { field: "WOWHMan", label: "出库人" },
      { field: "OutgoingMan", label: "发货人" },
      { field: "dealCode", label: "处置编号" },
      { field: "dealName", label: "处置名称" },
      { field: "WOWHTime", label: "出库时间" },
      { field: "workDate", label: "工作日期" },
      { field: "exchangeTime", label: "交换时间" },
      { field: "id", label: "序号", editable: false },
      { field: "orgCode", label: "机构代码" },
    ],
  },
};

// 根据 schema.table 全名查找配置
export function getTableConfig(fullName: string): TableConfig | undefined {
  return TABLE_CONFIGS[fullName];
}

// 获取所有已配置表名的中文映射
export function getTableLabel(fullName: string): string | undefined {
  return TABLE_CONFIGS[fullName]?.title;
}
