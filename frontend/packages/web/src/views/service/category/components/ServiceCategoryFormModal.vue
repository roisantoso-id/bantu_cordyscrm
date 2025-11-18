<template>
  <n-modal
    v-model:show="show"
    preset="dialog"
    :title="formData?.id ? t('serviceCategory.editCategory') : t('serviceCategory.createCategory')"
    :mask-closable="false"
    :style="{ width: '600px' }"
  >
    <n-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-placement="left"
      label-width="100"
      require-mark-placement="right-hanging"
    >
      <n-form-item label="分类编码" path="code">
        <n-input
          v-model:value="formData.code"
          placeholder="请输入分类编码"
          :disabled="!!formData.id"
        />
      </n-form-item>
      <n-form-item label="分类名称" path="name">
        <n-input v-model:value="formData.name" placeholder="请输入分类名称" />
      </n-form-item>
      <n-form-item label="分类描述" path="description">
        <n-input
          v-model:value="formData.description"
          type="textarea"
          placeholder="请输入分类描述"
          :rows="3"
        />
      </n-form-item>
      <n-form-item label="父分类" path="parent_id">
        <n-select
          v-model:value="formData.parent_id"
          placeholder="请选择父分类（可选）"
          clearable
          :options="parentCategoryOptions"
        />
      </n-form-item>
      <n-form-item label="显示顺序" path="display_order">
        <n-input-number
          v-model:value="formData.display_order"
          placeholder="请输入显示顺序"
          :min="0"
          style="width: 100%"
        />
      </n-form-item>
      <n-form-item label="是否激活" path="is_active">
        <n-switch v-model:value="formData.is_active" />
      </n-form-item>
    </n-form>

    <template #action>
      <n-button @click="handleCancel">{{ t('common.cancel') }}</n-button>
      <n-button type="primary" :loading="submitting" @click="handleSubmit">
        {{ t('common.confirm') }}
      </n-button>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { NModal, NForm, NFormItem, NInput, NInputNumber, NSelect, NSwitch, NButton, useMessage } from 'naive-ui';
import { useI18n } from '@lib/shared/hooks/useI18n';
import type { SaveServiceCategoryParams } from '@lib/shared/models/service-category';

import { useServiceCategoryApi } from '@/api/modules';

const props = defineProps<{
  show: boolean;
  formData?: SaveServiceCategoryParams | null;
}>();

const emit = defineEmits<{
  'update:show': [value: boolean];
  success: [];
}>();

const { t } = useI18n();
const Message = useMessage();
const serviceCategoryApi = useServiceCategoryApi();

const formRef = ref();
const submitting = ref(false);
const parentCategoryOptions = ref<Array<{ label: string; value: string }>>([]);

const formData = ref<SaveServiceCategoryParams & { id?: string }>({
  code: '',
  name: '',
  description: '',
  parent_id: undefined,
  display_order: 0,
  is_active: true,
});

const rules = {
  code: [{ required: true, message: '请输入分类编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
};

// 加载父分类选项
const loadParentCategories = async () => {
  try {
    const res = await serviceCategoryApi.getServiceCategoryList({ page: 1, size: 100 });
    parentCategoryOptions.value = res.data.items.map((item) => ({
      label: item.name,
      value: item.id,
    }));
  } catch (error) {
    console.error('加载父分类失败:', error);
  }
};

watch(
  () => props.show,
  (val) => {
    if (val) {
      if (props.formData) {
        formData.value = { ...props.formData, id: (props.formData as any).id };
      } else {
        formData.value = {
          code: '',
          name: '',
          description: '',
          parent_id: undefined,
          display_order: 0,
          is_active: true,
        };
      }
      loadParentCategories();
    }
  }
);

onMounted(() => {
  if (props.show) {
    loadParentCategories();
  }
});

const handleCancel = () => {
  emit('update:show', false);
};

const handleSubmit = async () => {
  await formRef.value?.validate();
  submitting.value = true;
  try {
    if (formData.value.id) {
      await serviceCategoryApi.updateServiceCategory(formData.value.id, formData.value);
      Message.success(t('common.updateSuccess'));
    } else {
      await serviceCategoryApi.addServiceCategory(formData.value);
      Message.success(t('common.createSuccess'));
    }
    emit('success');
  } catch (error) {
    console.error('提交失败:', error);
  } finally {
    submitting.value = false;
  }
};
</script>

<style lang="less" scoped></style>



