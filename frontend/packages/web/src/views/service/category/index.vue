<template>
  <CrmCard hide-footer no-content-bottom-padding>
    <div :key="tableRefreshIdKey" class="h-full">
      <CrmTable
        ref="crmTableRef"
        v-model:checked-row-keys="checkedRowKeys"
        v-bind="propsRes"
        class="crm-service-category-table"
        :action-config="actionConfig"
        @page-change="propsEvent.pageChange"
        @page-size-change="propsEvent.pageSizeChange"
        @sorter-change="propsEvent.sorterChange"
        @filter-change="propsEvent.filterChange"
        @batch-action="handleBatchAction"
        @refresh="searchData"
      >
        <template #actionLeft>
          <div class="flex items-center gap-[12px]">
            <n-button
              v-permission="['SERVICE_CATEGORY:ADD']"
              type="primary"
              @click="handleAdd"
            >
              {{ t('serviceCategory.createCategory') }}
            </n-button>
          </div>
        </template>
        <template #actionRight>
          <CrmSearchInput v-model:value="keyword" class="!w-[240px]" @search="searchData" />
        </template>
      </CrmTable>
    </div>
  </CrmCard>

  <!-- 添加/编辑对话框 -->
  <ServiceCategoryFormModal
    v-model:show="formModalVisible"
    :form-data="formData"
    @success="handleFormSuccess"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { NButton, useMessage } from 'naive-ui';
import { useI18n } from '@lib/shared/hooks/useI18n';
import type { TableQueryParams } from '@lib/shared/models/common';
import type { ServiceCategoryListItem, SaveServiceCategoryParams } from '@lib/shared/models/service-category';

import CrmCard from '@/components/pure/crm-card/index.vue';
import CrmSearchInput from '@/components/pure/crm-search-input/index.vue';
import CrmTable from '@/components/pure/crm-table/index.vue';
import type { BatchActionConfig } from '@/components/pure/crm-table/type';
import CrmOperationButton from '@/components/business/crm-operation-button/index.vue';
import ServiceCategoryFormModal from './components/ServiceCategoryFormModal.vue';

import { useServiceCategoryApi } from '@/api/modules';
import useModal from '@/hooks/useModal';
import { hasAnyPermission } from '@/utils/permission';
import useTable from '@/components/pure/crm-table/useTable';

const { t } = useI18n();
const Message = useMessage();
const { openModal } = useModal();

const serviceCategoryApi = useServiceCategoryApi();

const checkedRowKeys = ref<(string | number)[]>([]);
const keyword = ref('');
const formModalVisible = ref(false);
const formData = ref<SaveServiceCategoryParams | null>(null);
const tableRefreshIdKey = ref(0);

// 表格配置
const actionConfig: BatchActionConfig = {
  baseAction: [
    {
      label: t('common.batchDelete'),
      key: 'batchDelete',
      permission: ['SERVICE_CATEGORY:DELETE'],
    },
  ],
};

// 表格列定义
const columns = [
  {
    title: t('serviceCategory.code'),
    key: 'code',
    width: 150,
  },
  {
    title: t('serviceCategory.name'),
    key: 'name',
    width: 200,
  },
  {
    title: t('serviceCategory.parentName'),
    key: 'parent_name',
    width: 150,
  },
  {
    title: t('serviceCategory.displayOrder'),
    key: 'display_order',
    width: 120,
  },
  {
    title: t('serviceCategory.isActive'),
    key: 'is_active',
    width: 100,
    render: (row: ServiceCategoryListItem) => {
      return row.is_active ? t('common.yes') : t('common.no');
    },
  },
  {
    title: t('common.operation'),
    key: 'operation',
    width: 200,
    fixed: 'right',
    render: (row: ServiceCategoryListItem) => {
      return h(CrmOperationButton, {
        groupList: [
          {
            label: t('common.edit'),
            key: 'edit',
            permission: ['SERVICE_CATEGORY:UPDATE'],
          },
          {
            label: t('common.delete'),
            key: 'delete',
            permission: ['SERVICE_CATEGORY:DELETE'],
          },
        ],
        onSelect: (key: string) => handleActionSelect(row, key),
      });
    },
  },
];

// 表格 Hook
const { propsRes, propsEvent, loadList, setLoadListParams } = useTable({
  api: serviceCategoryApi.getServiceCategoryList,
  columns,
  immediate: false,
});

const crmTableRef = ref<InstanceType<typeof CrmTable>>();

// 搜索
const searchData = (val?: string) => {
  setLoadListParams({
    keyword: val ?? keyword.value,
    page: 1,
  });
  loadList();
  crmTableRef.value?.scrollTo({ top: 0 });
};

// 添加
const handleAdd = () => {
  formData.value = null;
  formModalVisible.value = true;
};

// 编辑
const handleEdit = (row: ServiceCategoryListItem) => {
  formData.value = {
    code: row.code,
    name: row.name,
    description: row.description,
    parent_id: row.parent_id,
    display_order: row.display_order,
    is_active: row.is_active,
  } as any;
  formModalVisible.value = true;
};

// 删除
const handleDelete = (row: ServiceCategoryListItem) => {
  openModal({
    type: 'error',
    title: t('serviceCategory.deleteConfirmTitle', { name: row.name }),
    content: t('serviceCategory.deleteConfirmContent'),
    positiveText: t('common.confirmDelete'),
    negativeText: t('common.cancel'),
    onPositiveClick: async () => {
      try {
        await serviceCategoryApi.deleteServiceCategory(row.id);
        Message.success(t('common.deleteSuccess'));
        tableRefreshIdKey.value += 1;
        searchData();
      } catch (error) {
        console.error('删除失败:', error);
      }
    },
  });
};

// 批量删除
const handleBatchDelete = () => {
  openModal({
    type: 'error',
    title: t('serviceCategory.batchDeleteTitle', { number: checkedRowKeys.value.length }),
    content: t('serviceCategory.batchDeleteContent'),
    positiveText: t('common.confirmDelete'),
    negativeText: t('common.cancel'),
    onPositiveClick: async () => {
      try {
        // 批量删除逻辑
        for (const id of checkedRowKeys.value) {
          await serviceCategoryApi.deleteServiceCategory(id as string);
        }
        checkedRowKeys.value = [];
        Message.success(t('common.deleteSuccess'));
        tableRefreshIdKey.value += 1;
        searchData();
      } catch (error) {
        console.error('批量删除失败:', error);
      }
    },
  });
};

// 操作选择
const handleActionSelect = (row: ServiceCategoryListItem, key: string) => {
  switch (key) {
    case 'edit':
      handleEdit(row);
      break;
    case 'delete':
      handleDelete(row);
      break;
    default:
      break;
  }
};

// 批量操作
const handleBatchAction = (item: { key: string }) => {
  switch (item.key) {
    case 'batchDelete':
      handleBatchDelete();
      break;
    default:
      break;
  }
};

// 表单成功回调
const handleFormSuccess = () => {
  formModalVisible.value = false;
  tableRefreshIdKey.value += 1;
  searchData();
};

onMounted(() => {
  searchData();
});
</script>

<style lang="less" scoped></style>

