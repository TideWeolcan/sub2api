<template>
  <div class="cpa-empty">
    <div class="cpa-empty-content">
      <div class="cpa-empty-icon" aria-hidden="true">
        <slot name="icon">
          <component v-if="icon" :is="icon" class="h-5 w-5" aria-hidden="true" />
          <svg
            v-else
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </slot>
      </div>
      <div class="min-w-0">
        <div class="cpa-empty-title">{{ displayTitle }}</div>
        <div v-if="description" class="cpa-empty-desc">{{ description }}</div>
      </div>
    </div>
    <div v-if="actionText || $slots.action" class="cpa-empty-action">
      <slot name="action">
        <component
          :is="actionTo ? 'RouterLink' : 'button'"
          v-if="actionText"
          :to="actionTo as any"
          class="btn btn-primary"
          @click="!actionTo && $emit('action')"
        >
          <Icon v-if="actionIcon" name="plus" size="md" class="mr-2" />
          {{ actionText }}
        </component>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Component } from 'vue'
import Icon from '@/components/icons/Icon.vue'

const { t } = useI18n()

interface Props {
  icon?: Component | string
  title?: string
  description?: string
  actionText?: string
  actionTo?: string | object
  actionIcon?: boolean
  message?: string
}

const props = withDefaults(defineProps<Props>(), {
  description: '',
  actionIcon: true,
})

const displayTitle = computed(() => props.title || props.message || t('common.noData'))

defineEmits<{ action: [] }>()
</script>

<style scoped>
.cpa-empty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border: 1px dashed var(--cpa-border-subtle, #d8e5f2);
  border-radius: var(--cpa-radius-app-md, 12px);
  background: color-mix(in srgb, var(--cpa-surface-subtle, #f6faff) 92%, var(--cpa-app-surface-strong, #fff));
}
.cpa-empty-content {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.cpa-empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--cpa-app-surface-strong, #fff);
  border: 1px solid var(--cpa-app-border, rgba(15, 23, 42, 0.08));
  color: var(--cpa-app-text-muted, #8b95a6);
  flex-shrink: 0;
}
.cpa-empty-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--cpa-app-text-primary, #2c3e50);
  line-height: 1.3;
}
.cpa-empty-desc {
  margin-top: 2px;
  font-size: 12px;
  color: var(--cpa-app-text-regular, #5f6c7b);
  line-height: 1.4;
}
.cpa-empty-action {
  flex-shrink: 0;
}
@media (max-width: 640px) {
  .cpa-empty {
    flex-direction: column;
    align-items: stretch;
  }
  .cpa-empty-action {
    align-self: flex-start;
  }
}
</style>
