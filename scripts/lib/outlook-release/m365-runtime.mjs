import { validateM365GoLive } from "./m365-go-live.mjs";
import { validateM365Hosts } from "./m365-host.mjs";
import { validateM365Propagation } from "./m365-propagation.mjs";

export function validateM365Runtime(receipt, options, controls) {
  const propagation = validateM365Propagation(receipt, options);
  const hosts = validateM365Hosts(receipt, options);
  if (receipt.status === "deployment_verified"
    && (receipt.claims.propagation_verified !== true || receipt.claims.real_outlook_verified !== true)) {
    throw new Error("deployment_verified requires propagation and real Outlook evidence");
  }
  const goLive = validateM365GoLive(receipt, options, controls, propagation, hosts);
  return { propagation, hosts, goLive };
}
