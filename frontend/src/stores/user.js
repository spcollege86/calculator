import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  // 状态
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || null)
  const refreshToken = ref(localStorage.getItem('refreshToken') || null)

  // 计算属性
  const isAuthenticated = computed(() => !!token.value)
  const userInfo = computed(() => user.value)

  // 方法
  const setAuth = (authData) => {
    user.value = authData.user
    token.value = authData.token
    refreshToken.value = authData.refreshToken

    // 存储到localStorage
    localStorage.setItem('token', authData.token)
    localStorage.setItem('refreshToken', authData.refreshToken)
  }

  const clearAuth = () => {
    user.value = null
    token.value = null
    refreshToken.value = null

    // 清除localStorage
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
  }

  const checkAuth = () => {
    const storedToken = localStorage.getItem('token')
    const storedRefreshToken = localStorage.getItem('refreshToken')
    
    if (storedToken && storedRefreshToken) {
      token.value = storedToken
      refreshToken.value = storedRefreshToken
      // 这里可以添加验证token有效性的逻辑
    }
  }

  const updateUser = (userData) => {
    if (user.value) {
      user.value = { ...user.value, ...userData }
    }
  }

  return {
    // 状态
    user,
    token,
    refreshToken,
    
    // 计算属性
    isAuthenticated,
    userInfo,
    
    // 方法
    setAuth,
    clearAuth,
    checkAuth,
    updateUser
  }
}) 