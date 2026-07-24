import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { SettingsSection, SettingsRow } from '@/components/settings/SettingsSection'
import { ApiKeyManager } from '@/components/settings/ApiKeyManager'
import { cn } from '@/lib/utils'
import { CustomSelect } from '@/components/ui/select'
import {
  Palette, Bell, Key, Database, Globe, Moon, Sun,
  Code2, Accessibility, Info, Eye, Type, Trash2, Sparkles,
} from 'lucide-react'

const settingsNav = [
  { id: 'appearance', icon: Palette, label: 'Appearance' },
  { id: 'preferences', icon: Eye, label: 'Learning Preferences' },
  { id: 'ai', icon: Key, label: 'AI Configuration' },
  { id: 'editor', icon: Code2, label: 'Editor' },
  { id: 'accessibility', icon: Accessibility, label: 'Accessibility' },
  { id: 'storage', icon: Database, label: 'Storage' },
  { id: 'about', icon: Info, label: 'About' },
]

const fontSizes = ['Small', 'Medium', 'Large']
const tabSizes = [2, 4, 6, 8]

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={cn(
        'relative w-9 h-5 rounded-full transition-all duration-300 shrink-0 border border-white/5 shadow-inner',
        value ? 'bg-[#00f2fe] shadow-[0_0_10px_rgba(0,242,254,0.3)]' : 'bg-white/10'
      )}
    >
      <div className={cn(
        'w-4 h-4 rounded-full absolute top-0.5 transition-all duration-300 shadow-md',
        value ? 'left-[18px] bg-white' : 'left-0.5 bg-[#475569]'
      )} />
    </button>
  )
}

export function Settings() {
  const [activeTab, setActiveTab] = useLocalStorage('settings-active-tab', 'appearance')
  const [fontSize, setFontSize] = useLocalStorage('settings-font-size', 'Medium')
  const [tabSize, setTabSize] = useLocalStorage('settings-tab-size', 4)
  const [learningMode, setLearningMode] = useLocalStorage('settings-learning-mode', 'Explain')
  const [showExamples, setShowExamples] = useLocalStorage('settings-show-examples', true)
  const [difficulty, setDifficulty] = useLocalStorage('settings-difficulty', 'Intermediate')
  const [editorFontSize, setEditorFontSize] = useLocalStorage('settings-editor-font-size', '16px')
  const [wordWrap, setWordWrap] = useLocalStorage('settings-word-wrap', true)
  const [reducedMotion, setReducedMotion] = useLocalStorage('settings-reduced-motion', false)
  const [highContrast, setHighContrast] = useLocalStorage('settings-high-contrast', false)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('reduced-motion', reducedMotion)
  }, [reducedMotion])

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast)
  }, [highContrast])

  const handleClearAll = () => {
    localStorage.clear()
    setConfirmClearOpen(false)
    window.location.reload()
  }

  return (
    <div className="h-full overflow-hidden">
      <Dialog open={confirmClearOpen} onClose={() => setConfirmClearOpen(false)}>
        <DialogContent>
          <DialogTitle>Clear All Data?</DialogTitle>
          <p className="text-sm text-text-tertiary mt-1 mb-4">
            This will permanently delete all notes, bookmarks, history, and settings. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirmClearOpen(false)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleClearAll}><Trash2 className="w-4 h-4" /> Clear All</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="h-full flex flex-col md:flex-row">
        <div className="w-full md:w-52 shrink-0 border-b md:border-b-0 md:border-r border-border bg-surface-50/40 p-3">
          <div className="hidden md:block section-title mb-3">Settings</div>
          <div className="flex md:flex-col gap-1 md:gap-0.5 overflow-x-auto md:overflow-visible pb-1 md:pb-0 scrollbar-none">
            {settingsNav.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  'flex md:w-full items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0',
                  activeTab === item.id
                    ? 'text-accent-light bg-accent/10'
                    : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-150'
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-2xl mx-auto p-6 lg:p-8">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {activeTab === 'appearance' && (
                <>
                  <div className="mb-6">
                    <h1 className="text-xl font-bold text-text-primary mb-1">Appearance</h1>
                    <p className="text-sm text-text-tertiary">Customize how Mentor AI looks</p>
                  </div>
                  <SettingsSection title="Typography" description="Font size and reading preferences">
                    <SettingsRow label="Font size" description="Adjust the base font size">
                      <div className="flex gap-1">
                        {fontSizes.map((size) => (
                          <Button key={size} variant={fontSize === size ? 'primary' : 'secondary'} size="sm" onClick={() => setFontSize(size)}>{size}</Button>
                        ))}
                      </div>
                    </SettingsRow>
                    <SettingsRow label="Font" description="Code and UI font">
                      <Badge variant="surface">Inter + JetBrains Mono</Badge>
                    </SettingsRow>
                  </SettingsSection>
                </>
              )}

              {activeTab === 'preferences' && (
                <>
                  <div className="mb-6">
                    <h1 className="text-xl font-bold text-text-primary mb-1">Learning Preferences</h1>
                    <p className="text-sm text-text-tertiary">Customize your learning experience</p>
                  </div>
                  <SettingsSection title="Learning Mode" description="Default interaction mode">
                    <SettingsRow label="Default mode" description="When asking questions">
                      <CustomSelect
                        className="w-40"
                        value={learningMode}
                        onChange={setLearningMode}
                        options={[
                          { value: 'Explain', label: 'Explain' },
                          { value: 'Quick Answer', label: 'Quick Answer' },
                          { value: 'Deep Dive', label: 'Deep Dive' }
                        ]}
                      />
                    </SettingsRow>
                    <SettingsRow label="Show examples" description="Always include code examples">
                      <Toggle value={showExamples} onChange={setShowExamples} />
                    </SettingsRow>
                    <SettingsRow label="Difficulty level" description="Content complexity">
                      <CustomSelect
                        className="w-40"
                        value={difficulty}
                        onChange={setDifficulty}
                        options={[
                          { value: 'Beginner', label: 'Beginner' },
                          { value: 'Intermediate', label: 'Intermediate' },
                          { value: 'Advanced', label: 'Advanced' }
                        ]}
                      />
                    </SettingsRow>
                  </SettingsSection>
                </>
              )}

              {activeTab === 'ai' && <ApiKeyManager />}

              {activeTab === 'editor' && (
                <>
                  <div className="mb-6">
                    <h1 className="text-xl font-bold text-text-primary mb-1">Editor</h1>
                    <p className="text-sm text-text-tertiary">Code editor preferences</p>
                  </div>
                  <SettingsSection title="Code Editor" description="Editor behavior settings">
                    <SettingsRow label="Font size" description="Code editor font size">
                      <CustomSelect
                        className="w-32"
                        value={editorFontSize}
                        onChange={setEditorFontSize}
                        options={[
                          { value: '12px', label: '12px' },
                          { value: '14px', label: '14px' },
                          { value: '16px', label: '16px' },
                          { value: '18px', label: '18px' }
                        ]}
                      />
                    </SettingsRow>
                    <SettingsRow label="Tab size" description="Indentation width">
                      <div className="flex gap-1">
                        {tabSizes.map((size) => (
                          <Button key={size} variant={tabSize === size ? 'primary' : 'secondary'} size="sm" onClick={() => setTabSize(size)}>{size}</Button>
                        ))}
                      </div>
                    </SettingsRow>
                    <SettingsRow label="Word wrap" description="Wrap long lines">
                      <Toggle value={wordWrap} onChange={setWordWrap} />
                    </SettingsRow>
                  </SettingsSection>
                </>
              )}

              {activeTab === 'accessibility' && (
                <>
                  <div className="mb-6">
                    <h1 className="text-xl font-bold text-text-primary mb-1">Accessibility</h1>
                    <p className="text-sm text-text-tertiary">Accessibility and display settings</p>
                  </div>
                  <SettingsSection title="Display" description="Visual accessibility options">
                    <SettingsRow label="Reduced motion" description="Minimize animations">
                      <Toggle value={reducedMotion} onChange={setReducedMotion} />
                    </SettingsRow>
                    <SettingsRow label="High contrast" description="Increase contrast ratio">
                      <Toggle value={highContrast} onChange={setHighContrast} />
                    </SettingsRow>
                  </SettingsSection>
                </>
              )}

              {activeTab === 'storage' && (
                <>
                  <div className="mb-6">
                    <h1 className="text-xl font-bold text-text-primary mb-1">Storage</h1>
                    <p className="text-sm text-text-tertiary">Manage local data</p>
                  </div>
                  <SettingsSection title="Data Management" description="Storage usage">
                    <SettingsRow label="Local data" description="Notes, bookmarks, and settings">
                      <Badge variant="surface">~2.4 MB used</Badge>
                    </SettingsRow>
                    <SettingsRow label="Clear history" description="Remove all learning history">
                      <Button variant="danger" size="sm" onClick={() => setConfirmClearOpen(true)}>
                        <Trash2 className="w-4 h-4" /> Clear All Data
                      </Button>
                    </SettingsRow>
                  </SettingsSection>
                </>
              )}

              {activeTab === 'about' && (
                <>
                  <div className="mb-6">
                    <h1 className="text-xl font-bold text-text-primary mb-1">About</h1>
                    <p className="text-sm text-text-tertiary font-bold mt-1">Developed by</p>
                    <p className="text-xs text-text-secondary uppercase tracking-widest font-bold">ARKORE LOGICS</p>
                  </div>
                  <SettingsSection title="Application" description="Version and details">
                    <SettingsRow label="Version"><Badge variant="accent">2.0.0</Badge></SettingsRow>
                    <SettingsRow label="Frontend"><Badge variant="surface">React 19 + TypeScript</Badge></SettingsRow>
                    <SettingsRow label="Backend"><Badge variant="surface">FastAPI + SQLAlchemy</Badge></SettingsRow>
                    <SettingsRow label="AI Provider"><Badge variant="surface">Groq API</Badge></SettingsRow>
                  </SettingsSection>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
