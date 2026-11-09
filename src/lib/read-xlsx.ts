const columnIndex = (reference: string) => {
  let value = 0;
  for (const char of reference.replace(/\d/g, "")) value = value * 26 + char.charCodeAt(0) - 64;
  return value - 1;
};

async function unzipTextEntries(buffer: ArrayBuffer): Promise<Map<string, string>> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let end = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65558); offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) { end = offset; break; }
  }
  if (end < 0) throw new Error("Le fichier n'est pas un classeur Excel valide.");
  const count = view.getUint16(end + 10, true);
  let cursor = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();
  const entries = new Map<string, string>();
  for (let index = 0; index < count; index += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) break;
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    let content: Uint8Array;
    if (method === 0) content = compressed;
    else if (method === 8) {
      const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw" as CompressionFormat));
      content = new Uint8Array(await new Response(stream).arrayBuffer());
    } else throw new Error("Méthode de compression Excel non prise en charge.");
    entries.set(name, decoder.decode(content));
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

export async function readXlsxRows(file: File): Promise<string[][]> {
  if (file.name.toLocaleLowerCase().endsWith(".csv")) {
    const text = (await file.text()).replace(/^\uFEFF/, "");
    const delimiter = (text.split(/\r?\n/, 1)[0].match(/;/g) || []).length > (text.split(/\r?\n/, 1)[0].match(/,/g) || []).length ? ";" : ",";
    return text.split(/\r?\n/).filter(line => line.trim()).map(line => {
      const values: string[] = []; let value = ""; let quoted = false;
      for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        if (char === '"' && quoted && line[index + 1] === '"') { value += '"'; index += 1; }
        else if (char === '"') quoted = !quoted;
        else if (char === delimiter && !quoted) { values.push(value); value = ""; }
        else value += char;
      }
      values.push(value); return values;
    });
  }
  const entries = await unzipTextEntries(await file.arrayBuffer());
  const sheetXml = entries.get("xl/worksheets/sheet1.xml");
  if (!sheetXml) throw new Error("Aucune feuille de calcul trouvée dans le fichier.");
  const parser = new DOMParser();
  const sheet = parser.parseFromString(sheetXml, "application/xml");
  const stringsXml = entries.get("xl/sharedStrings.xml");
  const strings = stringsXml ? Array.from(parser.parseFromString(stringsXml, "application/xml").getElementsByTagName("si"), item => Array.from(item.getElementsByTagName("t"), node => node.textContent || "").join("")) : [];
  return Array.from(sheet.getElementsByTagName("row"), row => {
    const cells: string[] = [];
    for (const cell of Array.from(row.getElementsByTagName("c"))) {
      const index = columnIndex(cell.getAttribute("r") || "A1");
      const type = cell.getAttribute("t");
      const value = type === "inlineStr" ? Array.from(cell.getElementsByTagName("t"), node => node.textContent || "").join("") : cell.getElementsByTagName("v")[0]?.textContent || "";
      cells[index] = type === "s" ? strings[Number(value)] || "" : value;
    }
    return cells.map(value => value || "");
  });
}
