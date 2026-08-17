<template>
  <!-- select -->
  <q-select
    v-if="field.type === 'select'"
    :model-value="modelValue"
    outlined
    dense
    emit-value
    map-options
    :label="labelText"
    :options="field.options ?? []"
    :hint="field.hint"
    :rules="rules"
    lazy-rules
    @update:model-value="onInput"
  />

  <!-- textarea -->
  <q-input
    v-else-if="field.type === 'textarea'"
    :model-value="modelValue"
    outlined
    dense
    type="textarea"
    autogrow
    :label="labelText"
    :placeholder="field.placeholder"
    :hint="field.hint"
    :maxlength="field.maxLength"
    :rules="rules"
    lazy-rules
    @update:model-value="onInput"
  />

  <!-- date：用原生 date input，手機上會叫出系統日期選擇器 -->
  <q-input
    v-else-if="field.type === 'date'"
    :model-value="modelValue"
    outlined
    dense
    type="date"
    stack-label
    :label="labelText"
    :hint="field.hint"
    :rules="rules"
    lazy-rules
    @update:model-value="onInput"
  >
    <template #prepend><q-icon name="cake" /></template>
  </q-input>

  <!-- 其餘一律 text input，差別在 inputmode / 正規化 -->
  <q-input
    v-else
    :model-value="modelValue"
    outlined
    dense
    :label="labelText"
    :placeholder="field.placeholder"
    :hint="field.hint"
    :maxlength="field.maxLength"
    :inputmode="inputMode"
    :rules="rules"
    lazy-rules
    @update:model-value="onInput"
  >
    <template v-if="icon" #prepend><q-icon :name="icon" /></template>
  </q-input>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FieldDef } from 'src/types/signup';
import { buildRules } from 'src/lib/validators';

const props = defineProps<{
  field: FieldDef;
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const labelText = computed(() =>
  props.field.required ? `${props.field.label} *` : props.field.label,
);

const rules = computed(() => buildRules(props.field));

const inputMode = computed(() => {
  switch (props.field.type) {
    case 'tel':
    case 'number':
      return 'numeric';
    case 'email':
      return 'email';
    default:
      return 'text';
  }
});

const icon = computed(() => {
  switch (props.field.type) {
    case 'tel':
      return 'smartphone';
    case 'email':
      return 'mail';
    case 'twid':
      return 'badge';
    case 'text':
      return 'person';
    default:
      return '';
  }
});

/** 依型別做輸入正規化：電話只留數字、身分證自動轉大寫 */
function normalize(raw: string | number | null): string {
  const value = raw === null ? '' : String(raw);
  switch (props.field.type) {
    case 'tel':
    case 'number':
      return value.replace(/\D/g, '');
    case 'twid':
      return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    case 'email':
      return value.trim();
    default:
      return value;
  }
}

function onInput(raw: string | number | null) {
  emit('update:modelValue', normalize(raw));
}
</script>
