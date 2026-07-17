import type { SectionConfig } from '@/types/learning'

const registry = new Map<string, SectionConfig>()

export function registerSection(section: SectionConfig) {
  registry.set(section.id, section)
}

export function registerSections(sections: SectionConfig[]) {
  for (const s of sections) {
    registry.set(s.id, s)
  }
}

export function getSection(id: string): SectionConfig | undefined {
  return registry.get(id)
}

export function getAllSections(): SectionConfig[] {
  return Array.from(registry.values()).sort((a, b) => a.order - b.order)
}

export function getVisibleSections(): SectionConfig[] {
  return getAllSections().filter((s) => s.defaultVisible)
}

export function getSectionConfig(id: string): SectionConfig | undefined {
  return registry.get(id)
}

export function getSectionCount(): number {
  return registry.size
}

export function clearRegistry() {
  registry.clear()
}
