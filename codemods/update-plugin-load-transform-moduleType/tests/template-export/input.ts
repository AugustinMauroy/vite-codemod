import fs from "node:fs";

export default {
    name: "txt-loader",
    load(id: string) {
        if (id.endsWith(".txt")) {
            const content = fs.readFileSync(id, "utf-8");

            return {
                code: `export default ${content}`,
            };
        }
    },
};
