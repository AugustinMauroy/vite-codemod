export default {
    name: "txt-loader",
    load(id: string) {
        if (id.endsWith(".txt")) {
            const content = 'ok';

            return {
                code: content,
            };
        }
    },
};
