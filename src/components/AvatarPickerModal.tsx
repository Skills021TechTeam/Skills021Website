import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Upload, Sparkles, Image as ImageIcon, Trash2,
  Check, Loader2, RefreshCw, AlertCircle
} from 'lucide-react'
import { PRESET_AVATARS, AVATAR_CATEGORIES, AvatarPreset } from '../data/avatarPresets'
import { uploadUserAvatar } from '../lib/supabase'
import toast from 'react-hot-toast'

interface AvatarPickerModalProps {
  isOpen: boolean
  onClose: () => void
  currentAvatarUrl?: string
  userName: string
  userId: string
  onSaveAvatar: (newAvatarUrl: string) => Promise<boolean>
}

type TabMode = 'presets' | 'upload'

export default function AvatarPickerModal({
  isOpen,
  onClose,
  currentAvatarUrl,
  userName,
  userId,
  onSaveAvatar,
}: AvatarPickerModalProps) {
  const [activeTab, setActiveTab] = useState<TabMode>('presets')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedPresetUrl, setSelectedPresetUrl] = useState<string>(currentAvatarUrl || '')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>(currentAvatarUrl || '')
  const [isUploading, setIsUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setSelectedPresetUrl(currentAvatarUrl || '')
      setPreviewUrl(currentAvatarUrl || '')
      setUploadedFile(null)
    }
  }, [isOpen, currentAvatarUrl])

  const getInitials = (name: string) =>
    (name || 'U')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  // Filtered preset list
  const filteredPresets = selectedCategory === 'all'
    ? PRESET_AVATARS
    : PRESET_AVATARS.filter((p) => p.category === selectedCategory)

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WEBP, GIF, SVG)')
      return
    }

    if (file.size > 6 * 1024 * 1024) {
      toast.error('Image size must be less than 6MB')
      return
    }

    setUploadedFile(file)
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)
    setSelectedPresetUrl('') // Custom upload takes precedence
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
      setActiveTab('upload')
    }
  }

  const handleSelectPreset = (preset: AvatarPreset) => {
    setUploadedFile(null)
    setSelectedPresetUrl(preset.url)
    setPreviewUrl(preset.url)
  }

  const handleResetToInitials = () => {
    setUploadedFile(null)
    setSelectedPresetUrl('')
    setPreviewUrl('')
  }

  const handleSave = async () => {
    setIsUploading(true)
    try {
      let finalAvatarUrl = previewUrl

      // If user uploaded a new local file, upload it to Supabase Storage first
      if (uploadedFile) {
        finalAvatarUrl = await uploadUserAvatar(userId, uploadedFile)
      } else if (selectedPresetUrl) {
        finalAvatarUrl = selectedPresetUrl
      } else if (previewUrl === '') {
        finalAvatarUrl = ''
      }

      const success = await onSaveAvatar(finalAvatarUrl)
      if (success) {
        toast.success('Profile avatar updated successfully! 🎉')
        onClose()
      } else {
        toast.error('Failed to update avatar. Please try again.')
      }
    } catch (err: any) {
      console.error('Error saving avatar:', err)
      toast.error(err?.message || 'Error updating avatar')
    } finally {
      setIsUploading(false)
    }
  }

  if (!isOpen) return null

  const isCurrentActive = previewUrl === (currentAvatarUrl || '') && !uploadedFile

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl bg-white dark:bg-[#111625] rounded-3xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden z-10 my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-brand-text dark:text-white">
                  Customize Student Avatar
                </h3>
                <p className="text-xs text-brand-muted dark:text-gray-400">
                  Upload your photo or select from pre-made graphics
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Live Preview Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-primary-50/70 via-indigo-50/50 to-purple-50/70 dark:from-primary-950/30 dark:via-indigo-950/20 dark:to-purple-950/30 border border-primary-100 dark:border-primary-900/40">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full ring-4 ring-primary-500/30 dark:ring-primary-400/40 overflow-hidden shadow-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Avatar Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                        {getInitials(userName)}
                      </div>
                    )}
                  </div>
                  {previewUrl && (
                    <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#111625] flex items-center justify-center text-white text-[10px]">
                      <Check size={10} strokeWidth={3} />
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-brand-text dark:text-white truncate max-w-[200px]">
                      {userName}
                    </h4>
                    <span className="badge text-[10px] px-2 py-0.5 bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 font-semibold">
                      Live Preview
                    </span>
                  </div>
                  <p className="text-xs text-brand-muted dark:text-gray-400 mt-1">
                    {uploadedFile
                      ? `Custom Image: ${uploadedFile.name.slice(0, 20)}...`
                      : selectedPresetUrl
                      ? 'Pre-made Graphic Selected'
                      : 'Default Initials Badge'}
                  </p>
                </div>
              </div>

              {/* Reset to Initials Button */}
              {previewUrl && (
                <button
                  type="button"
                  onClick={handleResetToInitials}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl transition-colors"
                >
                  <Trash2 size={13} />
                  Reset to Initials
                </button>
              )}
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveTab('presets')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'presets'
                    ? 'bg-white dark:bg-primary-600 text-primary-600 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-brand-text dark:hover:text-white'
                }`}
              >
                <Sparkles size={14} />
                Pre-made Graphics ({PRESET_AVATARS.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'upload'
                    ? 'bg-white dark:bg-primary-600 text-primary-600 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-brand-text dark:hover:text-white'
                }`}
              >
                <Upload size={14} />
                Upload Your Picture
              </button>
            </div>

            {/* TAB 1: Pre-made Graphics Gallery */}
            {activeTab === 'presets' && (
              <div className="space-y-4">
                {/* Category Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedCategory === 'all'
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                    }`}
                  >
                    ✨ All Graphics ({PRESET_AVATARS.length})
                  </button>
                  {AVATAR_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                        selectedCategory === cat.id
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                      }`}
                    >
                      <span>{cat.iconEmoji}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>

                {/* Graphics Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
                  {filteredPresets.map((preset) => {
                    const isSelected = previewUrl === preset.url
                    return (
                      <motion.button
                        key={preset.id}
                        type="button"
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSelectPreset(preset)}
                        className={`group relative flex flex-col items-center p-2 rounded-2xl border transition-all text-center ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/30 ring-2 ring-primary-500 shadow-md'
                            : 'border-gray-200 dark:border-white/10 hover:border-primary-300 dark:hover:border-white/20 bg-white dark:bg-white/[0.02]'
                        }`}
                      >
                        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-2 flex-shrink-0">
                          <img
                            src={preset.url}
                            alt={preset.name}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary-500/20 flex items-center justify-center">
                              <span className="w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center shadow">
                                <Check size={14} strokeWidth={3} />
                              </span>
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-brand-text dark:text-gray-200 line-clamp-1 w-full">
                          {preset.name.split(' ')[0]}
                        </span>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: Upload Custom Photo */}
            {activeTab === 'upload' && (
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp, image/gif, image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0])
                    }
                  }}
                />

                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                    dragOver
                      ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/20 scale-[1.01]'
                      : 'border-gray-200 dark:border-white/10 hover:border-primary-400 dark:hover:border-primary-500/50 bg-gray-50/50 dark:bg-white/[0.02]'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                    <Upload size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-brand-text dark:text-white">
                      Click to browse or drag & drop your photo here
                    </p>
                    <p className="text-xs text-brand-muted dark:text-gray-400 mt-1">
                      Supports PNG, JPG, JPEG, WEBP, GIF, SVG (Max 6MB)
                    </p>
                  </div>
                  <button
                    type="button"
                    className="mt-1 px-4 py-2 bg-white dark:bg-white/10 text-brand-text dark:text-white text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 shadow-sm hover:bg-gray-50 transition-colors"
                  >
                    Select Image File
                  </button>
                </div>

                {uploadedFile && (
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-white dark:bg-gray-800 flex-shrink-0">
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 truncate max-w-[200px] sm:max-w-xs">
                          {uploadedFile.name}
                        </p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                          {(uploadedFile.size / 1024).toFixed(1)} KB — Ready to upload
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setUploadedFile(null)
                        setPreviewUrl(currentAvatarUrl || '')
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 text-xs border border-blue-100 dark:border-blue-900/30">
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  <span>
                    Your picture will be securely saved and automatically displayed on your student dashboard & header profile.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>

            <div className="flex items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={handleSave}
                disabled={isUploading || (isCurrentActive && !uploadedFile)}
                className="flex items-center gap-2 btn-primary disabled:opacity-50 text-xs px-6 py-2.5 shadow-lg"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    <span>Save Avatar</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
