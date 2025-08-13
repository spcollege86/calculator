import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'

// Element Plus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

// 样式
import './styles/index.scss'

// 工具
import './utils/dayjs'

const app = createApp(App)

// 注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 使用插件
app.use(createPinia())
app.use(router)
app.use(ElementPlus, {
  locale: zhCn
})

// 全局属性
app.config.globalProperties.$ELEMENT = { size: 'default' }

// 挂载应用
app.mount('#app')

// 移除初始加载动画
const loadingElement = document.getElementById('initial-loading')
if (loadingElement) {
  loadingElement.remove()
} 