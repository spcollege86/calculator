import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  // 状态
  const loading = ref(false)
  const sidebarCollapsed = ref(false)
  const theme = ref('light')

  // 方法
  const setLoading = (state) => {
    loading.value = state
  }

  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  const setSidebarCollapsed = (collapsed) => {
    sidebarCollapsed.value = collapsed
  }

  const setTheme = (newTheme) => {
    theme.value = newTheme
    localStorage.setItem('theme', newTheme)
  }

  const init = () => {
    // 从localStorage恢复主题设置
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      theme.value = savedTheme
    }

    // 从localStorage恢复侧边栏状态
    const savedSidebarState = localStorage.getItem('sidebarCollapsed')
    if (savedSidebarState !== null) {
      sidebarCollapsed.value = JSON.parse(savedSidebarState)
    }
  }

  // 监听侧边栏状态变化并保存到localStorage
  const saveSidebarState = () => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed.value))
  }

  return {
    // 状态
    loading,
    sidebarCollapsed,
    theme,
    
    // 方法
    setLoading,
    toggleSidebar,
    setSidebarCollapsed,
    setTheme,
    init,
    saveSidebarState
  }
}) 