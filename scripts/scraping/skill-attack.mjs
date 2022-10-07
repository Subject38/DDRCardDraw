// @ts-check
import fetch from "node-fetch";
import readline from "readline";
import iconv from "iconv-lite";
import he from "he";

const difficultyByIndex = [
  "beginner",
  "basic",
  "difficult",
  "expert",
  "challenge",
  "basic",
  "difficult",
  "expert",
  "challenge",
];

const singlesColumnCount = 5;

export async function getSongsFromSkillAttack(log) {
  log("fetching data from skillattack.com");
  const resp = await fetch("http://skillattack.com/sa4/data/master_music.txt");

  return new Promise((resolve) => {
    const decoder = iconv.decodeStream("Shift_JIS");
    resp.body.pipe(decoder);
    const rl = readline.createInterface(decoder);
    const data = [];
    rl.on("line", (rawLine) => {
      const [index, hash, ...fields] = rawLine.split("\t");
      const charts = [];
      let i = 0;
      for (const field of fields) {
        i++;
        if (i > 9) break;
        const lvl = parseInt(field, 10);
        if (lvl < 0) continue;
        charts.push({
          lvl,
          style: i > singlesColumnCount ? "double" : "single",
          diffClass: difficultyByIndex[i - 1],
        });
      }
      data.push({
        saHash: hash,
        saIndex: index,
        name: he.decode(fields[9]),
        artist: he.decode(fields[10]),
        charts,
      });
    });
    rl.on("close", () => {
      resolve(data);
    });
  });
}
