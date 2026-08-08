import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");

    const isLocal = env.VITE_ENV === "local";

    return {
        plugins: [react()],

        server: {
            host: "0.0.0.0",
            port: 5173,

            ...(isLocal && {
                https: {
                    key: fs.readFileSync("../certs/key.pem"),
                    cert: fs.readFileSync("../certs/cert.pem"),
                },
            }),
        },
    };
});