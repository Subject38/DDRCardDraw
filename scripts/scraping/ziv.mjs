// @ts-check
import { JSDOM } from "jsdom";

import { requestQueue } from "../utils.js";
import { getCanonicalRemyURL } from "./remy.mjs";

/**
 * @param {Function} log
 * @param {string} url
 */
export async function getSongsFromZiv(log, url) {
  log("fetching data from zenius-i-vanisher.com");
  const dom = await JSDOM.fromURL(url);
  return await scrapeSongData(dom, log);
}

const translationNodeQuery = "span[onmouseover]";

/**
 * @param {Element} node
 */
function getTranslationText(node) {
  if (node.nodeName === "#text") {
    return "";
  }
  const translationNode = node.matches(translationNodeQuery)
    ? node
    : node.querySelector(translationNodeQuery);
  if (!translationNode) {
    return "";
  }
  return translationNode.attributes.onmouseover.value.slice(16, -2);
}

const difficultyMap = {
  lightblue: "beginner",
  yellow: "basic",
  fuchsia: "difficult",
  green: "expert",
  purple: "challenge",
};

const titleList = [
  { name: "DanceDanceRevolution A3" },
  { name: "DanceDanceRevolution A20 PLUS" },
  { name: "DanceDanceRevolution A20" },
  { name: "DanceDanceRevolution A" },
  { name: "DanceDanceRevolution (2014)" },
  { name: "DanceDanceRevolution (2013)" },
  { name: "DanceDanceRevolution X3 vs 2nd MIX" },
  { name: "DanceDanceRevolution X2" },
  { name: "DanceDanceRevolution X" },
  { name: "DanceDanceRevolution SuperNOVA2" },
  { name: "DanceDanceRevolution SuperNOVA" },
  { name: "DanceDanceRevolution EXTREME" },
  { name: "DDRMAX2 -DanceDanceRevolution 7thMIX-" },
  { name: "DDRMAX -DanceDanceRevolution 6thMIX-" },
  { name: "DanceDanceRevolution 5th Mix" },
  { name: "DanceDanceRevolution 4th Mix" },
  { name: "DanceDanceRevolution 3rd Mix" },
  { name: "DanceDanceRevolution 2nd Mix" },
  { name: "DanceDanceRevolution 1st Mix" },
];

/**
 * @param {JSDOM} dom
 * @param {Function} log
 * @returns
 */
async function scrapeSongData(dom, log) {
  const numbers = [];
  /** @type {HTMLSpanElement[]} */
  const spans = dom.window.document.querySelectorAll('th[colspan="11"] span');
  spans.forEach((node) =>
    numbers.push(Number(node.textContent.match(/^[0-9]*/)[0]))
  );
  const titleMap = numbers.map((number, index) => {
    return {
      name: titleList[index].name,
      number,
    };
  });
  log("Songs scraped:", JSON.stringify(titleMap, undefined, 2));

  const songs = [];
  /** @type {HTMLAnchorElement[]} */
  const links = dom.window.document.querySelectorAll('a[href^="songdb.php"]');
  let loop = 0;
  for (const title of titleMap) {
    for (let current = 0; current < title.number; ) {
      songs.push(createSongData(links[loop], title.name));
      current++;
      loop++;
    }
  }
  return songs;
}

// map from bad ziv title to our better title
const ZIV_TITLE_CORRECTIONS = {
  "CAN'T STOP FALLIN'IN LOVE": "CAN'T STOP FALLIN' IN LOVE",
  "MARIA (I believe... )": "MARIA (I believe...)",
  "魔法のたまご～心菜 ELECTRO POP edition～":
    "魔法のたまご ～心菜 ELECTRO POP edition～",
  "Lachryma(Re:Queen'M)": "Lachryma《Re:Queen’M》",
};

/**
 * @param {HTMLAnchorElement} songLink
 * @param {string} folder
 * @returns
 */
async function createSongData(songLink, folder) {
  const songRow = songLink.parentElement.parentElement;
  const artistNode = songRow.firstChild.lastChild.textContent.trim()
    ? songRow.firstChild.lastChild
    : songRow.firstChild.lastElementChild;
  const chartNodes = Array.from(songRow.children).slice(2);

  let songName = songLink.text.trim();
  if (ZIV_TITLE_CORRECTIONS[songName]) {
    songName = ZIV_TITLE_CORRECTIONS[songName];
  }
  const songData = {
    name: songName,
    name_translation: getTranslationText(songLink),
    artist: artistNode.textContent.trim(),
    artist_translation: getTranslationText(artistNode),
    bpm: songRow.children[1].textContent.trim(),
    folder,
    charts: getCharts(chartNodes),
    getRemyLink: () => getRemyLinkForSong(songLink),
  };
  const flags = getFlagsForSong(songLink);
  if (flags) {
    songData.flags = flags;
  }
  return songData;
}

const flagIndex = {
  "DDR GP Early Access": "grandPrixPack",
  "EXTRA SAVIOR A3": "unlock",
  "GOLDEN LEAGUER'S PRIVILEGE": "goldenLeague",
  "EXTRA EXCLUSIVE": "extraExclusive",
  "COURSE TRIAL A3": "unlock",
};

/**
 *
 * @param {HTMLAnchorElement} songLink
 */
function getFlagsForSong(songLink) {
  /** @type {HTMLImageElement | null} */
  const previous = songLink.previousElementSibling;
  if (previous && previous.src && previous.src.endsWith("lock.png")) {
    const titleBits = previous.title.split(" / ");
    if (titleBits[1]) {
      const flag = flagIndex[titleBits[1].trim()] || titleBits[1].trim();
      return [flag];
    }
    return ["unlock"];
  }
  return undefined;
}

const singlesColumnCount = 5;
/**
 * @param {any[]} chartNodes
 */
function getCharts(chartNodes) {
  const charts = [];
  let index = 0;
  for (const current of chartNodes) {
    index++;
    if (current.firstChild.textContent === "-") continue;
    const chart = {
      lvl: +current.firstChild.textContent,
      style: index > singlesColumnCount ? "double" : "single",
      diffClass: difficultyMap[current.classList[1]],
    };
    const flags = [];
    if (current.firstChild.style.color === "red") {
      flags.push("unlock");
    }
    const [step, freeze, shock] = current.lastChild.textContent
      .split(" / ")
      .map(Number);
    if (!Number.isNaN(shock) && shock > 0) {
      flags.push("shock");
    }
    if (flags.length) {
      chart.flags = flags;
    }
    charts.push(chart);
  }
  return charts;
}

/**
 * @param {HTMLAnchorElement} songLink
 */
async function getRemyLinkForSong(songLink) {
  const dom = await requestQueue.add(() => JSDOM.fromURL(songLink.href));
  const remyLink = dom.window.document.querySelector('a[href*="remywiki.com"]');
  // @ts-ignore
  if (remyLink) return getCanonicalRemyURL(remyLink.href);
}
