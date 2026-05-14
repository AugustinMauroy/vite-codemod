if (import.meta.hot) {
  import.meta.hot.accept('/src/dep.ts', (mod) => {
    console.log(mod)
  })
}
