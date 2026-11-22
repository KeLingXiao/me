import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import CodeRunner from './components/CodeRunner.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) { app.component('CodeRunner', CodeRunner) }
}
