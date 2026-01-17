import { createApp } from "@/app";
import { env } from "@/env";

const app = createApp();

app.listen(env.API_PORT);

console.log(`🚀 Kontribo backend running on http://localhost:${env.API_PORT}`);
