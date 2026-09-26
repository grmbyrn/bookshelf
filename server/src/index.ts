import { app } from "./app.js";
import { env } from "./config/env.js";

app.listen(Number(env.PORT) || 3001, () =>
  console.log(`server on http://localhost:${env.PORT ?? 3001}`),
);
