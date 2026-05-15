// Expected warning:
// Warning: Non-JavaScript loader output needs a manual moduleType decision.
export default {
    name: "txt-loader",
    load(id: string) {
        if (id.endsWith(".txt")) {
            const content = 'ok';

            return {
                code: makeJs(content),
            };
        }
    },
};
