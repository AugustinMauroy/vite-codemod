if (import.meta.hot) {
	import.meta.hot.accept(["/src/a.js", "./b.js"], () => {});
}
