import dotenv from "dotenv";
import fs from "fs";
import path from "path";

const candidatePaths = [
  path.resolve(__dirname, "../../../../.env"),
  path.resolve(__dirname, "../../.env"),
];

for (const envPath of candidatePaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}
