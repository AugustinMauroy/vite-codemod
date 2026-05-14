import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    {
      name: 'html-hooks',
      transformIndexHtml: {
        enforce: 'pre',
        transform(html) {
          return html.replace('<title>Vite</title>', '<title>App</title>')
        },
      },
    },
  ],
})
