export default {
  name: 'txt-loader',
  load(id: string) {
    if (id.endsWith('.txt')) {
      return {
        code: JSON.stringify({ id }),
      }
    }
  },
}
