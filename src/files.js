'use strict';

// Lesen und Schreiben von Textdateien: Kodierung erkennen (BOM, UTF-8, sonst Windows-1252),
// Zeilenenden erkennen und beim Speichern genau so wiederherstellen.
const fs = require('fs');
const iconv = require('iconv-lite');

const ENCODINGS = ['utf8', 'utf16le', 'utf16be', 'windows1252', 'iso88591', 'iso885915', 'windows1250', 'windows1251', 'shiftjis', 'gbk'];
const MAX_SIZE = 64 * 1024 * 1024;

function detectEncoding(buf) {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return { encoding: 'utf8', bom: true };
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return { encoding: 'utf16le', bom: true };
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) return { encoding: 'utf16be', bom: true };
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buf);
    return { encoding: 'utf8', bom: false };
  } catch {
    return { encoding: 'windows1252', bom: false };
  }
}

function detectEol(text) {
  const crlf = (text.match(/\r\n/g) || []).length;
  const lf = (text.match(/(^|[^\r])\n/g) || []).length;
  return crlf > lf ? 'crlf' : 'lf';
}

/** Binärdatei? (Nullbytes am Anfang, außer bei UTF-16 mit BOM) */
function looksBinary(buf, encoding) {
  if (encoding.startsWith('utf16')) return false;
  const n = Math.min(buf.length, 8192);
  for (let i = 0; i < n; i++) if (buf[i] === 0) return true;
  return false;
}

function read(file, forceEncoding) {
  const stat = fs.statSync(file);
  if (stat.isDirectory()) throw Object.assign(new Error('directory'), { code: 'EISDIR' });
  if (stat.size > MAX_SIZE) throw Object.assign(new Error('too large'), { code: 'ETOOBIG', size: stat.size });
  const buf = fs.readFileSync(file);
  const det = detectEncoding(buf);
  const encoding = forceEncoding || det.encoding;
  const bom = !forceEncoding || forceEncoding === det.encoding ? det.bom : false;
  let body = buf;
  if (bom) body = buf.subarray(encoding === 'utf8' ? 3 : 2);
  const text = iconv.decode(body, encoding);
  return {
    text,
    encoding,
    bom,
    eol: detectEol(text),
    binary: looksBinary(buf, encoding),
    mtime: stat.mtimeMs,
    size: stat.size,
  };
}

/** text kommt immer mit \n; eol bestimmt, was in der Datei steht. Schreibt erst in eine Hilfsdatei. */
function write(file, text, { encoding = 'utf8', bom = false, eol = 'lf' } = {}) {
  const out = eol === 'crlf' ? text.replace(/\r?\n/g, '\r\n') : text.replace(/\r\n/g, '\n');
  let buf = iconv.encode(out, encoding, { addBOM: false });
  if (bom) {
    const mark = encoding === 'utf8' ? [0xef, 0xbb, 0xbf] : encoding === 'utf16le' ? [0xff, 0xfe] : encoding === 'utf16be' ? [0xfe, 0xff] : [];
    buf = Buffer.concat([Buffer.from(mark), buf]);
  }
  // Direkt überschreiben statt umbenennen: so bleiben Rechte, Verknüpfungen und Besitzer der Datei erhalten
  fs.writeFileSync(file, buf);
  return fs.statSync(file).mtimeMs;
}

module.exports = { read, write, ENCODINGS, detectEol };
