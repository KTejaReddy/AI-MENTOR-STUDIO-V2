import type { LayoutState } from '@/types/learning'

const STORAGE_KEY = 'mentor-ai-layout'

export function createInitialLayoutState(): LayoutState {
  return {
    sidebarWidth: 220,
    rightPanelWidth: 320,
    rightPanelOpen: true,
    sidebarVisible: true,
  }
}

export function loadLayoutState(): LayoutState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return { ...createInitialLayoutState(), ...parsed }
    }
  } catch {}
  return createInitialLayoutState()
}

export function saveLayoutState(state: LayoutState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

export function updateSidebarWidth(state: LayoutState, width: number): LayoutState {
  return { ...state, sidebarWidth: Math.max(180, Math.min(320, width)) }
}

export function updateRightPanelWidth(state: LayoutState, width: number): LayoutState {
  return { ...state, rightPanelWidth: Math.max(240, Math.min(480, width)) }
}

export function toggleRightPanel(state: LayoutState): LayoutState {
  return { ...state, rightPanelOpen: !state.rightPanelOpen }
}

export function toggleSidebar(state: LayoutState): LayoutState {
  return { ...state, sidebarVisible: !state.sidebarVisible }
}
