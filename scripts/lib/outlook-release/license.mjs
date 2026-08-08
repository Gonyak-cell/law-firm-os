import { canonical, requiredText } from "./primitives.mjs";

export function validateDependencyLicenses(packageLock, contract) {
  if (packageLock?.lockfileVersion !== 3 || !packageLock.packages) throw new Error("npm lockfile v3 is required");
  const allowed = new Set(contract.allowed_dependency_licenses ?? []);
  const inventory = {};
  for (const [name, descriptor] of Object.entries(packageLock.packages)) {
    if (!name.startsWith("node_modules/") || descriptor.link === true) continue;
    const license = requiredText(descriptor.license, `${name}.license`);
    if (!allowed.has(license)) throw new Error(`dependency license is not allowlisted: ${name} (${license})`);
    inventory[license] = (inventory[license] ?? 0) + 1;
  }
  for (const [dependency, expectedLicense] of Object.entries(contract.required_dependencies ?? {})) {
    const descriptor = packageLock.packages[`node_modules/${dependency}`];
    if (!descriptor || descriptor.link === true || descriptor.license !== expectedLicense) {
      throw new Error(`required dependency/license missing: ${dependency} (${expectedLicense})`);
    }
  }
  return {
    checked_package_count: Object.values(inventory).reduce((sum, count) => sum + count, 0),
    licenses: canonical(inventory),
    required_dependencies: canonical(contract.required_dependencies),
  };
}
