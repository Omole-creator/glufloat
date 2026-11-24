/**
 * A nurse partner's addresses (lib/nurseCodes.ts, lib/staffArea.ts).
 * Run: npx tsx scripts/nurse-codes-test.ts
 */
import {
  isNurseCode,
  looksLikeNurseToken,
  normalizeNurseCode,
  nurseFirstName,
  nursePath,
  nurseSetupToken,
  suggestNurseCode,
  validNurseCode,
} from "../lib/nurseCodes";
import { areaPath, isNurseArea } from "../lib/staffArea";
import { validCode } from "../lib/creators";

let fails = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (!ok) {
    fails++;
    console.log(`FAIL  ${name}`, detail ?? "");
  } else console.log(`ok    ${name}`);
}

check("first name skips titles", nurseFirstName("Nurse Ada Okafor") === "ADA" && nurseFirstName("Mrs. Bola Ade") === "BOLA");
check("suggest: nurse + first name", suggestNurseCode("Ada Okafor", new Set()) === "NURSEADA");
check("suggest: taken adds surname letter", suggestNurseCode("Ada Okafor", new Set(["NURSEADA"])) === "NURSEADAO");
check("suggest: then a number", suggestNurseCode("Ada Okafor", new Set(["NURSEADA", "NURSEADAO"])) === "NURSEADA2");
check("suggest: no surname goes to a number", suggestNurseCode("Ada", new Set(["NURSEADA"])) === "NURSEADA2");
check("normalize: case and spaces", normalizeNurseCode(" nurse ada ") === "NURSEADA");
check("valid: nurseada", validNurseCode("NURSEADA"));
check("valid: needs at least 2 after nurse", !validNurseCode("NURSEA") && !validNurseCode("NURSE"));
check("valid: must start with nurse", !validNurseCode("ADANURSE"));
check("valid: at most 20 long", validNurseCode("NURSE" + "A".repeat(15)) && !validNurseCode("NURSE" + "A".repeat(16)));
check("a random 6-letter hospital code is never a nurse's", !isNurseCode("4KQ7MD") && !isNurseCode("NURSEX"));
check("a nurse code is a nurse's", isNurseCode("nurseada"));
check("path is lower case", nursePath("NURSEADA") === "/nurseada");
check("creators can never take a nurse code", !validCode("NURSEADA") && !validCode("NURSE"));
check("creators still fine otherwise", validCode("FAITH"));
const tok = nurseSetupToken("Nurse Ada Okafor", () => 0.5);
check("setup token: first name + 2 digits", tok === "ada55", tok);
for (let i = 0; i < 200; i++) {
  const t = nurseSetupToken("Ada", Math.random);
  if (!/^ada[1-9]\d$/.test(t)) check("setup token always 2 digits 10-99", false, t);
}
check("setup token shape", looksLikeNurseToken("ada42") && looksLikeNurseToken("ada427") && !looksLikeNurseToken("chidi42-k7m3qp"));
check("area: hospital to nurse", areaPath("/hospital/patients/1?h=2", true) === "/nurse/patients/1?h=2" && areaPath("/hospital", true) === "/nurse");
check("area: nurse to hospital", areaPath("/nurse/add", false) === "/hospital/add" && areaPath("/nurse", false) === "/hospital");
check("area: other paths untouched", areaPath("/hospitals", true) === "/hospitals" && areaPath("/nurseada", false) === "/nurseada");
check("area: detect", isNurseArea("/nurse") && isNurseArea("/nurse/plan") && !isNurseArea("/nurseada") && !isNurseArea("/hospital"));

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
