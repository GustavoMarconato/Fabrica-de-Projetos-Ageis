import { unzipSync } from "fflate";

export type DashboardHourStatus = 0 | 1 | 2;

export type DashboardHourData = {
  hour: string;
  status: DashboardHourStatus;
  temperature: number;
  wind: number;
  rain?: number;
  rainChance?: number;
  humidity?: number;
  soilMoisture?: number;
};

export type DashboardDayData = {
  date: string;
  shortDate: string;
  weekday: string;
  potential: number;
  idealHours: number;
  attentionHours: number;
  avoidHours: number;
  temperature: number;
  maxTemperature: number;
  humidity: number;
  wind: number;
  maxWind: number;
  rain: number;
  soilMoisture: number;
  recommendation: string;
  hours: DashboardHourData[];
  allHours?: DashboardHourData[];
};

export type ParsedDashboardWorkbook = {
  days: DashboardDayData[];
  recordCount: number;
  sourceName: string;
};

type RawRow = Record<string, string | number | null>;

const decoder = new TextDecoder("utf-8");
const excelEpoch = Date.UTC(1899, 11, 30);

function xmlFrom(files: Record<string, Uint8Array>, path: string) {
  const bytes = files[path];
  if (!bytes) throw new Error(`Arquivo interno ausente: ${path}`);
  const document = new DOMParser().parseFromString(decoder.decode(bytes), "application/xml");
  if (document.querySelector("parsererror")) throw new Error("A planilha contém um XML inválido.");
  return document;
}

function normalizeKey(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function columnIndex(address: string) {
  const letters = address.match(/[A-Z]+/i)?.[0]?.toUpperCase() ?? "A";
  let index = 0;
  for (const letter of letters) index = index * 26 + letter.charCodeAt(0) - 64;
  return index - 1;
}

function readSharedStrings(files: Record<string, Uint8Array>) {
  if (!files["xl/sharedStrings.xml"]) return [];
  const document = xmlFrom(files, "xl/sharedStrings.xml");
  return Array.from(document.querySelectorAll("si")).map((item) =>
    Array.from(item.querySelectorAll("t")).map((text) => text.textContent ?? "").join(""),
  );
}

function readSheetRows(files: Record<string, Uint8Array>, sheetName: string) {
  const workbook = xmlFrom(files, "xl/workbook.xml");
  const sheet = Array.from(workbook.querySelectorAll("sheet")).find(
    (item) => item.getAttribute("name") === sheetName,
  );
  if (!sheet) throw new Error(`A aba “${sheetName}” não foi encontrada.`);

  const relationshipId = sheet.getAttribute("r:id") ?? sheet.getAttributeNS(
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "id",
  );
  const relationships = xmlFrom(files, "xl/_rels/workbook.xml.rels");
  const relationship = Array.from(relationships.querySelectorAll("Relationship")).find(
    (item) => item.getAttribute("Id") === relationshipId,
  );
  let target = relationship?.getAttribute("Target") ?? "";
  target = target.replace(/^\//, "");
  if (!target.startsWith("xl/")) target = `xl/${target}`;

  const sharedStrings = readSharedStrings(files);
  const worksheet = xmlFrom(files, target);

  return Array.from(worksheet.querySelectorAll("sheetData > row")).map((row) => {
    const values: Array<string | number | null> = [];
    for (const cell of Array.from(row.querySelectorAll(":scope > c"))) {
      const index = columnIndex(cell.getAttribute("r") ?? "A1");
      const type = cell.getAttribute("t");
      const raw = cell.querySelector(":scope > v")?.textContent ?? "";
      let value: string | number | null = null;

      if (type === "s") value = sharedStrings[Number(raw)] ?? "";
      else if (type === "inlineStr") value = Array.from(cell.querySelectorAll("is t")).map((item) => item.textContent ?? "").join("");
      else if (type === "str") value = raw;
      else if (raw !== "") value = Number.isFinite(Number(raw)) ? Number(raw) : raw;

      values[index] = value;
    }
    return values;
  });
}

function excelDateKey(value: unknown) {
  if (typeof value === "number") return new Date(excelEpoch + Math.floor(value) * 86400000).toISOString().slice(0, 10);
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function numberValue(value: unknown, fallback = 0) {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  const match = String(value ?? "").trim().replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  const parsed = match ? Number(match[0]) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function formatDay(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  const weekdayRaw = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" }).format(date);
  const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" })
    .format(date)
    .replace(".", "");
  return {
    shortDate,
    weekday: weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1),
  };
}

function recommendationFor(hours: DashboardHourData[], ideal: number, attention: number, maxWind: number, rain: number) {
  const idealLabels = hours.filter((hour) => hour.status === 0).map((hour) => hour.hour);
  if (idealLabels.length) {
    const window = idealLabels.length === 1 ? idealLabels[0] : `${idealLabels[0]} e ${idealLabels.at(-1)}`;
    return `Priorize os horários entre ${window}. A planilha indica ${ideal}h favoráveis para a aplicação.`;
  }
  if (rain > 0) return `Não há janela favorável. A previsão registra ${rain.toFixed(1).replace(".", ",")} mm de chuva no dia.`;
  if (maxWind >= 5) return `Não há janela favorável. O vento chega a ${maxWind.toFixed(1).replace(".", ",")} m/s.`;
  if (attention > 0) return `Não há janela ideal. Existem ${attention}h em condição de atenção para avaliação no campo.`;
  return "A aplicação não é recomendada nos horários disponíveis na planilha.";
}

function buildDashboardData(rows: Array<Array<string | number | null>>, sourceName: string): ParsedDashboardWorkbook {
  const headerIndex = rows.findIndex((row) => row.some((value) => normalizeKey(value) === "dataehora"));
  if (headerIndex < 0) throw new Error("Não encontrei o cabeçalho da previsão horária.");

  const headers = rows[headerIndex].map(normalizeKey);
  const required = ["dataehora", "temperatura", "umidaderelativa", "vento", "janeladeaplicacao"];
  if (required.some((key) => !headers.includes(key))) throw new Error("A planilha não possui todas as colunas necessárias.");

  const dataRows: RawRow[] = rows.slice(headerIndex + 1)
    .filter((row) => row.some((value) => value !== null && value !== undefined && value !== ""))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? null])));

  const grouped = new Map<string, RawRow[]>();
  for (const row of dataRows) {
    const dateKey = excelDateKey(row.data ?? row.dataehora);
    if (!dateKey) continue;
    grouped.set(dateKey, [...(grouped.get(dateKey) ?? []), row]);
  }

  const days = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, dailyRows]) => {
    const sortedRows = [...dailyRows].sort((a, b) => numberValue(a.hora) - numberValue(b.hora));
    const toHourData = (row: RawRow): DashboardHourData => {
      const hour = numberValue(row.hora, Math.round((numberValue(row.dataehora) % 1) * 24));
      const windowStatus = Math.max(0, Math.min(2, Math.round(numberValue(row.janeladeaplicacao))));
      const status = (windowStatus === 2 ? 0 : windowStatus === 1 ? 1 : 2) as DashboardHourStatus;
      return {
        hour: `${String(hour).padStart(2, "0")}h`,
        status,
        temperature: numberValue(row.temperatura),
        wind: numberValue(row.vento),
        rain: numberValue(row.precipitacao),
        rainChance: numberValue(row.probdechuva),
        humidity: numberValue(row.umidaderelativa),
        soilMoisture: numberValue(row.umidadedosolo010cm),
      };
    };
    const allHours = sortedRows.map(toHourData);
    const hours = allHours.filter((row) => {
      const hour = numberValue(row.hour);
      return hour >= 6 && hour <= 18;
    });
    const visibleHours = hours.length ? hours : allHours;
    const idealHours = visibleHours.filter((hour) => hour.status === 0).length;
    const attentionHours = visibleHours.filter((hour) => hour.status === 1).length;
    const avoidHours = visibleHours.filter((hour) => hour.status === 2).length;
    const temperatures = dailyRows.map((row) => numberValue(row.temperatura));
    const winds = dailyRows.map((row) => numberValue(row.vento));
    const rain = dailyRows.reduce((sum, row) => sum + numberValue(row.precipitacao), 0);
    const soil = dailyRows.map((row) => numberValue(row.umidadedosolo010cm)).filter((value) => value > 0);
    const maxWind = Math.max(...winds, 0);
    const potential = visibleHours.length ? Math.round((idealHours * 100 + attentionHours * 60) / visibleHours.length) : 0;
    const labels = formatDay(date);

    return {
      date,
      ...labels,
      potential,
      idealHours,
      attentionHours,
      avoidHours,
      temperature: average(temperatures),
      maxTemperature: Math.max(...temperatures, 0),
      humidity: Math.round(average(dailyRows.map((row) => numberValue(row.umidaderelativa)))),
      wind: average(winds),
      maxWind,
      rain,
      soilMoisture: Math.round(average(soil)),
      recommendation: recommendationFor(visibleHours, idealHours, attentionHours, maxWind, rain),
      hours: visibleHours,
      allHours,
    };
  });

  if (!days.length) throw new Error("A planilha não contém registros válidos.");
  return { days, recordCount: dataRows.length, sourceName };
}

function parseCsvRows(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    const next = csv[index + 1];

    if (character === '"') {
      if (quoted && next === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  row.push(value);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

export function parseDashboardWorkbook(buffer: ArrayBuffer, sourceName: string): ParsedDashboardWorkbook {
  const files = unzipSync(new Uint8Array(buffer));
  return buildDashboardData(readSheetRows(files, "Previsão Horária"), sourceName);
}

export function parseDashboardCsv(csv: string, sourceName: string): ParsedDashboardWorkbook {
  return buildDashboardData(parseCsvRows(csv), sourceName);
}
