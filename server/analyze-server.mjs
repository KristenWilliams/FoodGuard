import { createApiServer } from "./api-server.mjs"

const port = Number(process.env.PORT || 8787)
createApiServer().listen(port, "0.0.0.0", () => {
  console.log(`FoodGuard API listening on ${port}; API Key login required; history stays on device.`)
})
