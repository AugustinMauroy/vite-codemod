// Expected warning:
// Warning: Unable to safely rewrite dynamic import.meta.hot.accept URL usage.
if (import.meta.hot) {
  import.meta.hot.accept(new URL('./dep.ts', import.meta.url).href, (mod) => {
    console.log(mod)
  })
}
