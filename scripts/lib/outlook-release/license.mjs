import { LICENSE_METADATA_OVERRIDES } from "./constants.mjs";
import { assertEqual, assertExactKeys, canonical } from "./primitives.mjs";

export function validateDependencyLicenses(packageLock, contract) {
  if (packageLock?.lockfileVersion !== 3 || !packageLock.packages) throw new Error("npm lockfile v3 is required");
  const overrides = contract.license_metadata_overrides ?? {};
  assertEqual(canonical(overrides), canonical(LICENSE_METADATA_OVERRIDES), "dependency license metadata overrides");
  const allowed = new Set(contract.allowed_dependency_licenses ?? []);
  const inventory = {};
  const usedOverrides = {};
  for (const [name, descriptor] of Object.entries(packageLock.packages)) {
    if (!name.startsWith("node_modules/") || descriptor.link === true) continue;
    const hasOwnLicense = Object.prototype.hasOwnProperty.call(descriptor, "license");
    let license;
    if (hasOwnLicense) {
      if (typeof descriptor.license !== "string" || !descriptor.license) {
        throw new TypeError(`${name}.license property is malformed`);
      }
      license = descriptor.license;
    } else {
      const override = overrides[name];
      if (!override) throw new TypeError(`${name}.license has no approved metadata override`);
      assertExactKeys(override, ["integrity", "license", "name", "resolved", "version"], `${name} license metadata override`);
      const packageName = name.slice(name.lastIndexOf("node_modules/") + "node_modules/".length);
      if (override.name !== packageName || descriptor.version !== override.version
        || descriptor.integrity !== override.integrity || descriptor.resolved !== override.resolved) {
        throw new Error(`license metadata override binding drifted: ${name}`);
      }
      license = override.license;
      usedOverrides[name] = override;
    }
    if (!allowed.has(license)) throw new Error(`dependency license is not allowlisted: ${name} (${license})`);
    inventory[license] = (inventory[license] ?? 0) + 1;
  }
  const unusedOverrides = Object.keys(overrides).filter((name) => !Object.prototype.hasOwnProperty.call(usedOverrides, name));
  if (unusedOverrides.length) throw new Error(`dependency license metadata override is stale or unused: ${unusedOverrides.join(", ")}`);
  for (const [dependency, expectedLicense] of Object.entries(contract.required_dependencies ?? {})) {
    const descriptor = packageLock.packages[`node_modules/${dependency}`];
    if (!descriptor || descriptor.link === true || descriptor.license !== expectedLicense) {
      throw new Error(`required dependency/license missing: ${dependency} (${expectedLicense})`);
    }
  }
  return {
    checked_package_count: Object.values(inventory).reduce((sum, count) => sum + count, 0),
    license_metadata_overrides: canonical(usedOverrides),
    licenses: canonical(inventory),
    required_dependencies: canonical(contract.required_dependencies),
  };
}
