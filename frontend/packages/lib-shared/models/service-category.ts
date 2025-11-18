// 服务分类相关类型定义

// 服务分类列表项
export interface ServiceCategoryListItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  parent_id?: string;
  parent_name?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 服务分类详情
export interface ServiceCategoryDetail extends ServiceCategoryListItem {
  // 可以包含更多详情字段
}

// 服务分类表格参数
export interface ServiceCategoryTableParams {
  page?: number;
  size?: number;
  code?: string;
  name?: string;
  parent_id?: string;
  is_active?: boolean;
}

// 保存服务分类参数
export interface SaveServiceCategoryParams {
  code: string;
  name: string;
  description?: string;
  parent_id?: string;
  display_order?: number;
  is_active?: boolean;
}

// 更新服务分类参数
export interface UpdateServiceCategoryParams {
  name?: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
}



