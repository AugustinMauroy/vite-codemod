import { defineConfig } from 'vite'

export const client = defineConfig({
	build: {
		lib: {
			entry: 'src/main.ts',
			formats: ['umd'],
		},
	},
})

export const server = defineConfig({
	build: {
		lib: {
			entry: 'src/server.ts',
			formats: ['es'],
		},
	},
})
