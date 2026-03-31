<script setup lang="ts">
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  RequestAuthSection,
  RequestBodySection,
  RequestComposeRail,
  RequestKeyValueTableEditor,
  RequestMockSection,
  RequestTestsSection,
  useRequestCompose,
} from '@/features/request-compose'
import { defaultAuthConfig } from '@/lib/request-workspace'
import { toRef } from 'vue'
import type {
  AppLocale,
  AuthConfig,
  FormDataFieldSnapshot,
  KeyValueItem,
  RequestBodyType,
  RequestMockState,
  RequestTestDefinition,
} from '@/types/request'

defineOptions({
  name: 'RequestParams',
})

const props = defineProps<{
  locale: AppLocale
  environmentName: string
  requestKey?: string
}>()

const params = defineModel<KeyValueItem[]>('params', { default: () => [] })
const headers = defineModel<KeyValueItem[]>('headers', { default: () => [] })
const bodyContent = defineModel<string>('body', { default: '' })
const bodyType = defineModel<RequestBodyType>('bodyType', { default: 'json' })
const bodyContentType = defineModel<string>('bodyContentType', { default: '' })
const formDataFields = defineModel<FormDataFieldSnapshot[]>('formDataFields', { default: () => [] })
const binaryFileName = defineModel<string>('binaryFileName', { default: '' })
const binaryMimeType = defineModel<string>('binaryMimeType', { default: '' })
const auth = defineModel<AuthConfig>('auth', { default: () => defaultAuthConfig() })
const tests = defineModel<RequestTestDefinition[]>('tests', { default: () => [] })
const environmentVariables = defineModel<KeyValueItem[]>('environmentVariables', { default: () => [] })
const mock = defineModel<RequestMockState | undefined>('mock')

const {
  activeSection,
  authConfiguredCount,
  bodyConfiguredCount,
  bodyInvalidCount,
  binaryPayloadSize,
  enabledEnvironmentVariablesCount,
  enabledHeadersCount,
  enabledParamsCount,
  handleBinaryFileChange,
  handleSectionChange,
  invalidEnvironmentVariablesCount,
  invalidHeadersCount,
  invalidParamsCount,
  isFormDataRowInvalid,
  isKeyValueRowInvalid,
  jsonBodyError,
  markRowRevealed,
  prepareForSubmit,
  requestText,
  setApiKeyPlacement,
  setAuthType,
  setBodyType,
  addFormDataField,
  addItem,
  addMockHeader,
  addTest,
  formatJsonBody,
  removeFormDataField,
  removeItem,
  removeMockHeader,
  removeTest,
  toggleFormDataField,
  toggleItem,
  toggleMockEnabled,
  toggleMockHeader,
  updateMockBody,
  updateMockContentType,
  updateMockHeader,
  updateMockStatus,
  updateMockStatusText,
} = useRequestCompose({
  locale: toRef(props, 'locale'),
  requestKey: toRef(props, 'requestKey'),
  params,
  headers,
  bodyContent,
  bodyType,
  bodyContentType,
  formDataFields,
  binaryFileName,
  binaryMimeType,
  auth,
  tests,
  environmentVariables,
  mock,
})

defineExpose({
  prepareForSubmit,
})
</script>

<template>
  <Tabs
    data-testid="request-compose-body"
    :model-value="activeSection"
    class="flex min-h-0 flex-1 flex-col overflow-hidden"
    @update:model-value="handleSectionChange"
  >
    <RequestComposeRail
      :request-text="requestText"
      :enabled-params-count="enabledParamsCount"
      :invalid-params-count="invalidParamsCount"
      :enabled-headers-count="enabledHeadersCount"
      :invalid-headers-count="invalidHeadersCount"
      :body-configured-count="bodyConfiguredCount"
      :body-invalid-count="bodyInvalidCount"
      :auth-configured-count="authConfiguredCount"
      :tests-count="tests.length"
      :enabled-environment-variables-count="enabledEnvironmentVariablesCount"
      :invalid-environment-variables-count="invalidEnvironmentVariablesCount"
    />

    <div data-testid="request-compose-scroll-area" class="min-h-0 flex-1 overflow-y-auto">
      <TabsContent value="params" data-testid="request-section-content-params" class="mt-2.5 px-3 pb-3">
        <RequestKeyValueTableEditor
          v-model:rows="params"
          section="params"
          :request-text="requestText"
          :add-label="requestText.addParameter"
          :key-header-label="requestText.key"
          :value-header-label="requestText.value"
          :description-header-label="requestText.description"
          :on-toggle-row="(index) => toggleItem(params, index)"
          :on-remove-row="(index) => removeItem(params, index, 'params')"
          :on-add-row="() => addItem(params, 'params')"
          :on-reveal-row="(index) => markRowRevealed('params', index)"
          :is-row-invalid="(item, index) => isKeyValueRowInvalid('params', item, index)"
        />
      </TabsContent>

      <TabsContent value="headers" data-testid="request-section-content-headers" class="mt-2.5 px-3 pb-3">
        <RequestKeyValueTableEditor
          v-model:rows="headers"
          section="headers"
          :request-text="requestText"
          :add-label="requestText.addHeader"
          :key-header-label="requestText.key"
          :value-header-label="requestText.value"
          :show-description="false"
          value-column-class="w-[45%]"
          :on-toggle-row="(index) => toggleItem(headers, index)"
          :on-remove-row="(index) => removeItem(headers, index, 'headers')"
          :on-add-row="() => addItem(headers, 'headers')"
          :on-reveal-row="(index) => markRowRevealed('headers', index)"
          :is-row-invalid="(item, index) => isKeyValueRowInvalid('headers', item, index)"
        />
      </TabsContent>

      <TabsContent value="body" data-testid="request-section-content-body" class="mt-2.5 px-3 pb-3">
        <RequestBodySection
          v-model:body="bodyContent"
          v-model:body-type="bodyType"
          v-model:body-content-type="bodyContentType"
          v-model:form-data-fields="formDataFields"
          v-model:binary-file-name="binaryFileName"
          v-model:binary-mime-type="binaryMimeType"
          :request-text="requestText"
          :json-body-error="jsonBodyError"
          :binary-payload-size="binaryPayloadSize"
          :is-form-data-row-invalid="isFormDataRowInvalid"
          :on-mark-form-data-row-revealed="(index) => markRowRevealed('formdata', index)"
          :on-toggle-form-data-field="toggleFormDataField"
          :on-remove-form-data-field="removeFormDataField"
          :on-add-form-data-field="addFormDataField"
          :on-set-body-type="setBodyType"
          :on-format-json-body="formatJsonBody"
          :on-handle-binary-file-change="handleBinaryFileChange"
        />
      </TabsContent>

      <TabsContent value="mock" data-testid="request-section-content-mock" class="mt-2.5 px-3 pb-3">
        <RequestMockSection
          v-model:mock="mock"
          :request-text="requestText"
          :on-toggle-mock-enabled="toggleMockEnabled"
          :on-update-mock-status="updateMockStatus"
          :on-update-mock-status-text="updateMockStatusText"
          :on-update-mock-content-type="updateMockContentType"
          :on-update-mock-body="updateMockBody"
          :on-toggle-mock-header="toggleMockHeader"
          :on-update-mock-header="updateMockHeader"
          :on-add-mock-header="addMockHeader"
          :on-remove-mock-header="removeMockHeader"
        />
      </TabsContent>

      <TabsContent value="auth" data-testid="request-section-content-auth" class="mt-2.5 px-3 pb-3">
        <RequestAuthSection
          v-model:auth="auth"
          :request-text="requestText"
          :on-set-auth-type="setAuthType"
          :on-set-api-key-placement="setApiKeyPlacement"
        />
      </TabsContent>

      <TabsContent value="tests" data-testid="request-section-content-tests" class="mt-2.5 px-3 pb-3">
        <RequestTestsSection
          v-model:tests="tests"
          :request-text="requestText"
          :on-add-test="addTest"
          :on-remove-test="removeTest"
        />
      </TabsContent>

      <TabsContent value="env" data-testid="request-section-content-env" class="mt-2.5 px-3 pb-3">
        <div class="mb-2.5 flex items-center justify-between">
          <div>
            <div class="text-[10px] uppercase tracking-[0.18em] text-[var(--zr-text-muted)]">{{ requestText.activeEnvironment }}</div>
            <div class="mt-1 text-sm font-medium text-[var(--zr-text-primary)]">{{ props.environmentName }}</div>
          </div>
          <Badge variant="secondary" class="rounded-full border border-[color:var(--zr-border)] bg-[var(--zr-chip-bg)] px-2 py-0.5 text-[10px] text-[var(--zr-text-secondary)]">
            {{ requestText.vars(enabledEnvironmentVariablesCount) }}
          </Badge>
        </div>

        <RequestKeyValueTableEditor
          v-model:rows="environmentVariables"
          section="env"
          :request-text="requestText"
          :add-label="requestText.addVariable"
          :key-header-label="requestText.variable"
          :value-header-label="requestText.value"
          :description-header-label="requestText.description"
          key-column-class="w-[28%]"
          value-column-class="w-[32%]"
          description-column-class="w-[28%]"
          :on-toggle-row="(index) => toggleItem(environmentVariables, index)"
          :on-remove-row="(index) => removeItem(environmentVariables, index, 'env')"
          :on-add-row="() => addItem(environmentVariables, 'env')"
          :on-reveal-row="(index) => markRowRevealed('env', index)"
          :is-row-invalid="(item, index) => isKeyValueRowInvalid('env', item, index)"
        />
      </TabsContent>
    </div>
  </Tabs>
</template>
