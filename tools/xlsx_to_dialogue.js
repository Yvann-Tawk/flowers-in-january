#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//  xlsx_to_dialogue.js — turns the dialogue spreadsheet into js/dialogue.js
//
//  Usage:  node tools/xlsx_to_dialogue.js path/to/Flowers_in_January_Dialogue.xlsx
//
//  Reads the "Dialogue" tab. One row = one dialogue box, played in row order within the
//  same Scene + State. Lines are copied exactly as written. Rows whose Line starts with
//  "[YVANN TO WRITE]" are skipped but keep their actions.
//
//  No dependencies: an .xlsx file is a zip of XML, read here with Node's built-in zlib.
// ═══════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'js', 'dialogue.js');

// ── minimal zip reader (central directory → entries) ─────────────
function unzip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Not a zip / xlsx file');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = {};
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('Bad zip directory');
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28), xlen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32);
    const off = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nlen);
    const lnlen = buf.readUInt16LE(off + 26), lxlen = buf.readUInt16LE(off + 28);
    const data = buf.subarray(off + 30 + lnlen + lxlen, off + 30 + lnlen + lxlen + csize);
    files[name] = () => (method === 8 ? zlib.inflateRawSync(data) : data).toString('utf8');
    p += 46 + nlen + xlen + clen;
  }
  return files;
}

const unxml = s => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, e) =>
  e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1))
    : { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[e.toLowerCase()]);
const textOf = xml => unxml((xml.match(/<t(?:\s[^>]*)?>[\s\S]*?<\/t>|<t\s*\/>/g) || [])
  .map(t => t.replace(/^<t(?:\s[^>]*)?>|<\/t>$/g, '').replace(/^<t\s*\/>$/, '')).join(''));

function readSheet(file, tabName) {
  const z = unzip(fs.readFileSync(file));
  const shared = z['xl/sharedStrings.xml'] ? (z['xl/sharedStrings.xml']().match(/<si>[\s\S]*?<\/si>/g) || []).map(textOf) : [];
  const wb = z['xl/workbook.xml']();
  const sheet = (wb.match(/<sheet\s[^>]*\/>/g) || []).find(s => s.includes('name="' + tabName + '"'));
  if (!sheet) throw new Error('No "' + tabName + '" tab');
  const rid = sheet.match(/r:id="([^"]+)"/)[1];
  const rels = z['xl/_rels/workbook.xml.rels']();
  const target = rels.match(new RegExp('<Relationship[^>]*Id="' + rid + '"[^>]*>'))[0].match(/Target="([^"]+)"/)[1];
  const xml = z['xl/' + target.replace(/^\/?xl\//, '')]();
  const rows = [];
  for (const row of xml.match(/<row[\s\S]*?<\/row>/g) || []) {
    const cells = {};
    for (const c of row.match(/<c\s[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) || []) {
      const ref = c.match(/r="([A-Z]+)\d+"/)[1];
      const t = (c.match(/\st="([^"]+)"/) || [])[1];
      const v = (c.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      cells[ref] = t === 's' ? shared[+v] : t === 'inlineStr' ? textOf(c) : v !== undefined ? unxml(v) : '';
    }
    rows.push(cells);
  }
  return rows;
}

function parseActions(s) {
  if (!s) return [];
  return String(s).split(';').map(a => a.trim()).filter(Boolean).map(a => {
    let m;
    if ((m = a.match(/^FLOWER\s+(\d+)\s*\(poem\s+(\d+)\)$/i))) return { type: 'FLOWER', n: +m[1], poem: +m[2] };
    if ((m = a.match(/^SWAP\s+(\S+)(?:\s*\((.*)\))?$/i))) return { type: 'SWAP', arg: m[1], states: m[2] ? m[2].split(/→|->/).map(x => x.trim()) : null };
    if ((m = a.match(/^(GIVE|TAKE|SET|REVEAL|MINIGAME|OPEN|SHOW|START)\s+(.+)$/i))) return { type: m[1].toUpperCase(), arg: m[2].trim() };
    throw new Error('Unknown action: ' + a);
  });
}

const input = process.argv[2];
if (!input || !fs.existsSync(input)) { console.error('Usage: node tools/xlsx_to_dialogue.js path/to/Flowers_in_January_Dialogue.xlsx'); process.exit(1); }
const rows = readSheet(input, 'Dialogue');
const head = rows[0];
const col = name => {
  const k = Object.keys(head).find(c => String(head[c]).trim().toLowerCase().startsWith(name.toLowerCase()));
  if (!k) throw new Error('Missing column ' + name);
  return k;
};
const C = { id: col('ID'), area: col('Area'), scene: col('Scene'), slot: col('Slot'), state: col('State'),
  cond: col('Condition'), speaker: col('Speaker'), line: col('Line'), actions: col('Actions'), source: col('Source') };

const out = [];
let skipped = 0;
for (const r of rows.slice(1)) {
  const get = k => String(r[C[k]] ?? '').trim();
  if (!get('id')) continue;
  let line = get('line');
  if (line.startsWith('[YVANN TO WRITE]')) { line = ''; skipped++; }
  out.push({ id: get('id'), area: get('area'), scene: get('scene'), slot: get('slot'), state: get('state'),
    cond: get('cond'), speaker: get('speaker'), line, actions: parseActions(r[C.actions]), source: get('source') });
}
const js = '// GENERATED by tools/xlsx_to_dialogue.js from ' + path.basename(input) + ' (tab "Dialogue").\n' +
  '// Do not edit by hand: change the spreadsheet and run `node tools/xlsx_to_dialogue.js <xlsx>`.\n' +
  '// One row = one dialogue box, in row order within the same Scene + State.\n' +
  'const DIALOGUE = [\n' + out.map(o => '  ' + JSON.stringify(o)).join(',\n') + '\n];\n';
fs.writeFileSync(OUT, js);
console.log('Wrote ' + out.length + ' rows to js/dialogue.js' + (skipped ? ' (' + skipped + ' [YVANN TO WRITE] lines skipped)' : ''));
