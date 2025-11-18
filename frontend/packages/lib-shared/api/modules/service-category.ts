import type { CordysAxios } from '@lib/shared/api/http/Axios';
import {
  GetServiceCategoryListUrl,
  GetServiceCategoryUrl,
  AddServiceCategoryUrl,
  UpdateServiceCategoryUrl,
  DeleteServiceCategoryUrl,
} from '@lib/shared/api/requrls/service-category';
import type { CommonList, TableQueryParams } from '@lib/shared/models/common';
import type {
  ServiceCategoryListItem,
  ServiceCategoryDetail,
  SaveServiceCategoryParams,
  UpdateServiceCategoryParams,
  ServiceCategoryTableParams,
} from '@lib/shared/models/service-category';

export default function useServiceCategoryApi(CDR: CordysAxios) {
  // 获取服务分类列表
  function getServiceCategoryList(data: ServiceCategoryTableParams) {
    return CDR.get<CommonList<ServiceCategoryListItem>>({
      url: GetServiceCategoryListUrl,
      params: data,
    });
  }

  // 获取服务分类详情
  function getServiceCategory(id: string) {
    return CDR.get<ServiceCategoryDetail>({ url: `${GetServiceCategoryUrl}/${id}` });
  }

  // 添加服务分类
  function addServiceCategory(data: SaveServiceCategoryParams) {
    return CDR.post({ url: AddServiceCategoryUrl, data });
  }

  // 更新服务分类
  function updateServiceCategory(id: string, data: UpdateServiceCategoryParams) {
    return CDR.put({ url: `${UpdateServiceCategoryUrl}/${id}`, data });
  }

  // 删除服务分类
  function deleteServiceCategory(id: string) {
    return CDR.delete({ url: `${DeleteServiceCategoryUrl}/${id}` });
  }

  return {
    getServiceCategoryList,
    getServiceCategory,
    addServiceCategory,
    updateServiceCategory,
    deleteServiceCategory,
  };
}



