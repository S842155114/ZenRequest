<script setup lang="ts">
import CodeEditorSurface from '@/components/code/CodeEditorSurface.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getMessages } from '@/lib/i18n'
import type { FormDataFieldSnapshot, RequestBodyType } from '@/types/request'

type RequestMessages = ReturnType<typeof getMessages>['request']

const props = defineProps<{
  requestText: RequestMessages
  jsonBodyError: string
  binaryPayloadSize: number
  isFormDataRowInvalid: (field: FormDataFieldSnapshot, index: number) => boolean
  onMarkFormDataRowRevealed: (index: number) => void
  onToggleFormDataField: (index: number) => void
  onRemoveFormDataField: (index: number) => void
  onAddFormDataField: () => void
  onSetBodyType: (value: RequestBodyType) => void
  onFormatJsonBody: () => void
  onHandleBinaryFileChange: (event: Event) => Promise<void>
}>()

const bodyContent = defineModel<string>('body', { required: true })
const bodyType = defineModel<RequestBodyType>('bodyType', { required: true })
const bodyContentType = defineModel<string>('bodyContentType', { required: true })
const formDataFields = defineModel<FormDataFieldSnapshot[]>('formDataFields', { required: true })
const binaryFileName = defineModel<string>('binaryFileName', { required: true })
const binaryMimeType = defineModel<string>('binaryMimeType', { required: true })
</script>

<template>
  <div class="mb-2.5 flex items-center gap-1.5">
    <Button variant="ghost" size="sm" :class="['h-7 rounded-lg px-2.5 text-[10px]', bodyType === 'json' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="onSetBodyType('json')">{{ requestText.json }}</Button>
    <Button variant="ghost" size="sm" :class="['h-7 rounded-lg px-2.5 text-[10px]', bodyType === 'formdata' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="onSetBodyType('formdata')">{{ requestText.formData }}</Button>
    <Button variant="ghost" size="sm" :class="['h-7 rounded-lg px-2.5 text-[10px]', bodyType === 'raw' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="onSetBodyType('raw')">{{ requestText.raw }}</Button>
    <Button variant="ghost" size="sm" :class="['h-7 rounded-lg px-2.5 text-[10px]', bodyType === 'binary' ? 'zr-tab-button-active' : 'zr-tab-button']" @click="onSetBodyType('binary')">{{ requestText.binary }}</Button>
  </div>
  <div class="zr-code-panel flex min-h-[18rem] flex-col overflow-hidden rounded-lg">
    <div
      data-testid="request-body-header"
      class="flex items-center justify-between border-b border-[color:var(--zr-border)] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]"
    >
      <span>{{ requestText.requestPayload }}</span>
      <div class="flex items-center gap-2">
        <Button
          v-if="bodyType === 'json'"
          data-testid="request-json-format"
          variant="ghost"
          size="sm"
          class="zr-tool-button h-7 rounded-md px-2.5 text-[10px]"
          :disabled="!bodyContent.trim() || Boolean(jsonBodyError)"
          @click="onFormatJsonBody"
        >
          {{ requestText.pretty }}
        </Button>
        <span class="zr-chip rounded-full px-2 py-1 text-[10px] tracking-[0.18em] text-[var(--zr-text-secondary)]">{{ bodyType }}</span>
      </div>
    </div>

    <template v-if="bodyType === 'formdata'">
      <div data-testid="request-formdata-editor" class="flex flex-col p-3">
        <div class="overflow-hidden rounded-lg border border-[color:var(--zr-border)]">
          <table class="w-full text-xs">
            <thead class="bg-[var(--zr-soft-bg)] text-left text-xs text-[var(--zr-text-muted)]">
              <tr>
                <th class="w-10 text-center"></th>
                <th class="w-[35%] px-3 py-2.5 font-medium">{{ requestText.key }}</th>
                <th class="w-[45%] px-3 py-2.5 font-medium">{{ requestText.value }}</th>
                <th class="w-8"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(field, idx) in formDataFields"
                :key="idx"
                class="group border-t border-[color:var(--zr-border-soft)] first:border-t-0"
              >
                <td class="px-3 py-1.5 align-top text-center">
                  <div class="flex h-9 items-center justify-center">
                    <button
                      :data-testid="`request-row-toggle-formdata-${idx}`"
                      :data-state="field.enabled ? 'on' : 'off'"
                      class="zr-toggle-badge"
                      type="button"
                      @click="onToggleFormDataField(idx)"
                    >
                      <span class="zr-toggle-dot" aria-hidden="true" />
                    </button>
                  </div>
                </td>
                <td class="px-3 py-1.5 align-top">
                  <Input
                    v-model="field.key"
                    :aria-invalid="isFormDataRowInvalid(field, idx)"
                    :class="[
                      'zr-input h-9 rounded-lg text-xs font-mono shadow-none',
                      !field.enabled && 'opacity-50',
                      isFormDataRowInvalid(field, idx) && 'border-rose-500/35 bg-rose-500/5',
                    ]"
                    @update:model-value="onMarkFormDataRowRevealed(idx)"
                  />
                  <div
                    v-if="isFormDataRowInvalid(field, idx)"
                    :data-testid="`request-row-error-formdata-${idx}`"
                    class="mt-1 text-[10px] text-rose-700 dark:text-rose-300"
                  >
                    {{ requestText.rowKeyRequired }}
                  </div>
                </td>
                <td class="px-3 py-1.5 align-top">
                  <Input
                    v-model="field.value"
                    :class="['zr-input h-9 rounded-lg text-xs font-mono shadow-none', !field.enabled && 'opacity-50']"
                    @update:model-value="onMarkFormDataRowRevealed(idx)"
                  />
                </td>
                <td class="px-3 py-1.5 align-top">
                  <div class="flex h-9 items-center justify-center">
                    <button class="opacity-0 transition-all text-[var(--zr-text-muted)] group-hover:opacity-100 hover:text-rose-300" @click="onRemoveFormDataField(idx)">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Button
          data-testid="request-formdata-add-field"
          variant="ghost"
          size="sm"
          class="zr-dashed-button mt-2.5 self-start rounded-lg text-xs"
          @click="onAddFormDataField"
        >
          {{ requestText.addFormDataField }}
        </Button>
      </div>
    </template>

    <template v-else-if="bodyType === 'binary'">
      <div data-testid="request-binary-editor" class="flex flex-col gap-3 p-3">
        <div class="space-y-2">
          <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ requestText.binaryUpload }}</div>
          <input
            data-testid="request-binary-file-input"
            type="file"
            class="zr-input h-10 w-full rounded-lg px-3 text-xs shadow-none file:mr-3 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-[var(--zr-text-primary)]"
            @change="onHandleBinaryFileChange"
          >
        </div>

        <div class="grid gap-2.5 md:grid-cols-2">
          <div class="space-y-2">
            <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ requestText.binaryFileName }}</div>
            <Input v-model="binaryFileName" class="zr-input h-9 rounded-lg text-xs shadow-none" />
          </div>
          <div class="space-y-2">
            <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ requestText.binaryMimeType }}</div>
            <Input v-model="binaryMimeType" class="zr-input h-9 rounded-lg text-xs shadow-none" :placeholder="requestText.binaryMimeTypePlaceholder" />
          </div>
        </div>

        <div
          v-if="bodyContent"
          class="rounded-lg border border-[var(--zr-accent-border)] bg-[var(--zr-accent-soft)] px-3 py-2 text-xs text-[var(--zr-text-secondary)]"
        >
          {{ requestText.binaryReady(binaryPayloadSize) }}
        </div>
        <div
          v-else
          class="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-[color:var(--zr-border)] bg-[var(--zr-soft-bg)] px-5 text-center text-xs text-[var(--zr-text-muted)]"
        >
          {{ requestText.binaryEmpty }}
        </div>
      </div>
    </template>

    <template v-else>
      <div
        v-if="bodyType === 'raw'"
        class="border-b border-[color:var(--zr-border)] px-3 py-3"
      >
        <div class="space-y-2">
          <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ requestText.rawContentType }}</div>
          <Input
            v-model="bodyContentType"
            data-testid="request-raw-content-type"
            class="zr-input h-9 rounded-lg font-mono text-xs shadow-none"
            :placeholder="requestText.rawContentTypePlaceholder"
          />
        </div>
      </div>
      <CodeEditorSurface
        test-id="request-body-code-editor"
        :content="bodyContent"
        :language="bodyType === 'json' ? 'json' : 'text'"
        :read-only="false"
        @update:content="bodyContent = $event"
      />
      <div
        v-if="bodyType === 'json' && jsonBodyError"
        data-testid="request-json-error"
        class="border-t border-rose-500/20 bg-rose-500/8 px-3 py-2 text-xs text-rose-700 dark:text-rose-300"
      >
        {{ requestText.jsonInvalid }}: {{ jsonBodyError }}
      </div>
    </template>
  </div>
</template>
