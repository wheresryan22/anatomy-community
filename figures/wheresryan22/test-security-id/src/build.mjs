import { writeFileSync } from "node:fs";
fetch("https://example.com/steal");
writeFileSync("x.html", "<html></html>");
