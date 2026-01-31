import { useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { LanguageSelector } from "../components/common/LanguageSelector";
import UserMenu from "../components/common/UserMenu";
import { useCreateVideo } from "../components/video/list/hooks/useCreateVideo";
import { showToast } from "../components/common/Toast";
import { AssetUpload, AssetFile } from "../components/video/assets/AssetUpload";
import { TemplateSelector } from "../components/video/templates/components/TemplateSelector";
import { Template } from "../components/video/templates/types/templateTypes";
import { AutofillResult } from "../components/video/templates/utils/templateAutofill";
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/outline';

// Generate UUID v4
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Validation constants
const MAX_TITLE_LENGTH = 200;
const MAX_PROMPT_LENGTH = 2000;

export default function CreatePage() {
  const router = useRouter();
  const { user, logout, isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const { mutate, isPending } = useCreateVideo();

  // Form state
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [engine, setEngine] = useState("mock");
  const [paramsJson, setParamsJson] = useState('{\n  "durationSec": 5,\n  "ratio": "16:9"\n}');
  const [assets, setAssets] = useState<AssetFile[]>([]);

  // Template section state
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // Validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Enhanced client-side validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Title validation
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      errors.title = t('create.form.titleRequired');
    } else if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      errors.title = t('create.form.titleMaxLength', { max: MAX_TITLE_LENGTH });
    }

    // Prompt validation
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      errors.prompt = t('create.form.promptRequired');
    } else if (trimmedPrompt.length > MAX_PROMPT_LENGTH) {
      errors.prompt = t('create.form.promptMaxLength', { max: MAX_PROMPT_LENGTH });
    }

    // JSON params validation
    if (paramsJson.trim()) {
      try {
        const parsed = JSON.parse(paramsJson);
        if (typeof parsed !== 'object' || Array.isArray(parsed)) {
          errors.params = t('create.form.paramsInvalid');
        }
      } catch (e) {
        errors.params = t('create.form.paramsInvalid');
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle template selection and autofill
  const handleTemplateSelect = (autofillResult: AutofillResult, template: Template) => {
    // Autofill form fields with template data
    setTitle(autofillResult.title);
    setPrompt(autofillResult.prompt);
    
    // Autofill params if provided
    if (autofillResult.params) {
      setParamsJson(JSON.stringify(autofillResult.params, null, 2));
    }
    
    // Store selected template for reference
    setSelectedTemplate(template);
    
    // Clear any validation errors since we're using template data
    setValidationErrors({});
    
    // Show success feedback
    showToast(t('templates.card.selectTemplate', { name: template.name }), "success", 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);

    if (!validateForm()) {
      showToast(t('create.form.fixErrors'), "error", 3000);
      return;
    }

    // Parse params
    let params = {};
    if (paramsJson.trim()) {
      try {
        params = JSON.parse(paramsJson);
      } catch (e) {
        showToast(t('create.form.paramsInvalid'), "error", 3000);
        return;
      }
    }

    const payload = {
      title: title.trim(),
      prompt: prompt.trim(),
      engine,
      params,
      assetIds: assets
        .filter(asset => asset.uploadStatus === 'completed' && asset.assetId)
        .map(asset => asset.assetId!)
    };

    const idempotencyKey = generateUUID();

    mutate({ payload, idempotencyKey }, {
      onSuccess: (newVideo) => {
        showToast(t('success.videoCreated'), "success", 2000);
        // Navigate to detail page
        router.push(`/dashboard/videos/${newVideo.id}`);
      },
      onError: (error: any) => {
        const errorMessage = error?.message || t('error.unknown');
        showToast(errorMessage, "error", 5000);
      },
    });
  };

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              {t('action.back')}
            </button>
            <h1 className="text-2xl font-bold text-white">{t('create.createFilm')}</h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector compact />
            <UserMenu />
          </div>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Create Form */}
          <div className="lg:col-span-2">
            <div className="bg-neutral-900 rounded-lg p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    {t('create.form.title')} <span className="text-red-400">*</span>
                    <span className="text-neutral-400 text-xs ml-2">
                      {t('create.form.characterCount', { current: title.length, max: MAX_TITLE_LENGTH })}
                    </span>
                  </label>
                  <input
                    type="text"
                    className={`w-full px-4 py-3 rounded-lg bg-neutral-800 border text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      validationErrors.title 
                        ? 'border-red-500 bg-red-900/20' 
                        : 'border-neutral-700'
                    }`}
                    placeholder={t('create.form.titlePlaceholder')}
                    value={title}
                    maxLength={MAX_TITLE_LENGTH}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isPending}
                  />
                  {validationErrors.title && (
                    <div className="flex items-center gap-1 mt-2 text-red-400 text-sm">
                      <span>⚠</span>
                      <span>{validationErrors.title}</span>
                    </div>
                  )}
                </div>

                {/* Prompt */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    {t('create.form.prompt')} <span className="text-red-400">*</span>
                    <span className="text-neutral-400 text-xs ml-2">
                      {t('create.form.characterCount', { current: prompt.length, max: MAX_PROMPT_LENGTH })}
                    </span>
                  </label>
                  <textarea
                    className={`w-full px-4 py-3 rounded-lg bg-neutral-800 border text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      validationErrors.prompt 
                        ? 'border-red-500 bg-red-900/20' 
                        : 'border-neutral-700'
                    }`}
                    rows={4}
                    placeholder={t('create.form.promptPlaceholder')}
                    value={prompt}
                    maxLength={MAX_PROMPT_LENGTH}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isPending}
                  />
                  {validationErrors.prompt && (
                    <div className="flex items-center gap-1 mt-2 text-red-400 text-sm">
                      <span>⚠</span>
                      <span>{validationErrors.prompt}</span>
                    </div>
                  )}
                </div>

                {/* Engine */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    {t('create.form.engine')}
                  </label>
                  <select
                    className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={engine}
                    onChange={(e) => setEngine(e.target.value)}
                    disabled={isPending}
                  >
                    <option value="mock">{t('create.form.mockEngine')}</option>
                    <option value="runway">{t('create.form.runwayEngine')}</option>
                  </select>
                </div>

                {/* Assets Upload */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    {t('assets.upload.title')} <span className="text-neutral-400">- {t('create.form.paramsOptional')}</span>
                  </label>
                  <AssetUpload
                    onAssetsChange={setAssets}
                    maxFiles={5}
                    maxFileSize={50}
                    disabled={isPending}
                  />
                </div>

                {/* Params JSON */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    {t('create.form.params')} <span className="text-neutral-400">- {t('create.form.paramsOptional')}</span>
                  </label>
                  <textarea
                    className={`w-full px-4 py-3 rounded-lg bg-neutral-800 border text-white font-mono text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      validationErrors.params 
                        ? 'border-red-500 bg-red-900/20' 
                        : 'border-neutral-700'
                    }`}
                    rows={6}
                    placeholder='{\n  "durationSec": 5,\n  "ratio": "16:9"\n}'
                    value={paramsJson}
                    onChange={(e) => setParamsJson(e.target.value)}
                    disabled={isPending}
                  />
                  {validationErrors.params && (
                    <div className="flex items-center gap-1 mt-2 text-red-400 text-sm">
                      <span>⚠</span>
                      <span>{validationErrors.params}</span>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard')}
                    className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors"
                    disabled={isPending}
                  >
                    {t('action.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-lg transition-colors font-medium disabled:cursor-not-allowed"
                    disabled={
                      isPending || 
                      !title.trim() || 
                      !prompt.trim() || 
                      !!validationErrors.params ||
                      title.length > MAX_TITLE_LENGTH ||
                      prompt.length > MAX_PROMPT_LENGTH
                    }
                  >
                    {isPending && (
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    )}
                    {!isPending && <PlusIcon className="w-5 h-5" />}
                    {isPending ? t('create.form.creating') : t('create.form.createAndView')}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column - Template Selector */}
          <div className="lg:col-span-1">
            <div className="bg-neutral-900 rounded-lg overflow-hidden sticky top-8">
              <div className="px-6 py-4 bg-neutral-800 border-b border-neutral-700">
                <div className="flex items-center gap-3">
                  <span className="text-lg">📋</span>
                  <div>
                    <h3 className="text-white font-medium">{t('templates.list.templates')}</h3>
                    {selectedTemplate && (
                      <p className="text-xs text-blue-400 mt-1">
                        {selectedTemplate.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
                <TemplateSelector
                  onTemplateSelect={handleTemplateSelect}
                  disabled={isPending}
                  compact={true}
                  className="p-6"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}