import { proxyToRender } from "../_render-proxy";
export default (
  request: Parameters<typeof proxyToRender>[0],
  response: Parameters<typeof proxyToRender>[1],
) => proxyToRender(request, response, "/api/auth");
