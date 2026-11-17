"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  CloudRain,
  Download,
  Droplets,
  ExternalLink,
  FileSpreadsheet,
  Gauge,
  Leaf,
  LockKeyhole,
  LogOut,
  MapPin,
  RefreshCw,
  Send,
  Sprout,
  Thermometer,
  Trash2,
  Wind,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  parseDashboardCsv,
  parseDashboardWorkbook,
  type DashboardDayData,
  type DashboardHourData,
  type DashboardHourStatus,
} from "@/lib/xlsx-dashboard";

type HourStatus = DashboardHourStatus;

type AssistantMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
};

type LocalFileHandle = { getFile: () => Promise<File> };
type ExcelPickerWindow = Window & {
  showOpenFilePicker?: (options: {
    multiple: boolean;
    types: Array<{ description: string; accept: Record<string, string[]> }>;
  }) => Promise<LocalFileHandle[]>;
};

type HourData = DashboardHourData;
type DayData = DashboardDayData;
type DetailMetric = "application" | "window" | "rain" | "soil" | "temperature" | "humidity" | "wind";

const spreadsheetUrl = "https://docs.google.com/spreadsheets/d/1c6V1i8eJHCFS0hfjpqwSMl5vBhaCnX97/edit?pli=1&gid=1204955107#gid=1204955107";

type DetailRow = {
  hour: string;
  value: string;
  note?: string;
  status?: HourStatus;
};

type DetailContent = {
  title: string;
  description: string;
  rows: DetailRow[];
};

const defaultDayData: DayData[] = [
  {
    date: "2026-09-01",
    shortDate: "1 set",
    weekday: "Terça-feira",
    potential: 42,
    idealHours: 3,
    attentionHours: 4,
    avoidHours: 6,
    temperature: 23.9,
    maxTemperature: 32.4,
    humidity: 55,
    wind: 3.1,
    maxWind: 4.9,
    rain: 0,
    soilMoisture: 7,
    recommendation: "Priorize a aplicação entre 06h e 08h. Após 12h, o índice indica condição desfavorável.",
    hours: [
      ["06h", 0, 18, 1.4], ["07h", 0, 18, 1.4], ["08h", 0, 21, 1.4],
      ["09h", 1, 24, 2.0], ["10h", 1, 27, 2.7], ["11h", 1, 29, 3.7],
      ["12h", 2, 31, 4.1], ["13h", 2, 32, 4.4], ["14h", 2, 32, 4.8],
      ["15h", 2, 32, 4.9], ["16h", 2, 32, 4.6], ["17h", 2, 30, 3.9],
      ["18h", 1, 28, 2.8],
    ].map(([hour, status, temperature, wind]) => ({ hour, status, temperature, wind })) as HourData[],
  },
  {
    date: "2026-09-02",
    shortDate: "2 set",
    weekday: "Quarta-feira",
    potential: 60,
    idealHours: 0,
    attentionHours: 13,
    avoidHours: 0,
    temperature: 18.7,
    maxTemperature: 22.5,
    humidity: 57,
    wind: 3.3,
    maxWind: 4.5,
    rain: 0,
    soilMoisture: 7,
    recommendation: "Condição intermediária durante todo o dia. Confira a regulagem e acompanhe o vento no campo.",
    hours: Array.from({ length: 13 }, (_, index) => ({
      hour: `${String(index + 6).padStart(2, "0")}h`, status: 1 as HourStatus,
      temperature: [17,17,17,17,18,20,21,22,22,23,22,21,20][index],
      wind: [3.4,2.9,3.4,4.0,3.5,3.5,3.9,4.2,4.3,4.2,4.2,3.8,2.3][index],
    })),
  },
  {
    date: "2026-09-03",
    shortDate: "3 set",
    weekday: "Quinta-feira",
    potential: 57,
    idealHours: 2,
    attentionHours: 9,
    avoidHours: 2,
    temperature: 17.3,
    maxTemperature: 25.9,
    humidity: 57,
    wind: 2.2,
    maxWind: 4.0,
    rain: 0,
    soilMoisture: 6,
    recommendation: "A melhor janela aparece entre 06h e 07h. Evite a faixa entre 15h e 16h.",
    hours: [
      ["06h",0,11,1.6],["07h",0,12,1.8],["08h",1,14,2.1],["09h",1,16,3.7],
      ["10h",1,19,4.0],["11h",1,21,3.9],["12h",1,23,3.4],["13h",1,24,2.6],
      ["14h",1,25,2.3],["15h",2,26,2.4],["16h",2,26,2.8],["17h",1,24,3.1],
      ["18h",1,22,1.9],
    ].map(([hour, status, temperature, wind]) => ({ hour, status, temperature, wind })) as HourData[],
  },
  {
    date: "2026-09-04",
    shortDate: "4 set",
    weekday: "Sexta-feira",
    potential: 43,
    idealHours: 2,
    attentionHours: 6,
    avoidHours: 5,
    temperature: 18.0,
    maxTemperature: 27.1,
    humidity: 52,
    wind: 2.1,
    maxWind: 3.1,
    rain: 0,
    soilMoisture: 6,
    recommendation: "Aplique entre 06h e 07h. A condição piora de 13h a 17h.",
    hours: [
      ["06h",0,11,1.9],["07h",0,12,2.0],["08h",1,14,2.1],["09h",1,17,2.1],
      ["10h",1,20,2.1],["11h",1,23,2.4],["12h",1,25,2.6],["13h",2,26,2.7],
      ["14h",2,27,3.0],["15h",2,27,3.1],["16h",2,27,3.0],["17h",2,25,2.7],
      ["18h",1,23,2.2],
    ].map(([hour, status, temperature, wind]) => ({ hour, status, temperature, wind })) as HourData[],
  },
  {
    date: "2026-09-05",
    shortDate: "5 set",
    weekday: "Sábado",
    potential: 37,
    idealHours: 0,
    attentionHours: 8,
    avoidHours: 5,
    temperature: 18.6,
    maxTemperature: 27.1,
    humidity: 61,
    wind: 4.0,
    maxWind: 6.0,
    rain: 0,
    soilMoisture: 6,
    recommendation: "Não há janela ideal. O vento chega a 6,0 m/s durante a manhã.",
    hours: [
      ["06h",1,13,4.2],["07h",1,13,4.7],["08h",2,14,5.7],["09h",2,16,6.0],
      ["10h",2,19,5.8],["11h",2,21,5.5],["12h",2,24,5.0],["13h",1,25,4.5],
      ["14h",1,26,4.0],["15h",1,27,3.7],["16h",1,27,3.6],["17h",1,26,3.6],
      ["18h",1,23,3.2],
    ].map(([hour, status, temperature, wind]) => ({ hour, status, temperature, wind })) as HourData[],
  },
  {
    date: "2026-09-06",
    shortDate: "6 set",
    weekday: "Domingo",
    potential: 60,
    idealHours: 0,
    attentionHours: 13,
    avoidHours: 0,
    temperature: 20.6,
    maxTemperature: 28.8,
    humidity: 60,
    wind: 3.5,
    maxWind: 4.8,
    rain: 0,
    soilMoisture: 6,
    recommendation: "Condição intermediária. Monitore as rajadas entre 13h e 17h antes de iniciar.",
    hours: Array.from({ length: 13 }, (_, index) => ({
      hour: `${String(index + 6).padStart(2, "0")}h`, status: 1 as HourStatus,
      temperature: [14,15,16,18,21,23,26,28,29,29,29,28,26][index],
      wind: [3.7,3.5,3.2,3.0,3.1,3.1,3.5,4.1,4.8,4.7,4.5,3.7,2.8][index],
    })),
  },
];

const statusLabel: Record<HourStatus, string> = {
  0: "Favorável",
  1: "Atenção",
  2: "Evitar",
};

function MetricCard({ icon, label, value, detail, formula, onOpen }: { icon: React.ReactNode; label: string; value: string; detail: string; formula: string; onOpen?: () => void }) {
  const content = (
    <>
      <div className="metric-icon">{icon}</div>
      <div>
        <p className="metric-label">{label}</p>
        <strong className="metric-value">{value}</strong>
        <p className="metric-detail">{detail}</p>
      </div>
      <small className="metric-formula">{formula}</small>
      {onOpen && <span className="metric-open-icon" aria-hidden="true"><ArrowUpRight size={16} /></span>}
    </>
  );

  if (onOpen) {
    return <button className="metric-card metric-card-button" type="button" onClick={onOpen} aria-label={`Ver ${label.toLowerCase()} por horário`}>{content}</button>;
  }

  return <article className="metric-card">{content}</article>;
}

function buildDetailContent(metric: DetailMetric, day: DayData): DetailContent {
  const allHours = day.allHours ?? day.hours;
  const statusScore: Record<HourStatus, string> = { 0: "100%", 1: "60%", 2: "0%" };

  if (metric === "application") return {
    title: "Condição para aplicação por horário",
    description: "O índice diário combina a classificação de cada horário entre 06h e 18h.",
    rows: day.hours.map((hour) => ({ hour: hour.hour, value: statusScore[hour.status], note: statusLabel[hour.status], status: hour.status })),
  };
  if (metric === "window") return {
    title: "Janela de aplicação por horário",
    description: "Veja quais horários estão favoráveis, em atenção ou devem ser evitados.",
    rows: day.hours.map((hour) => ({ hour: hour.hour, value: statusLabel[hour.status], status: hour.status })),
  };
  if (metric === "rain") return {
    title: "Chuva prevista por horário",
    description: "A chuva prevista do dia é a soma da precipitação registrada em cada horário da planilha.",
    rows: allHours.map((hour) => ({
      hour: hour.hour,
      value: `${(hour.rain ?? 0).toFixed(2).replace(".", ",")} mm`,
      note: `${Math.round(hour.rainChance ?? 0)}% de chance`,
    })),
  };
  if (metric === "soil") return {
    title: "Umidade do solo por horário",
    description: "Leitura da camada de 0 a 10 cm em cada horário disponível.",
    rows: allHours.map((hour) => ({ hour: hour.hour, value: `${Math.round(hour.soilMoisture ?? 0)}%` })),
  };
  if (metric === "temperature") return {
    title: "Temperatura por horário",
    description: "Temperatura prevista ao longo do dia.",
    rows: allHours.map((hour) => ({ hour: hour.hour, value: `${hour.temperature.toFixed(1).replace(".", ",")} °C` })),
  };
  if (metric === "humidity") return {
    title: "Umidade do ar por horário",
    description: "Umidade relativa prevista ao longo do dia.",
    rows: allHours.map((hour) => ({ hour: hour.hour, value: `${Math.round(hour.humidity ?? 0)}%` })),
  };
  return {
    title: "Velocidade do vento por horário",
    description: "Velocidade prevista do vento em cada horário.",
    rows: allHours.map((hour) => ({ hour: hour.hour, value: `${hour.wind.toFixed(1).replace(".", ",")} m/s` })),
  };
}

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileHandleRef = useRef<LocalFileHandle | null>(null);
  const remoteHashRef = useRef("");
  const [authReady, setAuthReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [dashboardDays, setDashboardDays] = useState<DayData[]>(defaultDayData);
  const [selectedDate, setSelectedDate] = useState(defaultDayData[0].date);
  const [dataMode, setDataMode] = useState<"remote" | "local">("remote");
  const [remoteRefreshTick, setRemoteRefreshTick] = useState(0);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelMessage, setExcelMessage] = useState("");
  const [excelSource, setExcelSource] = useState({
    name: "Dados de demonstração",
    recordCount: defaultDayData.reduce((total, day) => total + day.hours.length, 0),
    connected: false,
    live: false,
    lastSync: "",
    lastModified: 0,
  });
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [detailMetric, setDetailMetric] = useState<DetailMetric | null>(null);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    {
      id: 1,
      role: "assistant",
      text: "Olá! Sou o assistente Orion. Posso comparar dias e horários, calcular volume e tempo, explicar alertas e gerar resumos da operação.",
    },
  ]);
  const selected = useMemo(
    () => dashboardDays.find((day) => day.date === selectedDate) ?? dashboardDays[0],
    [dashboardDays, selectedDate],
  );
  const detailContent = useMemo(
    () => detailMetric ? buildDetailContent(detailMetric, selected) : null,
    [detailMetric, selected],
  );

  useEffect(() => {
    setAuthenticated(window.sessionStorage.getItem("orion-dashboard-auth") === "ok");
    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (!authenticated || dataMode !== "remote") return;
    const controller = new AbortController();
    let initialLoad = true;

    async function hashWorkbook(content: string) {
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
      return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    }

    async function loadLiveWorkbook() {
      try {
        const response = await fetch(`/api/excel-live?t=${Date.now()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("live_excel_unavailable");
        const csv = await response.text();
        const hash = await hashWorkbook(csv);
        if (hash === remoteHashRef.current) return;
        const parsed = parseDashboardCsv(csv, "Google Planilhas • Previsão Horária");
        if (controller.signal.aborted) return;
        const wasInitialLoad = initialLoad;
        initialLoad = false;
        remoteHashRef.current = hash;
        setDashboardDays(parsed.days);
        setSelectedDate((current) => parsed.days.some((day) => day.date === current) ? current : parsed.days[0].date);
        setExcelSource({
          name: parsed.sourceName,
          recordCount: parsed.recordCount,
          connected: true,
          live: true,
          lastSync: new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date()),
          lastModified: 0,
        });
        setExcelMessage(wasInitialLoad
          ? "Google Planilhas conectado. O painel verifica novas alterações automaticamente."
          : "Alteração encontrada no Google Planilhas. Dashboard recalculado.");
      } catch {
        if (!controller.signal.aborted && initialLoad) {
          try {
            const fallback = await fetch("/Orion_Base_Dashboard.xlsx", { signal: controller.signal });
            if (!fallback.ok) throw new Error("fallback_unavailable");
            const parsed = parseDashboardWorkbook(await fallback.arrayBuffer(), "Cópia de segurança • Orion_Base_Dashboard.xlsx");
            setDashboardDays(parsed.days);
            setSelectedDate(parsed.days[0].date);
            setExcelSource({
              name: parsed.sourceName,
              recordCount: parsed.recordCount,
              connected: true,
              live: false,
              lastSync: "",
              lastModified: 0,
            });
            setExcelMessage("Google Planilhas indisponível. Exibindo a última cópia publicada.");
          } catch {
            setExcelMessage("A base online não pôde ser carregada. Os dados de demonstração continuam disponíveis.");
          }
        } else if (!controller.signal.aborted) {
          setExcelMessage("Não foi possível verificar novas alterações. Os últimos dados válidos foram mantidos.");
        }
      }
    }
    void loadLiveWorkbook();
    const interval = window.setInterval(() => void loadLiveWorkbook(), 5000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [authenticated, dataMode, remoteRefreshTick]);

  useEffect(() => {
    if (!fileHandleRef.current) return;
    const interval = window.setInterval(async () => {
      try {
        const file = await fileHandleRef.current?.getFile();
        if (file && file.lastModified !== excelSource.lastModified) await applyExcelFile(file, true);
      } catch {
        window.clearInterval(interval);
      }
    }, 5000);
    return () => window.clearInterval(interval);
  }, [excelSource.lastModified]);

  async function applyExcelFile(file: File, automatic = false) {
    setExcelLoading(true);
    try {
      const parsed = parseDashboardWorkbook(await file.arrayBuffer(), file.name);
      const source = {
        name: parsed.sourceName,
        recordCount: parsed.recordCount,
        connected: true,
        live: false,
        lastSync: new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date()),
        lastModified: file.lastModified,
      };
      setDashboardDays(parsed.days);
      setSelectedDate(parsed.days[0].date);
      setExcelSource(source);
      setExcelMessage(automatic ? "Alteração detectada. O dashboard foi atualizado." : "Excel conectado. O dashboard agora usa os dados da planilha.");
    } catch (error) {
      setExcelMessage(error instanceof Error ? error.message : "Não consegui ler a planilha.");
    } finally {
      setExcelLoading(false);
    }
  }

  async function connectExcel() {
    const picker = (window as ExcelPickerWindow).showOpenFilePicker;
    if (!picker) {
      fileInputRef.current?.click();
      return;
    }
    try {
      const [handle] = await picker({
        multiple: false,
        types: [{
          description: "Planilha do Excel",
          accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] },
        }],
      });
      fileHandleRef.current = handle;
      setDataMode("local");
      await applyExcelFile(await handle.getFile());
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setExcelMessage("Não foi possível abrir a planilha selecionada.");
    }
  }

  async function refreshExcel() {
    if (dataMode === "remote") {
      setExcelMessage("Verificando novas alterações no Excel Online...");
      setRemoteRefreshTick((current) => current + 1);
      return;
    }
    if (fileHandleRef.current) {
      await applyExcelFile(await fileHandleRef.current.getFile());
      return;
    }
    fileInputRef.current?.click();
  }

  function useExcelOnline() {
    fileHandleRef.current = null;
    remoteHashRef.current = "";
    setDataMode("remote");
    setExcelMessage("Reconectando ao Google Planilhas...");
  }

  const condition = selected.potential >= 60 ? "Boa com atenção" : selected.potential >= 45 ? "Moderada" : "Restrita";
  const rendimentoReferencia = 9.6;
  const doseReferencia = 40;
  const areaPlanejada = selected.idealHours * rendimentoReferencia;
  const volumePrevisto = areaPlanejada * doseReferencia;
  const hasIdealWindow = selected.idealHours > 0;

  function clearAssistantChat() {
    setAssistantMessages([
      {
        id: Date.now(),
        role: "assistant",
        text: "Olá! Sou o assistente Orion. Posso comparar dias e horários, calcular volume e tempo, explicar alertas e gerar resumos da operação.",
      },
    ]);
    setAssistantInput("");
  }

  function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!loginUser.trim() || !loginPassword) {
      setLoginError("Preencha o usuário e a senha.");
      return;
    }
    window.sessionStorage.setItem("orion-dashboard-auth", "ok");
    setLoginError("");
    setAuthenticated(true);
  }

  function handleLogout() {
    window.sessionStorage.removeItem("orion-dashboard-auth");
    setAuthenticated(false);
    setLoginPassword("");
    setAssistantOpen(false);
  }

  async function handleAssistantSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = assistantInput.trim();

    if (!message || assistantLoading) return;

    const messageId = Date.now();
    const history = assistantMessages.slice(-6).map(({ role, text }) => ({ role, content: text }));

    setAssistantMessages((current) => [...current, { id: messageId, role: "user", text: message }]);
    setAssistantInput("");
    setAssistantLoading(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history,
          dashboard: {
            fonteDados: {
              arquivo: excelSource.name,
              registros: excelSource.recordCount,
              conectadoAoExcel: excelSource.connected,
            },
            selecionado: {
              talhao: "CB6",
              data: `${selected.weekday}, ${selected.shortDate}`,
              condicaoAplicacao: `${selected.potential}%`,
              janelaFavoravel: `${selected.idealHours}h`,
              chuva: `${selected.rain.toFixed(1)} mm`,
              umidadeSolo: `${selected.soilMoisture}%`,
              temperaturaMedia: `${selected.temperature.toFixed(1)}°C`,
              ventoMedio: `${selected.wind.toFixed(1)} m/s`,
              areaPlanejada: `${areaPlanejada.toFixed(1)} ha`,
              volumePrevisto: `${volumePrevisto.toFixed(0)} L`,
              rendimentoReferencia: `${rendimentoReferencia.toFixed(1)} ha/h`,
              recomendacao: selected.recommendation,
            },
            semana: dashboardDays.map((day) => ({
              data: `${day.weekday}, ${day.shortDate}`,
              potencial: `${day.potential}%`,
              horasFavoraveis: day.idealHours,
              horasAtencao: day.attentionHours,
              horasEvitar: day.avoidHours,
              temperaturaMedia: `${day.temperature.toFixed(1)}°C`,
              temperaturaMaxima: `${day.maxTemperature.toFixed(1)}°C`,
              ventoMedio: `${day.wind.toFixed(1)} m/s`,
              ventoMaximo: `${day.maxWind.toFixed(1)} m/s`,
              chuva: `${day.rain.toFixed(1)} mm`,
              umidadeSolo: `${day.soilMoisture}%`,
              recomendacao: day.recommendation,
              horarios: day.hours.map((hour) => ({
                hora: hour.hour,
                condicao: statusLabel[hour.status],
                temperatura: `${hour.temperature}°C`,
                vento: `${hour.wind.toFixed(1)} m/s`,
                chuva: `${(hour.rain ?? 0).toFixed(2)} mm`,
                probabilidadeChuva: `${Math.round(hour.rainChance ?? 0)}%`,
                umidadeAr: `${Math.round(hour.humidity ?? 0)}%`,
                umidadeSolo: `${Math.round(hour.soilMoisture ?? 0)}%`,
              })),
            })),
          },
        }),
      });

      if (!response.ok) throw new Error("assistant_request_failed");

      const data = await response.json() as { reply?: string };
      const reply = data.reply?.trim() || "Não consegui gerar uma resposta agora.";
      setAssistantMessages((current) => [...current, { id: messageId + 1, role: "assistant", text: reply }]);
    } catch {
      setAssistantMessages((current) => [
        ...current,
        { id: messageId + 1, role: "assistant", text: "Não consegui responder agora. Tente novamente em alguns instantes." },
      ]);
    } finally {
      setAssistantLoading(false);
    }
  }

  if (!authReady) return <main className="login-loading" aria-label="Carregando acesso Orion" />;

  if (!authenticated) return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <img src="/orion-logo.png" alt="Orion, For Professional Farmers" />
          <span>Bio Performance</span>
        </div>
        <div className="login-copy">
          <p className="login-kicker">Acesso ao dashboard</p>
          <h1 id="login-title">Bem-vindo</h1>
          <p>Entre para consultar as condições e o rendimento estimado da aplicação.</p>
        </div>
        <form className="login-form" onSubmit={handleLogin}>
          <label htmlFor="login-user">Usuário</label>
          <input
            id="login-user"
            value={loginUser}
            onChange={(event) => setLoginUser(event.target.value)}
            autoComplete="username"
            placeholder="Digite seu usuário"
            required
            autoFocus
          />
          <label htmlFor="login-password">Senha</label>
          <input
            id="login-password"
            type="password"
            value={loginPassword}
            onChange={(event) => setLoginPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="Digite sua senha"
            required
          />
          {loginError && <p className="login-error" role="alert">{loginError}</p>}
          <button type="submit"><LockKeyhole size={18} /> Entrar</button>
        </form>
        <p className="login-help">Para a apresentação, qualquer usuário e senha preenchidos liberam o acesso.</p>
      </section>
    </main>
  );

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div className="brand-lockup" aria-label="Orion Bio Performance">
          <img className="company-logo" src="/orion-logo.png" alt="Orion, For Professional Farmers" />
          <span className="brand-divider" />
          <span className="brand-product">Bio Performance</span>
        </div>
        <div className="topbar-actions">
          <div className={`update-pill ${excelSource.connected ? "connected" : ""}`}>
            <span /> {excelSource.live
              ? `Planilha ao vivo • ${excelSource.recordCount} registros`
              : excelSource.connected ? `Excel conectado • ${excelSource.recordCount} registros` : "Dados de demonstração"}
          </div>
          <button className="logout-button" type="button" onClick={handleLogout} aria-label="Sair do dashboard">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </header>

      <div className="content-wrap">
        <section className="dashboard-heading">
          <div>
            <p className="eyebrow">Aplicação de bioinsumos no sulco do plantio</p>
            <h1>Condições para aplicação</h1>
            <p className="heading-copy">Acompanhe as condições do talhão e escolha o melhor horário para operar.</p>
          </div>
          <div className="filters" aria-label="Filtros do dashboard">
            <div className="filter-field">
              <label>Talhão</label>
              <Select defaultValue="cb6">
                <SelectTrigger className="filter-trigger" aria-label="Selecionar talhão"><SelectValue /></SelectTrigger>
                <SelectContent position="popper" align="start" sideOffset={6} className="filter-menu">
                  <SelectItem value="cb6">CB6</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="filter-field">
              <label>Data</label>
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger className="filter-trigger date-trigger" aria-label="Selecionar data"><SelectValue /></SelectTrigger>
                <SelectContent position="popper" align="start" sideOffset={6} className="filter-menu">
                  {dashboardDays.map((day) => <SelectItem key={day.date} value={day.date}>{day.weekday}, {day.shortDate}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="location-row">
          <span><MapPin size={15} /> Talhão CB6, região de Marília, SP</span>
          <span><CalendarDays size={15} /> Previsão horária</span>
          <span><FileSpreadsheet size={15} /> {excelSource.name}</span>
        </section>

        <section className={`excel-source-panel ${excelSource.connected ? "is-connected" : ""}`} aria-label="Fonte de dados Excel">
          <div className="excel-source-copy">
            <span className="excel-source-icon">{excelSource.connected ? <CheckCircle2 size={22} /> : <FileSpreadsheet size={22} />}</span>
            <div>
              <strong>{excelSource.live ? "Google Planilhas sincronizado" : excelSource.connected ? "Base dinâmica conectada" : "Conecte a planilha do projeto"}</strong>
              <p>
                {excelSource.live
                  ? `Altere ou apague uma linha no Google Planilhas. O painel verifica mudanças a cada 5 segundos${excelSource.lastSync ? ` • última sincronização: ${excelSource.lastSync}` : ""}.`
                  : fileHandleRef.current
                  ? "Altere ou apague uma linha no Excel. Após salvar, o painel atualiza em até 5 segundos."
                  : excelSource.connected
                    ? "Após salvar o Excel, use Atualizar dados para recalcular o painel."
                    : "O painel lê a tabela PrevisaoHorariaTable e recalcula todos os indicadores."}
              </p>
              {excelMessage && <small>{excelMessage}</small>}
            </div>
          </div>
          <div className="excel-actions">
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setDataMode("local");
                  void applyExcelFile(file);
                }
                event.target.value = "";
              }}
            />
            <button className="excel-action primary" type="button" onClick={() => void connectExcel()} disabled={excelLoading}>
              <FileSpreadsheet size={16} /> {excelSource.connected ? "Trocar Excel" : "Conectar Excel"}
            </button>
            {excelSource.connected && (
              <button className="excel-action" type="button" onClick={() => void refreshExcel()} disabled={excelLoading}>
                <RefreshCw size={16} className={excelLoading ? "spin" : ""} /> Atualizar dados
              </button>
            )}
            {dataMode === "local" && (
              <button className="excel-action" type="button" onClick={useExcelOnline} disabled={excelLoading}>
                <RefreshCw size={16} /> Usar planilha online
              </button>
            )}
            <a className="excel-action" href={spreadsheetUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={16} /> Abrir planilha
            </a>
            <a className="excel-action" href="/Orion_Base_Dashboard.xlsx" download>
              <Download size={16} /> Baixar base
            </a>
          </div>
        </section>

        <section className="metrics-grid" aria-label="Indicadores principais">
          <MetricCard icon={<Gauge size={21} />} label="Condição para aplicação" value={`${selected.potential}%`} detail={condition} formula="Como calcula: favorável vale 100, atenção vale 60 e evitar vale 0. Soma os pontos e divide pelo total de horários." onOpen={() => setDetailMetric("application")} />
          <MetricCard icon={<Sprout size={21} />} label="Janela ideal" value={`${selected.idealHours}h`} detail="Entre 06h e 18h" formula="Como calcula: conta os horários em que a coluna “Janela de aplicação” tem o valor 2, que significa favorável." onOpen={() => setDetailMetric("window")} />
          <MetricCard icon={<CloudRain size={21} />} label="Chuva prevista" value={`${selected.rain.toFixed(1).replace(".", ",")} mm`} detail="Acumulado do dia" formula="Como calcula: soma os valores da coluna “Precipitação” de todos os horários do dia." onOpen={() => setDetailMetric("rain")} />
          <MetricCard icon={<Droplets size={21} />} label="Umidade do solo" value={`${selected.soilMoisture}%`} detail="Camada de 0 a 10 cm" formula="Como calcula: soma as leituras de “Umidade do solo 0–10 cm” maiores que zero e divide pela quantidade de leituras." onOpen={() => setDetailMetric("soil")} />
        </section>

        <section className="operation-panel" aria-label="Estimativa da operação">
          <div className="operation-heading">
            <div>
              <p className="panel-kicker">Simulação da operação</p>
              <h2>Rendimento estimado na janela favorável</h2>
            </div>
            <span className="operation-note">Referência: {rendimentoReferencia.toFixed(1).replace(".", ",")} ha/h e {doseReferencia} L/ha</span>
          </div>
          <div className="operation-grid">
            <MetricCard
              icon={<MapPin size={21} />}
              label="Área planejada"
              value={`${areaPlanejada.toFixed(1).replace(".", ",")} ha`}
              detail={hasIdealWindow ? `Durante ${selected.idealHours}h favoráveis` : "Sem janela favorável"}
              formula="Como calcula: quantidade de horas favoráveis × 9,6 hectares trabalhados por hora."
            />
            <MetricCard
              icon={<Droplets size={21} />}
              label="Volume previsto"
              value={`${volumePrevisto.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} L`}
              detail={`Dose de referência: ${doseReferencia} L/ha`}
              formula="Como calcula: área planejada × dose de 40 litros de bioinsumo por hectare."
            />
            <MetricCard
              icon={<Activity size={21} />}
              label="Rendimento por hora"
              value={hasIdealWindow ? `${rendimentoReferencia.toFixed(1).replace(".", ",")} ha/h` : "0,0 ha/h"}
              detail={hasIdealWindow ? "Estimativa operacional" : "Aplicação não recomendada"}
              formula="Como calcula: área planejada ÷ quantidade de horas favoráveis."
            />
          </div>
        </section>

        <section className="main-grid">
          <article className="panel score-panel">
            <div className="panel-head">
              <div><p className="panel-kicker">Visão dos próximos dias</p><h2>Potencial climático</h2></div>
              <span className="panel-tag">Estimativa</span>
            </div>
            <div className="chart" role="img" aria-label="Potencial climático por dia disponível na planilha">
              <div className="chart-guides"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
              <div className="chart-bars" style={{ gridTemplateColumns: `repeat(${dashboardDays.length}, minmax(42px, 1fr))` }}>
                {dashboardDays.map((day) => (
                  <button
                    key={day.date}
                    className={`bar-column ${day.date === selectedDate ? "active" : ""}`}
                    onClick={() => setSelectedDate(day.date)}
                    aria-label={`${day.weekday}, potencial de ${day.potential}%`}
                  >
                    <span className="bar-value">{day.potential}%</span>
                    <span className="bar-track"><span className="bar-fill" style={{ height: `${day.potential}%` }} /></span>
                    <span className="bar-label">{day.shortDate}</span>
                  </button>
                ))}
              </div>
            </div>
            <p className="chart-caption"><span>Como calcula:</span> cada horário favorável vale 100 pontos, atenção vale 60 e evitar vale 0. A soma é dividida pelo total de horários.</p>
          </article>

          <article className="panel recommendation-panel">
            <div className="recommendation-top">
              <span className="recommendation-icon"><Leaf size={23} /></span>
              <div><p className="panel-kicker">Recomendação do dia</p><h2>{selected.weekday}, {selected.shortDate}</h2></div>
            </div>
            <p className="recommendation-text">{selected.recommendation}</p>
            <small className="recommendation-formula">Como decide: primeiro procura horários favoráveis. Se não encontrar, verifica chuva, vento e horários de atenção.</small>
            <div className="condition-row">
              <div><span className="condition-dot ideal" /><small>Favorável</small><strong>{selected.idealHours}h</strong></div>
              <div><span className="condition-dot attention" /><small>Atenção</small><strong>{selected.attentionHours}h</strong></div>
              <div><span className="condition-dot avoid" /><small>Evitar</small><strong>{selected.avoidHours}h</strong></div>
            </div>
          </article>
        </section>

        <section className="panel window-panel">
          <div className="panel-head window-head">
            <div><p className="panel-kicker">Planejamento da operação</p><h2>Janela de aplicação por hora</h2></div>
            <div className="legend" aria-label="Legenda">
              <span><i className="ideal" /> Favorável</span><span><i className="attention" /> Atenção</span><span><i className="avoid" /> Evitar</span>
            </div>
          </div>
          <div className="hourly-scroll">
            <div className="hourly-grid">
              {selected.hours.map((hour) => (
                <div key={hour.hour} className={`hour-card status-${hour.status}`} title={`${statusLabel[hour.status]}, vento ${hour.wind.toFixed(1)} m/s`}>
                  <strong>{hour.hour}</strong>
                  <span>{hour.temperature}°</span>
                  <small>{hour.wind.toFixed(1)} m/s</small>
                </div>
              ))}
            </div>
          </div>
          <p className="window-formula">De onde vem: leitura direta da coluna “Janela de aplicação”. O número 2 significa favorável, 1 significa atenção e 0 significa evitar.</p>
        </section>

        <section className="weather-grid" aria-label="Condições climáticas do dia">
          <button className="weather-card weather-card-button" type="button" onClick={() => setDetailMetric("temperature")} aria-label="Ver temperatura por horário"><Thermometer size={19} /><div><span>Temperatura média</span><strong>{selected.temperature.toFixed(1).replace(".", ",")}°C</strong><small>Máxima de {selected.maxTemperature.toFixed(1).replace(".", ",")}°C</small><em>Como calcula: soma as temperaturas e divide pela quantidade de horários. A máxima é o maior valor.</em></div><span className="weather-open-icon" aria-hidden="true"><ArrowUpRight size={15} /></span></button>
          <button className="weather-card weather-card-button" type="button" onClick={() => setDetailMetric("humidity")} aria-label="Ver umidade do ar por horário"><Droplets size={19} /><div><span>Umidade do ar</span><strong>{selected.humidity}%</strong><small>Média diária</small><em>Como calcula: soma a “Umidade relativa” de cada horário e divide pela quantidade de horários.</em></div><span className="weather-open-icon" aria-hidden="true"><ArrowUpRight size={15} /></span></button>
          <button className="weather-card weather-card-button" type="button" onClick={() => setDetailMetric("wind")} aria-label="Ver velocidade do vento por horário"><Wind size={19} /><div><span>Velocidade do vento</span><strong>{selected.wind.toFixed(1).replace(".", ",")} m/s</strong><small>Pico de {selected.maxWind.toFixed(1).replace(".", ",")} m/s</small><em>Como calcula: soma os valores de “Vento” e divide pela quantidade de horários. O pico é o maior valor.</em></div><span className="weather-open-icon" aria-hidden="true"><ArrowUpRight size={15} /></span></button>
        </section>

        <footer>
          <div className="footer-main">
            <span>Protótipo acadêmico • Fábrica de Projetos Ágeis</span>
            <span>Clima da planilha • Operação simulada</span>
          </div>
          <p className="project-credits">Feito por André Maciel, Murilo Boy, Caio Marconato, Gustavo Marconato, Lucas Silva e Carlos Alberto</p>
        </footer>
      </div>

      <Dialog open={detailMetric !== null} onOpenChange={(open) => { if (!open) setDetailMetric(null); }}>
        <DialogContent className="hour-detail-dialog">
          {detailContent && (
            <>
              <DialogHeader className="hour-detail-header">
                <p className="panel-kicker">{selected.weekday}, {selected.shortDate}</p>
                <DialogTitle>{detailContent.title}</DialogTitle>
                <DialogDescription>{detailContent.description}</DialogDescription>
              </DialogHeader>
              <div className="hour-detail-scroll">
                <div className="hour-detail-grid">
                  {detailContent.rows.map((row) => (
                    <div key={`${detailMetric}-${row.hour}`} className={`hour-detail-item${row.status !== undefined ? ` detail-status-${row.status}` : ""}`}>
                      <span>{row.hour}</span>
                      <strong>{row.value}</strong>
                      {row.note && <small>{row.note}</small>}
                    </div>
                  ))}
                </div>
              </div>
              <p className="hour-detail-source">Dados da previsão horária carregada no dashboard.</p>
            </>
          )}
        </DialogContent>
      </Dialog>

      <aside className="assistant-widget" aria-label="Assistente Orion">
        {assistantOpen && (
          <section className="assistant-panel">
            <header className="assistant-header">
              <div className="assistant-identity">
                <span className="assistant-avatar assistant-avatar-small">
                  <img src="/orion-logo.png" alt="" />
                </span>
                <div>
                  <strong>Assistente Orion</strong>
                  <span><i /> Disponível</span>
                </div>
              </div>
              <div className="assistant-actions">
                <button className="assistant-close" type="button" onClick={clearAssistantChat} aria-label="Apagar conversa" title="Apagar conversa">
                  <Trash2 size={17} />
                </button>
                <button className="assistant-close" type="button" onClick={() => setAssistantOpen(false)} aria-label="Fechar assistente">
                  <X size={18} />
                </button>
              </div>
            </header>

            <div className="assistant-messages" aria-live="polite">
              {assistantMessages.map((message) => (
                <p key={message.id} className={`assistant-message ${message.role}`}>
                  {message.text}
                </p>
              ))}
              {assistantLoading && <p className="assistant-message assistant assistant-thinking">Pensando...</p>}
            </div>

            <form className="assistant-form" onSubmit={handleAssistantSubmit}>
              <label className="sr-only" htmlFor="assistant-message">Mensagem para o assistente</label>
              <input
                id="assistant-message"
                value={assistantInput}
                onChange={(event) => setAssistantInput(event.target.value)}
                placeholder="Digite sua pergunta..."
                maxLength={500}
                disabled={assistantLoading}
                autoFocus
              />
              <button type="submit" aria-label="Enviar mensagem" disabled={!assistantInput.trim() || assistantLoading}>
                <Send size={17} />
              </button>
            </form>
            <p className="assistant-api-note">Respostas geradas por inteligência artificial</p>
          </section>
        )}

        <button
          className="assistant-launcher"
          type="button"
          onClick={() => setAssistantOpen((current) => !current)}
          aria-expanded={assistantOpen}
          aria-label={assistantOpen ? "Fechar assistente Orion" : "Abrir assistente Orion"}
        >
          <span className="assistant-avatar">
            <img src="/orion-logo.png" alt="" />
          </span>
          <span className="assistant-launcher-copy">
            <strong>Assistente Orion</strong>
            <small>Clique para conversar</small>
          </span>
          <i className="assistant-online" />
        </button>
      </aside>
    </main>
  );
}
