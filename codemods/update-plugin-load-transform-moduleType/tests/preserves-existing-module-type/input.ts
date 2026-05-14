export default {
  name: 'json-loader',
  load(id: string) {
    if (id.endsWith('.json')) {
      return {
        code: 'export default {}',
        moduleType: 'js',
      }
    }
  },
}
