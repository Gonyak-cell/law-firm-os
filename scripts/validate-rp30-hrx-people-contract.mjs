#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  HRX_CP897_PACK_BINDING,
  HRX_CP898_PACK_BINDING,
  HRX_CP899_PACK_BINDING,
  HRX_CP900_PACK_BINDING,
  HRX_CP901_PACK_BINDING,
  HRX_CP902_PACK_BINDING,
  HRX_CP903_PACK_BINDING,
  HRX_CP904_PACK_BINDING,
  HRX_CP905_PACK_BINDING,
  HRX_CP906_PACK_BINDING,
  HRX_CP907_PACK_BINDING,
  HRX_CP908_PACK_BINDING,
  HRX_CP909_PACK_BINDING,
  HRX_CP910_PACK_BINDING,
  HRX_CP911_PACK_BINDING,
  HRX_CP912_PACK_BINDING,
  HRX_CP913_PACK_BINDING,
  HRX_CP914_PACK_BINDING,
  HRX_CP915_PACK_BINDING,
  HRX_CP916_PACK_BINDING,
  HRX_CP917_PACK_BINDING,
  HRX_CP918_PACK_BINDING,
  HRX_CP919_PACK_BINDING,
  HRX_CP920_PACK_BINDING,
  HRX_CP921_PACK_BINDING,
  HRX_CP922_PACK_BINDING,
  HRX_CP923_PACK_BINDING,
  HRX_CP924_PACK_BINDING,
  HRX_CP925_PACK_BINDING,
  HRX_CP926_PACK_BINDING,
  HRX_CP927_PACK_BINDING,
  HRX_CP928_PACK_BINDING,
  HRX_CP929_PACK_BINDING,
  HRX_CP930_PACK_BINDING,
  HRX_CP931_PACK_BINDING,
  HRX_CP932_PACK_BINDING,
  HRX_CP933_PACK_BINDING,
  HRX_CP934_PACK_BINDING,
  HRX_CP935_PACK_BINDING,
  HRX_CP936_PACK_BINDING,
  HRX_CP937_PACK_BINDING,
  HRX_CP938_PACK_BINDING,
  HRX_CP939_PACK_BINDING,
  HRX_CP940_PACK_BINDING,
  HRX_CP941_PACK_BINDING,
  HRX_CP942_PACK_BINDING,
  HRX_CP943_PACK_BINDING,
  HRX_CP944_PACK_BINDING,
  HRX_CP945_PACK_BINDING,
  HRX_CP946_PACK_BINDING,
  HRX_CP947_PACK_BINDING,
  HRX_CP948_PACK_BINDING,
  HRX_CP949_PACK_BINDING,
  HRX_CP950_PACK_BINDING,
  HRX_CP951_PACK_BINDING,
  HRX_CP952_PACK_BINDING,
  HRX_CP953_PACK_BINDING,
  HRX_CP954_PACK_BINDING,
  HRX_CP955_PACK_BINDING,
  HRX_CP956_PACK_BINDING,
  HRX_CP957_PACK_BINDING,
  HRX_CP958_PACK_BINDING,
  HRX_CP959_PACK_BINDING,
  HRX_CP960_PACK_BINDING,
  HRX_CP961_PACK_BINDING,
  HRX_CP962_PACK_BINDING,
  HRX_CP963_PACK_BINDING,
  HRX_CP964_PACK_BINDING,
  HRX_CP965_PACK_BINDING,
  HRX_CP966_PACK_BINDING,
  HRX_CP967_PACK_BINDING,
  HRX_CP968_PACK_BINDING,
  HRX_CP969_PACK_BINDING,
  HRX_CP970_PACK_BINDING,
  HRX_CP971_PACK_BINDING,
  HRX_CP972_PACK_BINDING,
  HRX_CP973_PACK_BINDING,
  HRX_CP974_PACK_BINDING,
  HRX_CP975_PACK_BINDING,
  HRX_CP976_PACK_BINDING,
  HRX_CP977_PACK_BINDING,
  HRX_CP978_PACK_BINDING,
  HRX_CP979_PACK_BINDING,
  HRX_CP980_PACK_BINDING,
  HRX_CP981_PACK_BINDING,
  HRX_CP982_PACK_BINDING,
  HRX_CP983_PACK_BINDING,
  HRX_CP984_PACK_BINDING,
  HRX_CP985_PACK_BINDING,
  HRX_CP986_PACK_BINDING,
  HRX_CP987_PACK_BINDING,
  HRX_CP987_REQUIREMENTS,
  validateHrxCp987RiskRegisterFinalTailCoverage,
  validateHrxCp987RiskRegisterFinalTailDescriptor,
  validateHrxPeopleContract,
} from "../packages/hrx/src/index.js";

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

const contractPath = path.resolve("contracts/hrx-people-contract.json");
const planPath = path.resolve("docs/closeout-pack-plan/closeout-pack-plan.json");
const contract = await readJson(contractPath);
const plan = await readJson(planPath);
let planPack = plan.packs.find((pack) => pack.pack_id === HRX_CP987_PACK_BINDING.pack_id);
if (!planPack) {
  const manifestPath = path.resolve(`docs/closeout-packs/${HRX_CP987_PACK_BINDING.pack_id.toLowerCase()}/manifest.json`);
  const manifest = await readJson(manifestPath);
  if (manifest.plan_binding_snapshot?.pack_id === HRX_CP987_PACK_BINDING.pack_id) {
    planPack = manifest.plan_binding_snapshot;
  }
}

const errors = [];
if (HRX_CP897_PACK_BINDING.upstream_pack_id !== "CP00-896") {
  errors.push("CP897 upstream binding must point to CP00-896");
}
if (HRX_CP897_PACK_BINDING.next_pack_id !== "CP00-898") {
  errors.push("CP897 next binding must point to CP00-898");
}
if (HRX_CP897_PACK_BINDING.next_subphase_id !== "RP30.P00.M06.S01") {
  errors.push("CP897 next subphase must point to RP30.P00.M06.S01");
}
if (HRX_CP898_PACK_BINDING.upstream_pack_id !== HRX_CP897_PACK_BINDING.pack_id) {
  errors.push("CP898 upstream binding must point to CP00-897");
}
if (HRX_CP898_PACK_BINDING.next_pack_id !== "CP00-899") {
  errors.push("CP898 next binding must point to CP00-899");
}
if (HRX_CP898_PACK_BINDING.next_subphase_id !== "RP30.P00.M09.S02") {
  errors.push("CP898 next subphase must point to RP30.P00.M09.S02");
}
if (HRX_CP899_PACK_BINDING.upstream_pack_id !== HRX_CP898_PACK_BINDING.pack_id) {
  errors.push("CP899 upstream binding must point to CP00-898");
}
if (HRX_CP899_PACK_BINDING.next_pack_id !== "CP00-900") {
  errors.push("CP899 next binding must point to CP00-900");
}
if (HRX_CP899_PACK_BINDING.next_subphase_id !== "RP30.P01.M01.S03") {
  errors.push("CP899 next subphase must point to RP30.P01.M01.S03");
}
if (HRX_CP900_PACK_BINDING.upstream_pack_id !== HRX_CP899_PACK_BINDING.pack_id) {
  errors.push("CP900 upstream binding must point to CP00-899");
}
if (HRX_CP900_PACK_BINDING.next_pack_id !== "CP00-901") {
  errors.push("CP900 next binding must point to CP00-901");
}
if (HRX_CP900_PACK_BINDING.next_subphase_id !== "RP30.P01.M03.S03") {
  errors.push("CP900 next subphase must point to RP30.P01.M03.S03");
}
if (HRX_CP901_PACK_BINDING.upstream_pack_id !== HRX_CP900_PACK_BINDING.pack_id) {
  errors.push("CP901 upstream binding must point to CP00-900");
}
if (HRX_CP901_PACK_BINDING.next_pack_id !== "CP00-902") {
  errors.push("CP901 next binding must point to CP00-902");
}
if (HRX_CP901_PACK_BINDING.next_subphase_id !== "RP30.P01.M05.S03") {
  errors.push("CP901 next subphase must point to RP30.P01.M05.S03");
}
if (HRX_CP902_PACK_BINDING.upstream_pack_id !== HRX_CP901_PACK_BINDING.pack_id) {
  errors.push("CP902 upstream binding must point to CP00-901");
}
if (HRX_CP902_PACK_BINDING.next_pack_id !== "CP00-903") {
  errors.push("CP902 next binding must point to CP00-903");
}
if (HRX_CP902_PACK_BINDING.next_subphase_id !== "RP30.P01.M06.S04") {
  errors.push("CP902 next subphase must point to RP30.P01.M06.S04");
}
if (HRX_CP903_PACK_BINDING.upstream_pack_id !== HRX_CP902_PACK_BINDING.pack_id) {
  errors.push("CP903 upstream binding must point to CP00-902");
}
if (HRX_CP903_PACK_BINDING.next_pack_id !== "CP00-904") {
  errors.push("CP903 next binding must point to CP00-904");
}
if (HRX_CP903_PACK_BINDING.next_subphase_id !== "RP30.P01.M08.S04") {
  errors.push("CP903 next subphase must point to RP30.P01.M08.S04");
}
if (HRX_CP904_PACK_BINDING.upstream_pack_id !== HRX_CP903_PACK_BINDING.pack_id) {
  errors.push("CP904 upstream binding must point to CP00-903");
}
if (HRX_CP904_PACK_BINDING.next_pack_id !== "CP00-905") {
  errors.push("CP904 next binding must point to CP00-905");
}
if (HRX_CP904_PACK_BINDING.next_subphase_id !== "RP30.P01.M10.S04") {
  errors.push("CP904 next subphase must point to RP30.P01.M10.S04");
}
if (HRX_CP905_PACK_BINDING.upstream_pack_id !== HRX_CP904_PACK_BINDING.pack_id) {
  errors.push("CP905 upstream binding must point to CP00-904");
}
if (HRX_CP905_PACK_BINDING.next_pack_id !== "CP00-906") {
  errors.push("CP905 next binding must point to CP00-906");
}
if (HRX_CP905_PACK_BINDING.next_subphase_id !== "RP30.P02.M00.S09") {
  errors.push("CP905 next subphase must point to RP30.P02.M00.S09");
}
if (HRX_CP906_PACK_BINDING.upstream_pack_id !== HRX_CP905_PACK_BINDING.pack_id) {
  errors.push("CP906 upstream binding must point to CP00-905");
}
if (HRX_CP906_PACK_BINDING.next_pack_id !== "CP00-907") {
  errors.push("CP906 next binding must point to CP00-907");
}
if (HRX_CP906_PACK_BINDING.next_subphase_id !== "RP30.P02.M01.S06") {
  errors.push("CP906 next subphase must point to RP30.P02.M01.S06");
}
if (HRX_CP907_PACK_BINDING.upstream_pack_id !== HRX_CP906_PACK_BINDING.pack_id) {
  errors.push("CP907 upstream binding must point to CP00-906");
}
if (HRX_CP907_PACK_BINDING.next_pack_id !== "CP00-908") {
  errors.push("CP907 next binding must point to CP00-908");
}
if (HRX_CP907_PACK_BINDING.next_subphase_id !== "RP30.P02.M02.S03") {
  errors.push("CP907 next subphase must point to RP30.P02.M02.S03");
}
if (HRX_CP908_PACK_BINDING.upstream_pack_id !== HRX_CP907_PACK_BINDING.pack_id) {
  errors.push("CP908 upstream binding must point to CP00-907");
}
if (HRX_CP908_PACK_BINDING.next_pack_id !== "CP00-909") {
  errors.push("CP908 next binding must point to CP00-909");
}
if (HRX_CP908_PACK_BINDING.next_subphase_id !== "RP30.P02.M02.S13") {
  errors.push("CP908 next subphase must point to RP30.P02.M02.S13");
}
if (HRX_CP909_PACK_BINDING.upstream_pack_id !== HRX_CP908_PACK_BINDING.pack_id) {
  errors.push("CP909 upstream binding must point to CP00-908");
}
if (HRX_CP909_PACK_BINDING.next_pack_id !== "CP00-910") {
  errors.push("CP909 next binding must point to CP00-910");
}
if (HRX_CP909_PACK_BINDING.next_subphase_id !== "RP30.P02.M03.S10") {
  errors.push("CP909 next subphase must point to RP30.P02.M03.S10");
}
if (HRX_CP910_PACK_BINDING.upstream_pack_id !== HRX_CP909_PACK_BINDING.pack_id) {
  errors.push("CP910 upstream binding must point to CP00-909");
}
if (HRX_CP910_PACK_BINDING.next_pack_id !== "CP00-911") {
  errors.push("CP910 next binding must point to CP00-911");
}
if (HRX_CP910_PACK_BINDING.next_subphase_id !== "RP30.P02.M04.S07") {
  errors.push("CP910 next subphase must point to RP30.P02.M04.S07");
}
if (HRX_CP911_PACK_BINDING.upstream_pack_id !== HRX_CP910_PACK_BINDING.pack_id) {
  errors.push("CP911 upstream binding must point to CP00-910");
}
if (HRX_CP911_PACK_BINDING.next_pack_id !== "CP00-912") {
  errors.push("CP911 next binding must point to CP00-912");
}
if (HRX_CP911_PACK_BINDING.next_subphase_id !== "RP30.P02.M05.S05") {
  errors.push("CP911 next subphase must point to RP30.P02.M05.S05");
}
if (HRX_CP912_PACK_BINDING.upstream_pack_id !== HRX_CP911_PACK_BINDING.pack_id) {
  errors.push("CP912 upstream binding must point to CP00-911");
}
if (HRX_CP912_PACK_BINDING.next_pack_id !== "CP00-913") {
  errors.push("CP912 next binding must point to CP00-913");
}
if (HRX_CP912_PACK_BINDING.next_subphase_id !== "RP30.P02.M06.S02") {
  errors.push("CP912 next subphase must point to RP30.P02.M06.S02");
}
if (HRX_CP913_PACK_BINDING.upstream_pack_id !== HRX_CP912_PACK_BINDING.pack_id) {
  errors.push("CP913 upstream binding must point to CP00-912");
}
if (HRX_CP913_PACK_BINDING.next_pack_id !== "CP00-914") {
  errors.push("CP913 next binding must point to CP00-914");
}
if (HRX_CP913_PACK_BINDING.next_subphase_id !== "RP30.P02.M06.S12") {
  errors.push("CP913 next subphase must point to RP30.P02.M06.S12");
}
if (HRX_CP914_PACK_BINDING.upstream_pack_id !== HRX_CP913_PACK_BINDING.pack_id) {
  errors.push("CP914 upstream binding must point to CP00-913");
}
if (HRX_CP914_PACK_BINDING.next_pack_id !== "CP00-915") {
  errors.push("CP914 next binding must point to CP00-915");
}
if (HRX_CP914_PACK_BINDING.next_subphase_id !== "RP30.P02.M07.S10") {
  errors.push("CP914 next subphase must point to RP30.P02.M07.S10");
}
if (HRX_CP915_PACK_BINDING.upstream_pack_id !== HRX_CP914_PACK_BINDING.pack_id) {
  errors.push("CP915 upstream binding must point to CP00-914");
}
if (HRX_CP915_PACK_BINDING.next_pack_id !== "CP00-916") {
  errors.push("CP915 next binding must point to CP00-916");
}
if (HRX_CP915_PACK_BINDING.next_subphase_id !== "RP30.P02.M08.S08") {
  errors.push("CP915 next subphase must point to RP30.P02.M08.S08");
}
if (HRX_CP916_PACK_BINDING.upstream_pack_id !== HRX_CP915_PACK_BINDING.pack_id) {
  errors.push("CP916 upstream binding must point to CP00-915");
}
if (HRX_CP916_PACK_BINDING.next_pack_id !== "CP00-917") {
  errors.push("CP916 next binding must point to CP00-917");
}
if (HRX_CP916_PACK_BINDING.next_subphase_id !== "RP30.P02.M09.S06") {
  errors.push("CP916 next subphase must point to RP30.P02.M09.S06");
}
if (HRX_CP917_PACK_BINDING.upstream_pack_id !== HRX_CP916_PACK_BINDING.pack_id) {
  errors.push("CP917 upstream binding must point to CP00-916");
}
if (HRX_CP917_PACK_BINDING.next_pack_id !== "CP00-918") {
  errors.push("CP917 next binding must point to CP00-918");
}
if (HRX_CP917_PACK_BINDING.next_subphase_id !== "RP30.P02.M10.S04") {
  errors.push("CP917 next subphase must point to RP30.P02.M10.S04");
}
if (HRX_CP918_PACK_BINDING.upstream_pack_id !== HRX_CP917_PACK_BINDING.pack_id) {
  errors.push("CP918 upstream binding must point to CP00-917");
}
if (HRX_CP918_PACK_BINDING.next_pack_id !== "CP00-919") {
  errors.push("CP918 next binding must point to CP00-919");
}
if (HRX_CP918_PACK_BINDING.next_subphase_id !== "RP30.P03.M00.S02") {
  errors.push("CP918 next subphase must point to RP30.P03.M00.S02");
}
if (HRX_CP919_PACK_BINDING.upstream_pack_id !== HRX_CP918_PACK_BINDING.pack_id) {
  errors.push("CP919 upstream binding must point to CP00-918");
}
if (HRX_CP919_PACK_BINDING.next_pack_id !== "CP00-920") {
  errors.push("CP919 next binding must point to CP00-920");
}
if (HRX_CP919_PACK_BINDING.next_subphase_id !== "RP30.P03.M02.S02") {
  errors.push("CP919 next subphase must point to RP30.P03.M02.S02");
}
if (HRX_CP920_PACK_BINDING.upstream_pack_id !== HRX_CP919_PACK_BINDING.pack_id) {
  errors.push("CP920 upstream binding must point to CP00-919");
}
if (HRX_CP920_PACK_BINDING.next_pack_id !== "CP00-921") {
  errors.push("CP920 next binding must point to CP00-921");
}
if (HRX_CP920_PACK_BINDING.next_subphase_id !== "RP30.P03.M04.S02") {
  errors.push("CP920 next subphase must point to RP30.P03.M04.S02");
}
if (HRX_CP921_PACK_BINDING.upstream_pack_id !== HRX_CP920_PACK_BINDING.pack_id) {
  errors.push("CP921 upstream binding must point to CP00-920");
}
if (HRX_CP921_PACK_BINDING.next_pack_id !== "CP00-922") {
  errors.push("CP921 next binding must point to CP00-922");
}
if (HRX_CP921_PACK_BINDING.next_subphase_id !== "RP30.P03.M05.S07") {
  errors.push("CP921 next subphase must point to RP30.P03.M05.S07");
}
if (HRX_CP922_PACK_BINDING.upstream_pack_id !== HRX_CP921_PACK_BINDING.pack_id) {
  errors.push("CP922 upstream binding must point to CP00-921");
}
if (HRX_CP922_PACK_BINDING.next_pack_id !== "CP00-923") {
  errors.push("CP922 next binding must point to CP00-923");
}
if (HRX_CP922_PACK_BINDING.next_subphase_id !== "RP30.P03.M07.S03") {
  errors.push("CP922 next subphase must point to RP30.P03.M07.S03");
}
if (HRX_CP923_PACK_BINDING.upstream_pack_id !== HRX_CP922_PACK_BINDING.pack_id) {
  errors.push("CP923 upstream binding must point to CP00-922");
}
if (HRX_CP923_PACK_BINDING.next_pack_id !== "CP00-924") {
  errors.push("CP923 next binding must point to CP00-924");
}
if (HRX_CP923_PACK_BINDING.next_subphase_id !== "RP30.P03.M09.S03") {
  errors.push("CP923 next subphase must point to RP30.P03.M09.S03");
}
if (HRX_CP924_PACK_BINDING.upstream_pack_id !== HRX_CP923_PACK_BINDING.pack_id) {
  errors.push("CP924 upstream binding must point to CP00-923");
}
if (HRX_CP924_PACK_BINDING.next_pack_id !== "CP00-925") {
  errors.push("CP924 next binding must point to CP00-925");
}
if (HRX_CP924_PACK_BINDING.next_subphase_id !== "RP30.P04.M00.S03") {
  errors.push("CP924 next subphase must point to RP30.P04.M00.S03");
}
if (HRX_CP925_PACK_BINDING.upstream_pack_id !== HRX_CP924_PACK_BINDING.pack_id) {
  errors.push("CP925 upstream binding must point to CP00-924");
}
if (HRX_CP925_PACK_BINDING.next_pack_id !== "CP00-926") {
  errors.push("CP925 next binding must point to CP00-926");
}
if (HRX_CP925_PACK_BINDING.next_subphase_id !== "RP30.P04.M01.S04") {
  errors.push("CP925 next subphase must point to RP30.P04.M01.S04");
}
if (HRX_CP926_PACK_BINDING.upstream_pack_id !== HRX_CP925_PACK_BINDING.pack_id) {
  errors.push("CP926 upstream binding must point to CP00-925");
}
if (HRX_CP926_PACK_BINDING.next_pack_id !== "CP00-927") {
  errors.push("CP926 next binding must point to CP00-927");
}
if (HRX_CP926_PACK_BINDING.next_subphase_id !== "RP30.P04.M02.S05") {
  errors.push("CP926 next subphase must point to RP30.P04.M02.S05");
}
if (HRX_CP927_PACK_BINDING.upstream_pack_id !== HRX_CP926_PACK_BINDING.pack_id) {
  errors.push("CP927 upstream binding must point to CP00-926");
}
if (HRX_CP927_PACK_BINDING.next_pack_id !== "CP00-928") {
  errors.push("CP927 next binding must point to CP00-928");
}
if (HRX_CP927_PACK_BINDING.next_subphase_id !== "RP30.P04.M03.S06") {
  errors.push("CP927 next subphase must point to RP30.P04.M03.S06");
}
if (HRX_CP928_PACK_BINDING.upstream_pack_id !== HRX_CP927_PACK_BINDING.pack_id) {
  errors.push("CP928 upstream binding must point to CP00-927");
}
if (HRX_CP928_PACK_BINDING.next_pack_id !== "CP00-929") {
  errors.push("CP928 next binding must point to CP00-929");
}
if (HRX_CP928_PACK_BINDING.next_subphase_id !== "RP30.P04.M04.S07") {
  errors.push("CP928 next subphase must point to RP30.P04.M04.S07");
}
if (HRX_CP929_PACK_BINDING.upstream_pack_id !== HRX_CP928_PACK_BINDING.pack_id) {
  errors.push("CP929 upstream binding must point to CP00-928");
}
if (HRX_CP929_PACK_BINDING.next_pack_id !== "CP00-930") {
  errors.push("CP929 next binding must point to CP00-930");
}
if (HRX_CP929_PACK_BINDING.next_subphase_id !== "RP30.P04.M05.S08") {
  errors.push("CP929 next subphase must point to RP30.P04.M05.S08");
}
if (HRX_CP930_PACK_BINDING.upstream_pack_id !== HRX_CP929_PACK_BINDING.pack_id) {
  errors.push("CP930 upstream binding must point to CP00-929");
}
if (HRX_CP930_PACK_BINDING.next_pack_id !== "CP00-931") {
  errors.push("CP930 next binding must point to CP00-931");
}
if (HRX_CP930_PACK_BINDING.next_subphase_id !== "RP30.P04.M06.S09") {
  errors.push("CP930 next subphase must point to RP30.P04.M06.S09");
}
if (HRX_CP931_PACK_BINDING.upstream_pack_id !== HRX_CP930_PACK_BINDING.pack_id) {
  errors.push("CP931 upstream binding must point to CP00-930");
}
if (HRX_CP931_PACK_BINDING.next_pack_id !== "CP00-932") {
  errors.push("CP931 next binding must point to CP00-932");
}
if (HRX_CP931_PACK_BINDING.next_subphase_id !== "RP30.P04.M08.S02") {
  errors.push("CP931 next subphase must point to RP30.P04.M08.S02");
}
if (HRX_CP932_PACK_BINDING.upstream_pack_id !== HRX_CP931_PACK_BINDING.pack_id) {
  errors.push("CP932 upstream binding must point to CP00-931");
}
if (HRX_CP932_PACK_BINDING.next_pack_id !== "CP00-933") {
  errors.push("CP932 next binding must point to CP00-933");
}
if (HRX_CP932_PACK_BINDING.next_subphase_id !== "RP30.P04.M09.S04") {
  errors.push("CP932 next subphase must point to RP30.P04.M09.S04");
}
if (HRX_CP933_PACK_BINDING.upstream_pack_id !== HRX_CP932_PACK_BINDING.pack_id) {
  errors.push("CP933 upstream binding must point to CP00-932");
}
if (HRX_CP933_PACK_BINDING.next_pack_id !== "CP00-934") {
  errors.push("CP933 next binding must point to CP00-934");
}
if (HRX_CP933_PACK_BINDING.next_subphase_id !== "RP30.P04.M10.S06") {
  errors.push("CP933 next subphase must point to RP30.P04.M10.S06");
}
if (HRX_CP934_PACK_BINDING.upstream_pack_id !== HRX_CP933_PACK_BINDING.pack_id) {
  errors.push("CP934 upstream binding must point to CP00-933");
}
if (HRX_CP934_PACK_BINDING.next_pack_id !== "CP00-935") {
  errors.push("CP934 next binding must point to CP00-935");
}
if (HRX_CP934_PACK_BINDING.next_subphase_id !== "RP30.P05.M00.S07") {
  errors.push("CP934 next subphase must point to RP30.P05.M00.S07");
}
if (HRX_CP935_PACK_BINDING.upstream_pack_id !== HRX_CP934_PACK_BINDING.pack_id) {
  errors.push("CP935 upstream binding must point to CP00-934");
}
if (HRX_CP935_PACK_BINDING.next_pack_id !== "CP00-936") {
  errors.push("CP935 next binding must point to CP00-936");
}
if (HRX_CP935_PACK_BINDING.next_subphase_id !== "RP30.P05.M01.S08") {
  errors.push("CP935 next subphase must point to RP30.P05.M01.S08");
}
if (HRX_CP936_PACK_BINDING.upstream_pack_id !== HRX_CP935_PACK_BINDING.pack_id) {
  errors.push("CP936 upstream binding must point to CP00-935");
}
if (HRX_CP936_PACK_BINDING.next_pack_id !== "CP00-937") {
  errors.push("CP936 next binding must point to CP00-937");
}
if (HRX_CP936_PACK_BINDING.next_subphase_id !== "RP30.P05.M02.S09") {
  errors.push("CP936 next subphase must point to RP30.P05.M02.S09");
}
if (HRX_CP937_PACK_BINDING.upstream_pack_id !== HRX_CP936_PACK_BINDING.pack_id) {
  errors.push("CP937 upstream binding must point to CP00-936");
}
if (HRX_CP937_PACK_BINDING.next_pack_id !== "CP00-938") {
  errors.push("CP937 next binding must point to CP00-938");
}
if (HRX_CP937_PACK_BINDING.next_subphase_id !== "RP30.P05.M04.S01") {
  errors.push("CP937 next subphase must point to RP30.P05.M04.S01");
}
if (HRX_CP938_PACK_BINDING.upstream_pack_id !== HRX_CP937_PACK_BINDING.pack_id) {
  errors.push("CP938 upstream binding must point to CP00-937");
}
if (HRX_CP938_PACK_BINDING.next_pack_id !== "CP00-939") {
  errors.push("CP938 next binding must point to CP00-939");
}
if (HRX_CP938_PACK_BINDING.next_subphase_id !== "RP30.P05.M05.S02") {
  errors.push("CP938 next subphase must point to RP30.P05.M05.S02");
}
if (HRX_CP939_PACK_BINDING.upstream_pack_id !== HRX_CP938_PACK_BINDING.pack_id) {
  errors.push("CP939 upstream binding must point to CP00-938");
}
if (HRX_CP939_PACK_BINDING.next_pack_id !== "CP00-940") {
  errors.push("CP939 next binding must point to CP00-940");
}
if (HRX_CP939_PACK_BINDING.next_subphase_id !== "RP30.P05.M06.S03") {
  errors.push("CP939 next subphase must point to RP30.P05.M06.S03");
}
if (HRX_CP940_PACK_BINDING.upstream_pack_id !== HRX_CP939_PACK_BINDING.pack_id) {
  errors.push("CP940 upstream binding must point to CP00-939");
}
if (HRX_CP940_PACK_BINDING.next_pack_id !== "CP00-941") {
  errors.push("CP940 next binding must point to CP00-941");
}
if (HRX_CP940_PACK_BINDING.next_subphase_id !== "RP30.P05.M07.S04") {
  errors.push("CP940 next subphase must point to RP30.P05.M07.S04");
}
if (HRX_CP941_PACK_BINDING.upstream_pack_id !== HRX_CP940_PACK_BINDING.pack_id) {
  errors.push("CP941 upstream binding must point to CP00-940");
}
if (HRX_CP941_PACK_BINDING.next_pack_id !== "CP00-942") {
  errors.push("CP941 next binding must point to CP00-942");
}
if (HRX_CP941_PACK_BINDING.next_subphase_id !== "RP30.P05.M08.S06") {
  errors.push("CP941 next subphase must point to RP30.P05.M08.S06");
}
if (HRX_CP942_PACK_BINDING.upstream_pack_id !== HRX_CP941_PACK_BINDING.pack_id) {
  errors.push("CP942 upstream binding must point to CP00-941");
}
if (HRX_CP942_PACK_BINDING.next_pack_id !== "CP00-943") {
  errors.push("CP942 next binding must point to CP00-943");
}
if (HRX_CP942_PACK_BINDING.next_subphase_id !== "RP30.P05.M09.S08") {
  errors.push("CP942 next subphase must point to RP30.P05.M09.S08");
}
if (HRX_CP943_PACK_BINDING.upstream_pack_id !== HRX_CP942_PACK_BINDING.pack_id) {
  errors.push("CP943 upstream binding must point to CP00-942");
}
if (HRX_CP943_PACK_BINDING.next_pack_id !== "CP00-944") {
  errors.push("CP943 next binding must point to CP00-944");
}
if (HRX_CP943_PACK_BINDING.next_subphase_id !== "RP30.P06.M00.S01") {
  errors.push("CP943 next subphase must point to RP30.P06.M00.S01");
}
if (HRX_CP944_PACK_BINDING.upstream_pack_id !== HRX_CP943_PACK_BINDING.pack_id) {
  errors.push("CP944 upstream binding must point to CP00-943");
}
if (HRX_CP944_PACK_BINDING.next_pack_id !== "CP00-945") {
  errors.push("CP944 next binding must point to CP00-945");
}
if (HRX_CP944_PACK_BINDING.next_subphase_id !== "RP30.P06.M00.S11") {
  errors.push("CP944 next subphase must point to RP30.P06.M00.S11");
}
if (HRX_CP945_PACK_BINDING.upstream_pack_id !== HRX_CP944_PACK_BINDING.pack_id) {
  errors.push("CP945 upstream binding must point to CP00-944");
}
if (HRX_CP945_PACK_BINDING.next_pack_id !== "CP00-946") {
  errors.push("CP945 next binding must point to CP00-946");
}
if (HRX_CP945_PACK_BINDING.next_subphase_id !== "RP30.P06.M01.S08") {
  errors.push("CP945 next subphase must point to RP30.P06.M01.S08");
}
if (HRX_CP946_PACK_BINDING.upstream_pack_id !== HRX_CP945_PACK_BINDING.pack_id) {
  errors.push("CP946 upstream binding must point to CP00-945");
}
if (HRX_CP946_PACK_BINDING.next_pack_id !== "CP00-947") {
  errors.push("CP946 next binding must point to CP00-947");
}
if (HRX_CP946_PACK_BINDING.next_subphase_id !== "RP30.P06.M02.S05") {
  errors.push("CP946 next subphase must point to RP30.P06.M02.S05");
}
if (HRX_CP947_PACK_BINDING.upstream_pack_id !== HRX_CP946_PACK_BINDING.pack_id) {
  errors.push("CP947 upstream binding must point to CP00-946");
}
if (HRX_CP947_PACK_BINDING.next_pack_id !== "CP00-948") {
  errors.push("CP947 next binding must point to CP00-948");
}
if (HRX_CP947_PACK_BINDING.next_subphase_id !== "RP30.P06.M03.S02") {
  errors.push("CP947 next subphase must point to RP30.P06.M03.S02");
}
if (HRX_CP948_PACK_BINDING.upstream_pack_id !== HRX_CP947_PACK_BINDING.pack_id) {
  errors.push("CP948 upstream binding must point to CP00-947");
}
if (HRX_CP948_PACK_BINDING.next_pack_id !== "CP00-949") {
  errors.push("CP948 next binding must point to CP00-949");
}
if (HRX_CP948_PACK_BINDING.next_subphase_id !== "RP30.P06.M03.S12") {
  errors.push("CP948 next subphase must point to RP30.P06.M03.S12");
}
if (HRX_CP949_PACK_BINDING.upstream_pack_id !== HRX_CP948_PACK_BINDING.pack_id) {
  errors.push("CP949 upstream binding must point to CP00-948");
}
if (HRX_CP949_PACK_BINDING.next_pack_id !== "CP00-950") {
  errors.push("CP949 next binding must point to CP00-950");
}
if (HRX_CP949_PACK_BINDING.next_subphase_id !== "RP30.P06.M04.S09") {
  errors.push("CP949 next subphase must point to RP30.P06.M04.S09");
}
if (HRX_CP950_PACK_BINDING.upstream_pack_id !== HRX_CP949_PACK_BINDING.pack_id) {
  errors.push("CP950 upstream binding must point to CP00-949");
}
if (HRX_CP950_PACK_BINDING.next_pack_id !== "CP00-951") {
  errors.push("CP950 next binding must point to CP00-951");
}
if (HRX_CP950_PACK_BINDING.next_subphase_id !== "RP30.P06.M05.S07") {
  errors.push("CP950 next subphase must point to RP30.P06.M05.S07");
}
if (HRX_CP951_PACK_BINDING.upstream_pack_id !== HRX_CP950_PACK_BINDING.pack_id) {
  errors.push("CP951 upstream binding must point to CP00-950");
}
if (HRX_CP951_PACK_BINDING.next_pack_id !== "CP00-952") {
  errors.push("CP951 next binding must point to CP00-952");
}
if (HRX_CP951_PACK_BINDING.next_subphase_id !== "RP30.P06.M06.S04") {
  errors.push("CP951 next subphase must point to RP30.P06.M06.S04");
}
if (HRX_CP952_PACK_BINDING.upstream_pack_id !== HRX_CP951_PACK_BINDING.pack_id) {
  errors.push("CP952 upstream binding must point to CP00-951");
}
if (HRX_CP952_PACK_BINDING.next_pack_id !== "CP00-953") {
  errors.push("CP952 next binding must point to CP00-953");
}
if (HRX_CP952_PACK_BINDING.next_subphase_id !== "RP30.P06.M07.S02") {
  errors.push("CP952 next subphase must point to RP30.P06.M07.S02");
}
if (HRX_CP953_PACK_BINDING.upstream_pack_id !== HRX_CP952_PACK_BINDING.pack_id) {
  errors.push("CP953 upstream binding must point to CP00-952");
}
if (HRX_CP953_PACK_BINDING.next_pack_id !== "CP00-954") {
  errors.push("CP953 next binding must point to CP00-954");
}
if (HRX_CP953_PACK_BINDING.next_subphase_id !== "RP30.P06.M07.S12") {
  errors.push("CP953 next subphase must point to RP30.P06.M07.S12");
}
if (HRX_CP954_PACK_BINDING.upstream_pack_id !== HRX_CP953_PACK_BINDING.pack_id) {
  errors.push("CP954 upstream binding must point to CP00-953");
}
if (HRX_CP954_PACK_BINDING.next_pack_id !== "CP00-955") {
  errors.push("CP954 next binding must point to CP00-955");
}
if (HRX_CP954_PACK_BINDING.next_subphase_id !== "RP30.P06.M08.S10") {
  errors.push("CP954 next subphase must point to RP30.P06.M08.S10");
}
if (HRX_CP955_PACK_BINDING.upstream_pack_id !== HRX_CP954_PACK_BINDING.pack_id) {
  errors.push("CP955 upstream binding must point to CP00-954");
}
if (HRX_CP955_PACK_BINDING.next_pack_id !== "CP00-956") {
  errors.push("CP955 next binding must point to CP00-956");
}
if (HRX_CP955_PACK_BINDING.next_subphase_id !== "RP30.P06.M09.S08") {
  errors.push("CP955 next subphase must point to RP30.P06.M09.S08");
}
if (HRX_CP956_PACK_BINDING.upstream_pack_id !== HRX_CP955_PACK_BINDING.pack_id) {
  errors.push("CP956 upstream binding must point to CP00-955");
}
if (HRX_CP956_PACK_BINDING.next_pack_id !== "CP00-957") {
  errors.push("CP956 next binding must point to CP00-957");
}
if (HRX_CP956_PACK_BINDING.next_subphase_id !== "RP30.P06.M10.S06") {
  errors.push("CP956 next subphase must point to RP30.P06.M10.S06");
}
if (HRX_CP957_PACK_BINDING.upstream_pack_id !== HRX_CP956_PACK_BINDING.pack_id) {
  errors.push("CP957 upstream binding must point to CP00-956");
}
if (HRX_CP957_PACK_BINDING.next_pack_id !== "CP00-958") {
  errors.push("CP957 next binding must point to CP00-958");
}
if (HRX_CP957_PACK_BINDING.next_subphase_id !== "RP30.P07.M00.S04") {
  errors.push("CP957 next subphase must point to RP30.P07.M00.S04");
}
if (HRX_CP958_PACK_BINDING.upstream_pack_id !== HRX_CP957_PACK_BINDING.pack_id) {
  errors.push("CP958 upstream binding must point to CP00-957");
}
if (HRX_CP958_PACK_BINDING.next_pack_id !== "CP00-959") {
  errors.push("CP958 next binding must point to CP00-959");
}
if (HRX_CP958_PACK_BINDING.next_subphase_id !== "RP30.P07.M01.S01") {
  errors.push("CP958 next subphase must point to RP30.P07.M01.S01");
}
if (HRX_CP959_PACK_BINDING.upstream_pack_id !== HRX_CP958_PACK_BINDING.pack_id) {
  errors.push("CP959 upstream binding must point to CP00-958");
}
if (HRX_CP959_PACK_BINDING.next_pack_id !== "CP00-960") {
  errors.push("CP959 next binding must point to CP00-960");
}
if (HRX_CP959_PACK_BINDING.next_subphase_id !== "RP30.P07.M01.S11") {
  errors.push("CP959 next subphase must point to RP30.P07.M01.S11");
}
if (HRX_CP960_PACK_BINDING.upstream_pack_id !== HRX_CP959_PACK_BINDING.pack_id) {
  errors.push("CP960 upstream binding must point to CP00-959");
}
if (HRX_CP960_PACK_BINDING.next_pack_id !== "CP00-961") {
  errors.push("CP960 next binding must point to CP00-961");
}
if (HRX_CP960_PACK_BINDING.next_subphase_id !== "RP30.P07.M02.S08") {
  errors.push("CP960 next subphase must point to RP30.P07.M02.S08");
}
if (HRX_CP961_PACK_BINDING.upstream_pack_id !== HRX_CP960_PACK_BINDING.pack_id) {
  errors.push("CP961 upstream binding must point to CP00-960");
}
if (HRX_CP961_PACK_BINDING.next_pack_id !== "CP00-962") {
  errors.push("CP961 next binding must point to CP00-962");
}
if (HRX_CP961_PACK_BINDING.next_subphase_id !== "RP30.P07.M03.S05") {
  errors.push("CP961 next subphase must point to RP30.P07.M03.S05");
}
if (HRX_CP962_PACK_BINDING.upstream_pack_id !== HRX_CP961_PACK_BINDING.pack_id) {
  errors.push("CP962 upstream binding must point to CP00-961");
}
if (HRX_CP962_PACK_BINDING.next_pack_id !== "CP00-963") {
  errors.push("CP962 next binding must point to CP00-963");
}
if (HRX_CP962_PACK_BINDING.next_subphase_id !== "RP30.P07.M04.S02") {
  errors.push("CP962 next subphase must point to RP30.P07.M04.S02");
}
if (HRX_CP963_PACK_BINDING.upstream_pack_id !== HRX_CP962_PACK_BINDING.pack_id) {
  errors.push("CP963 upstream binding must point to CP00-962");
}
if (HRX_CP963_PACK_BINDING.next_pack_id !== "CP00-964") {
  errors.push("CP963 next binding must point to CP00-964");
}
if (HRX_CP963_PACK_BINDING.next_subphase_id !== "RP30.P07.M04.S12") {
  errors.push("CP963 next subphase must point to RP30.P07.M04.S12");
}
if (HRX_CP964_PACK_BINDING.upstream_pack_id !== HRX_CP963_PACK_BINDING.pack_id) {
  errors.push("CP964 upstream binding must point to CP00-963");
}
if (HRX_CP964_PACK_BINDING.next_pack_id !== "CP00-965") {
  errors.push("CP964 next binding must point to CP00-965");
}
if (HRX_CP964_PACK_BINDING.next_subphase_id !== "RP30.P07.M05.S10") {
  errors.push("CP964 next subphase must point to RP30.P07.M05.S10");
}
if (HRX_CP965_PACK_BINDING.upstream_pack_id !== HRX_CP964_PACK_BINDING.pack_id) {
  errors.push("CP965 upstream binding must point to CP00-964");
}
if (HRX_CP965_PACK_BINDING.next_pack_id !== "CP00-966") {
  errors.push("CP965 next binding must point to CP00-966");
}
if (HRX_CP965_PACK_BINDING.next_subphase_id !== "RP30.P07.M06.S08") {
  errors.push("CP965 next subphase must point to RP30.P07.M06.S08");
}
if (HRX_CP966_PACK_BINDING.upstream_pack_id !== HRX_CP965_PACK_BINDING.pack_id) {
  errors.push("CP966 upstream binding must point to CP00-965");
}
if (HRX_CP966_PACK_BINDING.next_pack_id !== "CP00-967") {
  errors.push("CP966 next binding must point to CP00-967");
}
if (HRX_CP966_PACK_BINDING.next_subphase_id !== "RP30.P07.M07.S06") {
  errors.push("CP966 next subphase must point to RP30.P07.M07.S06");
}
if (HRX_CP967_PACK_BINDING.upstream_pack_id !== HRX_CP966_PACK_BINDING.pack_id) {
  errors.push("CP967 upstream binding must point to CP00-966");
}
if (HRX_CP967_PACK_BINDING.next_pack_id !== "CP00-968") {
  errors.push("CP967 next binding must point to CP00-968");
}
if (HRX_CP967_PACK_BINDING.next_subphase_id !== "RP30.P07.M08.S04") {
  errors.push("CP967 next subphase must point to RP30.P07.M08.S04");
}
if (HRX_CP968_PACK_BINDING.upstream_pack_id !== HRX_CP967_PACK_BINDING.pack_id) {
  errors.push("CP968 upstream binding must point to CP00-967");
}
if (HRX_CP968_PACK_BINDING.next_pack_id !== "CP00-969") {
  errors.push("CP968 next binding must point to CP00-969");
}
if (HRX_CP968_PACK_BINDING.next_subphase_id !== "RP30.P07.M09.S02") {
  errors.push("CP968 next subphase must point to RP30.P07.M09.S02");
}
if (HRX_CP969_PACK_BINDING.upstream_pack_id !== HRX_CP968_PACK_BINDING.pack_id) {
  errors.push("CP969 upstream binding must point to CP00-968");
}
if (HRX_CP969_PACK_BINDING.next_pack_id !== "CP00-970") {
  errors.push("CP969 next binding must point to CP00-970");
}
if (HRX_CP969_PACK_BINDING.next_subphase_id !== "RP30.P07.M09.S12") {
  errors.push("CP969 next subphase must point to RP30.P07.M09.S12");
}
if (HRX_CP970_PACK_BINDING.upstream_pack_id !== HRX_CP969_PACK_BINDING.pack_id) {
  errors.push("CP970 upstream binding must point to CP00-969");
}
if (HRX_CP970_PACK_BINDING.next_pack_id !== "CP00-971") {
  errors.push("CP970 next binding must point to CP00-971");
}
if (HRX_CP970_PACK_BINDING.next_subphase_id !== "RP30.P07.M10.S10") {
  errors.push("CP970 next subphase must point to RP30.P07.M10.S10");
}
if (HRX_CP971_PACK_BINDING.upstream_pack_id !== HRX_CP970_PACK_BINDING.pack_id) {
  errors.push("CP971 upstream binding must point to CP00-970");
}
if (HRX_CP971_PACK_BINDING.next_pack_id !== "CP00-972") {
  errors.push("CP971 next binding must point to CP00-972");
}
if (HRX_CP971_PACK_BINDING.next_subphase_id !== "RP30.P08.M00.S08") {
  errors.push("CP971 next subphase must point to RP30.P08.M00.S08");
}
if (HRX_CP972_PACK_BINDING.upstream_pack_id !== HRX_CP971_PACK_BINDING.pack_id) {
  errors.push("CP972 upstream binding must point to CP00-971");
}
if (HRX_CP972_PACK_BINDING.next_pack_id !== "CP00-973") {
  errors.push("CP972 next binding must point to CP00-973");
}
if (HRX_CP972_PACK_BINDING.next_subphase_id !== "RP30.P08.M01.S09") {
  errors.push("CP972 next subphase must point to RP30.P08.M01.S09");
}
if (HRX_CP973_PACK_BINDING.upstream_pack_id !== HRX_CP972_PACK_BINDING.pack_id) {
  errors.push("CP973 upstream binding must point to CP00-972");
}
if (HRX_CP973_PACK_BINDING.next_pack_id !== "CP00-974") {
  errors.push("CP973 next binding must point to CP00-974");
}
if (HRX_CP973_PACK_BINDING.next_subphase_id !== "RP30.P08.M03.S01") {
  errors.push("CP973 next subphase must point to RP30.P08.M03.S01");
}
if (HRX_CP974_PACK_BINDING.upstream_pack_id !== HRX_CP973_PACK_BINDING.pack_id) {
  errors.push("CP974 upstream binding must point to CP00-973");
}
if (HRX_CP974_PACK_BINDING.next_pack_id !== "CP00-975") {
  errors.push("CP974 next binding must point to CP00-975");
}
if (HRX_CP974_PACK_BINDING.next_subphase_id !== "RP30.P08.M04.S02") {
  errors.push("CP974 next subphase must point to RP30.P08.M04.S02");
}
if (HRX_CP975_PACK_BINDING.upstream_pack_id !== HRX_CP974_PACK_BINDING.pack_id) {
  errors.push("CP975 upstream binding must point to CP00-974");
}
if (HRX_CP975_PACK_BINDING.next_pack_id !== "CP00-976") {
  errors.push("CP975 next binding must point to CP00-976");
}
if (HRX_CP975_PACK_BINDING.next_subphase_id !== "RP30.P08.M05.S03") {
  errors.push("CP975 next subphase must point to RP30.P08.M05.S03");
}
if (HRX_CP976_PACK_BINDING.upstream_pack_id !== HRX_CP975_PACK_BINDING.pack_id) {
  errors.push("CP976 upstream binding must point to CP00-975");
}
if (HRX_CP976_PACK_BINDING.next_pack_id !== "CP00-977") {
  errors.push("CP976 next binding must point to CP00-977");
}
if (HRX_CP976_PACK_BINDING.next_subphase_id !== "RP30.P08.M06.S05") {
  errors.push("CP976 next subphase must point to RP30.P08.M06.S05");
}
if (HRX_CP977_PACK_BINDING.upstream_pack_id !== HRX_CP976_PACK_BINDING.pack_id) {
  errors.push("CP977 upstream binding must point to CP00-976");
}
if (HRX_CP977_PACK_BINDING.next_pack_id !== "CP00-978") {
  errors.push("CP977 next binding must point to CP00-978");
}
if (HRX_CP977_PACK_BINDING.next_subphase_id !== "RP30.P08.M07.S06") {
  errors.push("CP977 next subphase must point to RP30.P08.M07.S06");
}
if (HRX_CP978_PACK_BINDING.upstream_pack_id !== HRX_CP977_PACK_BINDING.pack_id) {
  errors.push("CP978 upstream binding must point to CP00-977");
}
if (HRX_CP978_PACK_BINDING.next_pack_id !== "CP00-979") {
  errors.push("CP978 next binding must point to CP00-979");
}
if (HRX_CP978_PACK_BINDING.next_subphase_id !== "RP30.P08.M08.S08") {
  errors.push("CP978 next subphase must point to RP30.P08.M08.S08");
}
if (HRX_CP979_PACK_BINDING.upstream_pack_id !== HRX_CP978_PACK_BINDING.pack_id) {
  errors.push("CP979 upstream binding must point to CP00-978");
}
if (HRX_CP979_PACK_BINDING.next_pack_id !== "CP00-980") {
  errors.push("CP979 next binding must point to CP00-980");
}
if (HRX_CP979_PACK_BINDING.next_subphase_id !== "RP30.P08.M10.S02") {
  errors.push("CP979 next subphase must point to RP30.P08.M10.S02");
}
if (HRX_CP980_PACK_BINDING.upstream_pack_id !== HRX_CP979_PACK_BINDING.pack_id) {
  errors.push("CP980 upstream binding must point to CP00-979");
}
if (HRX_CP980_PACK_BINDING.next_pack_id !== "CP00-981") {
  errors.push("CP980 next binding must point to CP00-981");
}
if (HRX_CP980_PACK_BINDING.next_subphase_id !== "RP30.P09.M00.S03") {
  errors.push("CP980 next subphase must point to RP30.P09.M00.S03");
}
if (HRX_CP981_PACK_BINDING.upstream_pack_id !== HRX_CP980_PACK_BINDING.pack_id) {
  errors.push("CP981 upstream binding must point to CP00-980");
}
if (HRX_CP981_PACK_BINDING.next_pack_id !== "CP00-982") {
  errors.push("CP981 next binding must point to CP00-982");
}
if (HRX_CP981_PACK_BINDING.next_subphase_id !== "RP30.P09.M02.S03") {
  errors.push("CP981 next subphase must point to RP30.P09.M02.S03");
}
if (HRX_CP982_PACK_BINDING.upstream_pack_id !== HRX_CP981_PACK_BINDING.pack_id) {
  errors.push("CP982 upstream binding must point to CP00-981");
}
if (HRX_CP982_PACK_BINDING.next_pack_id !== "CP00-983") {
  errors.push("CP982 next binding must point to CP00-983");
}
if (HRX_CP982_PACK_BINDING.next_subphase_id !== "RP30.P09.M04.S03") {
  errors.push("CP982 next subphase must point to RP30.P09.M04.S03");
}
if (HRX_CP983_PACK_BINDING.upstream_pack_id !== HRX_CP982_PACK_BINDING.pack_id) {
  errors.push("CP983 upstream binding must point to CP00-982");
}
if (HRX_CP983_PACK_BINDING.next_pack_id !== "CP00-984") {
  errors.push("CP983 next binding must point to CP00-984");
}
if (HRX_CP983_PACK_BINDING.next_subphase_id !== "RP30.P09.M05.S08") {
  errors.push("CP983 next subphase must point to RP30.P09.M05.S08");
}
if (HRX_CP984_PACK_BINDING.upstream_pack_id !== HRX_CP983_PACK_BINDING.pack_id) {
  errors.push("CP984 upstream binding must point to CP00-983");
}
if (HRX_CP984_PACK_BINDING.next_pack_id !== "CP00-985") {
  errors.push("CP984 next binding must point to CP00-985");
}
if (HRX_CP984_PACK_BINDING.next_subphase_id !== "RP30.P09.M07.S05") {
  errors.push("CP984 next subphase must point to RP30.P09.M07.S05");
}
if (HRX_CP985_PACK_BINDING.upstream_pack_id !== HRX_CP984_PACK_BINDING.pack_id) {
  errors.push("CP985 upstream binding must point to CP00-984");
}
if (HRX_CP985_PACK_BINDING.next_pack_id !== "CP00-986") {
  errors.push("CP985 next binding must point to CP00-986");
}
if (HRX_CP985_PACK_BINDING.next_subphase_id !== "RP30.P09.M09.S05") {
  errors.push("CP985 next subphase must point to RP30.P09.M09.S05");
}
if (HRX_CP986_PACK_BINDING.upstream_pack_id !== HRX_CP985_PACK_BINDING.pack_id) {
  errors.push("CP986 upstream binding must point to CP00-985");
}
if (HRX_CP986_PACK_BINDING.next_pack_id !== "CP00-987") {
  errors.push("CP986 next binding must point to CP00-987");
}
if (HRX_CP986_PACK_BINDING.next_subphase_id !== "RP30.P09.M10.S10") {
  errors.push("CP986 next subphase must point to RP30.P09.M10.S10");
}
if (HRX_CP987_PACK_BINDING.upstream_pack_id !== HRX_CP986_PACK_BINDING.pack_id) {
  errors.push("CP987 upstream binding must point to CP00-986");
}
if (HRX_CP987_PACK_BINDING.next_pack_id !== null) {
  errors.push("CP987 next binding must be null at closeout completion");
}
if (HRX_CP987_PACK_BINDING.next_subphase_id !== null) {
  errors.push("CP987 next subphase must be null at closeout completion");
}

const coverage = validateHrxCp987RiskRegisterFinalTailCoverage(planPack);
if (!coverage.valid) errors.push(...coverage.errors);

const descriptor = validateHrxCp987RiskRegisterFinalTailDescriptor(undefined, contract);
if (!descriptor.valid) errors.push(...descriptor.errors);

const contractValidation = validateHrxPeopleContract(contract, planPack);
if (!contractValidation.valid) errors.push(...contractValidation.errors);

for (const capability of HRX_CP987_REQUIREMENTS.required_capabilities) {
  if (!contract.required_capabilities?.includes(capability)) errors.push(`contract missing capability ${capability}`);
}
for (const gate of HRX_CP987_REQUIREMENTS.safety_gates) {
  if (!contract.safety_gates?.includes(gate)) errors.push(`contract missing safety gate ${gate}`);
}

if (errors.length > 0) {
  console.error("RP30 HRX People contract validation failed:");
  for (const error of errors.slice(0, 120)) console.error(`- ${error}`);
  if (errors.length > 120) console.error(`...and ${errors.length - 120} more`);
  process.exit(1);
}

console.log("RP30 HRX People contract validation passed.");
console.log(`pack: ${HRX_CP987_PACK_BINDING.pack_id}`);
console.log(`next: ${HRX_CP987_PACK_BINDING.next_pack_id} / ${HRX_CP987_PACK_BINDING.next_subphase_id}`);
console.log(`unit_count: ${coverage.summary.unit_count}`);
console.log(`mandatory_artifact_count: ${HRX_CP987_REQUIREMENTS.mandatory_artifacts.length}`);
