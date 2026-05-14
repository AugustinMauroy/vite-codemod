// Expected warning:
// Warning: Condition-order assumptions must be reviewed manually.
import { defineConfig } from 'vite'

const clientConditions = ['browser', 'development']

export default defineConfig({
  resolve: {
    conditions: clientConditions,
  },
})
