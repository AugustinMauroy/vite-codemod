if (import.meta.hot) {
  import.meta.hot.accept('./dep.ts', (mod) => {
    console.log(mod)
  })
}
