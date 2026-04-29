import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/pages/PredictionsAxe2.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=467f9d59"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
let prevRefreshReg;
let prevRefreshSig;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = RefreshRuntime.getRefreshReg("C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx");
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$(), _s2 = $RefreshSig$(), _s3 = $RefreshSig$(), _s4 = $RefreshSig$(), _s5 = $RefreshSig$(), _s6 = $RefreshSig$(), _s7 = $RefreshSig$(), _s8 = $RefreshSig$(), _s9 = $RefreshSig$();
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=467f9d59"; const useState = __vite__cjsImport3_react["useState"]; const useEffect = __vite__cjsImport3_react["useEffect"]; const useMemo = __vite__cjsImport3_react["useMemo"];
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  Line,
  ReferenceLine,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "/node_modules/.vite/deps/recharts.js?v=467f9d59";
import Select from "/node_modules/.vite/deps/react-select.js?v=467f9d59";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Zap
} from "/node_modules/.vite/deps/lucide-react.js?v=467f9d59";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from "/node_modules/.vite/deps/react-simple-maps.js?v=467f9d59";
import api from "/src/utils/api.ts";
import {
  NUMERIC_TO_ISO3,
  ISO3_NAMES,
  AFRICA_NUMERIC,
  interpolatePositioned,
  COLOR_SCALES_POSITIONED
} from "/src/utils/cartographieConstants.ts";
const OLIVE = "hsl(83,52%,36%)";
const NAVY = "hsl(213,60%,27%)";
const GREEN = "hsl(152,56%,39%)";
const RED = "hsl(358,66%,54%)";
const ORANGE = "hsl(30,88%,56%)";
const VIOLET = "hsl(270,50%,45%)";
const BLUE = "hsl(200,70%,40%)";
const GRAY = "hsl(218,14%,55%)";
const OLIVE_15 = "hsla(83,52%,36%,0.15)";
const OLIVE_8 = "hsla(83,52%,36%,0.08)";
const TOP_COLORS = [OLIVE, NAVY, GREEN, ORANGE, VIOLET, RED, BLUE, "#8E44AD", "#D35400", "#16A085"];
const REGION_COLORS = {
  "Afrique du Nord": NAVY,
  "Afrique de l'Ouest": ORANGE,
  "Afrique Centrale": BLUE,
  "Afrique de l'Est": GREEN,
  "Afrique Australe": VIOLET
};
const MODEL_COLORS = {
  "FE-OLS+Ridge+ARIMA": { bg: "hsla(213,60%,27%,0.10)", fg: NAVY },
  "AR2+Ridge+XGBoost": { bg: "hsla(30,88%,56%,0.15)", fg: ORANGE },
  GaussianProcess: { bg: "hsla(270,50%,45%,0.13)", fg: VIOLET },
  "AR1-MR": { bg: "hsla(83,52%,36%,0.13)", fg: OLIVE },
  "Ridge-Hierarchique": { bg: "hsla(200,70%,40%,0.13)", fg: BLUE },
  Derived: { bg: "hsla(218,14%,55%,0.13)", fg: GRAY }
};
const MODEL_LABEL = {
  "FE-OLS+Ridge+ARIMA": "FE-OLS + Ridge",
  "AR2+Ridge+XGBoost": "AR(2) + XGB",
  GaussianProcess: "GP",
  "AR1-MR": "AR(1) MR",
  "Ridge-Hierarchique": "Ridge Hiérar.",
  Derived: "Dérivée"
};
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const fmtPct = (v, dec = 1) => v == null || isNaN(v) ? "—" : `${v.toFixed(dec)} %`;
const fmtPctSgn = (v, dec = 1) => v == null || isNaN(v) ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(dec)} %`;
const fmtMn = (v) => v == null || isNaN(v) ? "—" : v >= 1e3 ? `${(v / 1e3).toFixed(1)} Mrd$` : `${v.toFixed(0)} Mn$`;
const fmtUsd = (v) => v == null || isNaN(v) ? "—" : `$${Math.round(v).toLocaleString()}`;
const fmtUsdHab = (v) => v == null || isNaN(v) ? "—" : `$${Math.round(v).toLocaleString()}/hab`;
const fmtWgi = (v) => v == null || isNaN(v) ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}`;
const fmtR2 = (v) => v == null || isNaN(v) ? "—" : v.toFixed(3);
const fmtNum = (v, dec = 2) => v == null || isNaN(v) ? "—" : v.toFixed(dec);
function formatByUnite(v, unite) {
  if (v == null || isNaN(v)) return "—";
  if (unite === "Mn USD") return fmtMn(v);
  if (unite === "USD/hab") return fmtUsdHab(v);
  if (unite === "USD") return fmtUsd(v);
  if (unite === "%") return fmtPct(v);
  if (unite === "indice") return fmtWgi(v);
  return fmtNum(v);
}
function ModelBadge({ modele, blended }) {
  const c = MODEL_COLORS[modele] ?? MODEL_COLORS.Derived;
  const label = MODEL_LABEL[modele] ?? modele;
  return /* @__PURE__ */ jsxDEV(
    "span",
    {
      className: "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold",
      style: { background: c.bg, color: c.fg },
      children: [
        label,
        blended && /* @__PURE__ */ jsxDEV("span", { title: "Axco blended", className: "opacity-80", children: "✓ Axco" }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 234,
          columnNumber: 19
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 231,
      columnNumber: 5
    },
    this
  );
}
_c = ModelBadge;
function SectionTitle({ children }) {
  return /* @__PURE__ */ jsxDEV(
    "h2",
    {
      className: "text-base font-bold text-gray-800 flex items-center gap-2 pb-2",
      style: { borderBottom: "2px solid hsla(83,52%,42%,0.20)" },
      children
    },
    void 0,
    false,
    {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 241,
      columnNumber: 5
    },
    this
  );
}
_c2 = SectionTitle;
function DeltaBadge({ v, sensFavorable }) {
  if (v == null || isNaN(v)) return /* @__PURE__ */ jsxDEV("span", { className: "text-gray-400", children: "—" }, void 0, false, {
    fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
    lineNumber: 249,
    columnNumber: 37
  }, this);
  const isFavorable = sensFavorable === "hausse" ? v > 0 : v < 0;
  const isFlat = Math.abs(v) < 0.5;
  const Icon = isFlat ? Minus : v > 0 ? TrendingUp : TrendingDown;
  const color = isFlat ? GRAY : isFavorable ? GREEN : RED;
  return /* @__PURE__ */ jsxDEV(
    "span",
    {
      className: "inline-flex items-center gap-0.5 font-semibold text-[11px]",
      style: { color },
      children: [
        /* @__PURE__ */ jsxDEV(Icon, { size: 12 }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 257,
          columnNumber: 7
        }, this),
        fmtPctSgn(v, 1)
      ]
    },
    void 0,
    true,
    {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 255,
      columnNumber: 5
    },
    this
  );
}
_c3 = DeltaBadge;
function SkeletonCard() {
  return /* @__PURE__ */ jsxDEV("div", { className: "rounded-xl bg-gray-100 animate-pulse", style: { height: 100 } }, void 0, false, {
    fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
    lineNumber: 265,
    columnNumber: 10
  }, this);
}
_c4 = SkeletonCard;
function SkeletonChart() {
  return /* @__PURE__ */ jsxDEV("div", { className: "rounded-xl bg-gray-100 animate-pulse", style: { height: 320 } }, void 0, false, {
    fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
    lineNumber: 268,
    columnNumber: 10
  }, this);
}
_c5 = SkeletonChart;
function PredChart({
  label,
  unite,
  historique,
  predictions,
  modele,
  r2,
  mape,
  axcoBlended,
  height = 250
}) {
  _s();
  const data = useMemo(() => {
    const map = {};
    historique.forEach((h) => {
      map[h.annee] = { annee: h.annee, hist: h.valeur };
    });
    predictions.forEach((p) => {
      const existing = map[p.annee] ?? { annee: p.annee };
      map[p.annee] = { ...existing, pred: p.valeur, ic_lower: p.ic_lower, ic_upper: p.ic_upper };
    });
    if (map[2024]) {
      map[2024].pred = map[2024].hist;
      map[2024].ic_lower = map[2024].hist;
      map[2024].ic_upper = map[2024].hist;
    }
    return Object.values(map).sort((a, b) => a.annee - b.annee);
  }, [historique, predictions]);
  return /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-xl p-3", style: { border: "1px solid hsl(0,0%,90%)" }, children: [
    /* @__PURE__ */ jsxDEV("div", { className: "flex items-start justify-between mb-2 flex-wrap gap-2", children: [
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("h3", { className: "text-sm font-bold text-gray-800", children: label }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 307,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-[10px] text-gray-500 mt-0.5", children: unite }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 308,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 306,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ jsxDEV(ModelBadge, { modele, blended: axcoBlended }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 311,
          columnNumber: 11
        }, this),
        r2 != null && /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] font-mono text-gray-600", children: [
          "R²=",
          fmtR2(r2)
        ] }, void 0, true, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 313,
          columnNumber: 11
        }, this),
        mape != null && /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] font-mono text-gray-600", children: [
          "MAPE=",
          fmtPct(mape)
        ] }, void 0, true, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 316,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 310,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 305,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(ResponsiveContainer, { width: "100%", height, children: /* @__PURE__ */ jsxDEV(ComposedChart, { data, margin: { top: 5, right: 10, left: -5, bottom: 0 }, children: [
      /* @__PURE__ */ jsxDEV(CartesianGrid, { strokeDasharray: "3 3", stroke: "hsl(0,0%,93%)" }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 322,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(XAxis, { dataKey: "annee", tick: { fontSize: 10 }, stroke: "hsl(0,0%,50%)" }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 323,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(YAxis, { tick: { fontSize: 10 }, stroke: "hsl(0,0%,50%)" }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 324,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(
        Tooltip,
        {
          content: ({ payload, label: lbl }) => {
            if (!payload || !payload.length) return null;
            const d = payload[0].payload;
            return /* @__PURE__ */ jsxDEV(
              "div",
              {
                className: "bg-white px-2.5 py-2 rounded shadow text-xs",
                style: { border: "1px solid hsl(0,0%,85%)" },
                children: [
                  /* @__PURE__ */ jsxDEV("div", { className: "font-bold text-gray-800 mb-1", children: lbl }, void 0, false, {
                    fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                    lineNumber: 332,
                    columnNumber: 19
                  }, this),
                  d.hist != null && /* @__PURE__ */ jsxDEV("div", { children: [
                    "Historique : ",
                    /* @__PURE__ */ jsxDEV("strong", { children: formatByUnite(d.hist, unite) }, void 0, false, {
                      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                      lineNumber: 333,
                      columnNumber: 56
                    }, this)
                  ] }, void 0, true, {
                    fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                    lineNumber: 333,
                    columnNumber: 38
                  }, this),
                  d.pred != null && d.annee > 2024 && /* @__PURE__ */ jsxDEV(Fragment, { children: [
                    /* @__PURE__ */ jsxDEV("div", { children: [
                      "Prédiction : ",
                      /* @__PURE__ */ jsxDEV("strong", { children: formatByUnite(d.pred, unite) }, void 0, false, {
                        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                        lineNumber: 336,
                        columnNumber: 41
                      }, this)
                    ] }, void 0, true, {
                      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                      lineNumber: 336,
                      columnNumber: 23
                    }, this),
                    /* @__PURE__ */ jsxDEV("div", { className: "text-gray-500", children: [
                      "IC 95% : [",
                      formatByUnite(d.ic_lower, unite),
                      " ; ",
                      formatByUnite(d.ic_upper, unite),
                      "]"
                    ] }, void 0, true, {
                      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                      lineNumber: 337,
                      columnNumber: 23
                    }, this)
                  ] }, void 0, true, {
                    fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                    lineNumber: 335,
                    columnNumber: 19
                  }, this)
                ]
              },
              void 0,
              true,
              {
                fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                lineNumber: 330,
                columnNumber: 17
              },
              this
            );
          }
        },
        void 0,
        false,
        {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 325,
          columnNumber: 11
        },
        this
      ),
      /* @__PURE__ */ jsxDEV(Area, { type: "monotone", dataKey: "ic_upper", stroke: "none", fill: OLIVE, fillOpacity: 0.1 }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 344,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(Area, { type: "monotone", dataKey: "ic_lower", stroke: "none", fill: "#fff", fillOpacity: 1 }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 345,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(ReferenceLine, { x: 2024, stroke: "hsl(0,0%,70%)", strokeDasharray: "3 3" }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 346,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(Line, { type: "monotone", dataKey: "hist", stroke: NAVY, strokeWidth: 2, dot: { r: 2.5 } }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 347,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(
        Line,
        {
          type: "monotone",
          dataKey: "pred",
          stroke: OLIVE,
          strokeWidth: 2,
          strokeDasharray: "6 3",
          dot: { r: 2.5 }
        },
        void 0,
        false,
        {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 348,
          columnNumber: 11
        },
        this
      )
    ] }, void 0, true, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 321,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 320,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
    lineNumber: 304,
    columnNumber: 5
  }, this);
}
_s(PredChart, "jwuu1hJIzb+z9O8CErpZ1XdXNoc=");
_c6 = PredChart;
const TABS = [
  { id: "overview", label: "Vue d'ensemble", icon: "🔮" },
  { id: "trajectoires", label: "Trajectoires", icon: "📈" },
  { id: "pays", label: "Analyse par Pays", icon: "🌍" },
  { id: "variable", label: "Par Variable", icon: "📊" },
  { id: "comparaison", label: "Comparaison", icon: "⚖️" },
  { id: "carte", label: "Carte 2030", icon: "🗺️" }
];
function TabNav({ active, onChange }) {
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: "bg-white rounded-xl overflow-hidden mb-1",
      style: { border: "1px solid hsl(0,0%,90%)", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
      children: /* @__PURE__ */ jsxDEV("div", { className: "flex overflow-x-auto scrollbar-hide", children: TABS.map((tab) => {
        const isActive = active === tab.id;
        return /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => onChange(tab.id),
            className: "flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all relative flex-shrink-0",
            style: isActive ? { color: "hsl(83,52%,30%)", background: OLIVE_8, borderBottom: `2px solid ${OLIVE}` } : { color: "#6b7280", borderBottom: "2px solid transparent" },
            children: [
              /* @__PURE__ */ jsxDEV("span", { children: tab.icon }, void 0, false, {
                fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                lineNumber: 382,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: tab.label }, void 0, false, {
                fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                lineNumber: 383,
                columnNumber: 15
              }, this)
            ]
          },
          tab.id,
          true,
          {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 376,
            columnNumber: 13
          },
          this
        );
      }) }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 372,
        columnNumber: 7
      }, this)
    },
    void 0,
    false,
    {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 370,
      columnNumber: 5
    },
    this
  );
}
_c7 = TabNav;
function TabProgress({ active }) {
  const idx = TABS.findIndex((t) => t.id === active);
  return /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5 mb-4", children: TABS.map(
    (_, i) => /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "h-1 rounded-full transition-all",
        style: {
          flex: 1,
          background: i === idx ? OLIVE : i < idx ? OLIVE_15 : "hsl(0,0%,90%)"
        }
      },
      i,
      false,
      {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 397,
        columnNumber: 7
      },
      this
    )
  ) }, void 0, false, {
    fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
    lineNumber: 395,
    columnNumber: 5
  }, this);
}
_c8 = TabProgress;
export default function PredictionsAxe2() {
  _s2();
  const [activeTab, setActiveTab] = useState("overview");
  const [metadata, setMetadata] = useState(null);
  const [validation, setValidation] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [activeRegion, setActiveRegion] = useState("all");
  useEffect(() => {
    document.getElementById("scar-main-scroll")?.scrollTo({ top: 0, behavior: "instant" });
  }, [activeTab]);
  useEffect(() => {
    setLoadingMeta(true);
    Promise.all(
      [
        api.get("/predictions/axe2/metadata").then((r) => setMetadata(r.data)),
        api.get("/predictions/axe2/validation").then((r) => setValidation(r.data))
      ]
    ).finally(() => setLoadingMeta(false));
  }, []);
  if (loadingMeta || !metadata) {
    return /* @__PURE__ */ jsxDEV("div", { className: "px-6 py-6 space-y-3", children: [
      /* @__PURE__ */ jsxDEV(SkeletonChart, {}, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 433,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: [...Array(4)].map((_, i) => /* @__PURE__ */ jsxDEV(SkeletonCard, {}, i, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 435,
        columnNumber: 40
      }, this)) }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 434,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 432,
      columnNumber: 7
    }, this);
  }
  return /* @__PURE__ */ jsxDEV("div", { className: "px-6 py-5", style: { background: "hsl(210,20%,98%)", minHeight: "100%" }, children: [
    /* @__PURE__ */ jsxDEV(Header, { metadata, validation }, void 0, false, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 443,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "bg-white rounded-xl p-3 mb-4 flex items-center gap-3 flex-wrap",
        style: { border: "1px solid hsl(0,0%,90%)" },
        children: [
          /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-semibold text-gray-600", children: "Région :" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 447,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => setActiveRegion("all"),
              className: "px-3 py-1 rounded-full text-[11px] font-semibold transition-colors",
              style: activeRegion === "all" ? { background: OLIVE, color: "white" } : { background: "hsl(0,0%,93%)", color: "#6b7280" },
              children: "Toutes"
            },
            void 0,
            false,
            {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 448,
              columnNumber: 9
            },
            this
          ),
          metadata.regions.map(
            (r) => /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => setActiveRegion(r),
                className: "px-3 py-1 rounded-full text-[11px] font-semibold transition-colors",
                style: activeRegion === r ? { background: REGION_COLORS[r] ?? OLIVE, color: "white" } : { background: "hsl(0,0%,93%)", color: "#6b7280" },
                children: r
              },
              r,
              false,
              {
                fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                lineNumber: 454,
                columnNumber: 9
              },
              this
            )
          )
        ]
      },
      void 0,
      true,
      {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 445,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV(TabNav, { active: activeTab, onChange: setActiveTab }, void 0, false, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 464,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(TabProgress, { active: activeTab }, void 0, false, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 465,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "animate-fade-in", children: [
      activeTab === "overview" && /* @__PURE__ */ jsxDEV(OverviewTab, { activeRegion }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 468,
        columnNumber: 38
      }, this),
      activeTab === "trajectoires" && /* @__PURE__ */ jsxDEV(TrajectoiresTab, { metadata }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 469,
        columnNumber: 42
      }, this),
      activeTab === "pays" && /* @__PURE__ */ jsxDEV(PaysTab, { metadata, validation, setValidation }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 470,
        columnNumber: 34
      }, this),
      activeTab === "variable" && /* @__PURE__ */ jsxDEV(VariableTab, { metadata }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 471,
        columnNumber: 38
      }, this),
      activeTab === "comparaison" && /* @__PURE__ */ jsxDEV(ComparaisonTab, { metadata }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 472,
        columnNumber: 41
      }, this),
      activeTab === "carte" && /* @__PURE__ */ jsxDEV(CarteTab, { metadata }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 473,
        columnNumber: 35
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 467,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("style", { children: `
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.25s ease-out; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      ` }, void 0, false, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 476,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
    lineNumber: 442,
    columnNumber: 5
  }, this);
}
_s2(PredictionsAxe2, "go9YoEkwnyjKgi5SD/foMZZ/7BQ=");
_c9 = PredictionsAxe2;
function Header({ metadata, validation }) {
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: "rounded-2xl p-5 mb-4",
      style: {
        background: `linear-gradient(135deg, ${OLIVE} 0%, hsl(83,52%,28%) 100%)`,
        boxShadow: "0 8px 32px hsla(83,40%,20%,0.18)"
      },
      children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-start justify-between flex-wrap gap-3", children: [
          /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("h1", { className: "text-2xl font-bold text-white flex items-center gap-2", children: "🔮 Prédictions Marchés Africains 2030" }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 502,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-white/85 text-sm mt-1", children: [
              "Modèle hybride · ",
              metadata.pays.length,
              " pays · ",
              metadata.target_vars.length,
              " variables · Horizons ",
              metadata.annees_prediction[0],
              "–",
              metadata.annees_prediction[metadata.annees_prediction.length - 1]
            ] }, void 0, true, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 505,
              columnNumber: 11
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 501,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex flex-wrap gap-1.5 items-center", children: [
            metadata.axco_loaded ? /* @__PURE__ */ jsxDEV(
              "span",
              {
                className: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold",
                style: { background: "hsla(140,55%,40%,0.95)", color: "white" },
                title: metadata.axco_filename ?? "",
                children: [
                  /* @__PURE__ */ jsxDEV(CheckCircle2, { size: 12 }, void 0, false, {
                    fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                    lineNumber: 515,
                    columnNumber: 15
                  }, this),
                  " Axco Navigator"
                ]
              },
              void 0,
              true,
              {
                fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                lineNumber: 512,
                columnNumber: 11
              },
              this
            ) : /* @__PURE__ */ jsxDEV(
              "span",
              {
                className: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold",
                style: { background: "hsla(30,88%,56%,0.95)", color: "white" },
                children: [
                  /* @__PURE__ */ jsxDEV(Zap, { size: 12 }, void 0, false, {
                    fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                    lineNumber: 520,
                    columnNumber: 15
                  }, this),
                  " Modèle ML pur"
                ]
              },
              void 0,
              true,
              {
                fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                lineNumber: 518,
                columnNumber: 11
              },
              this
            ),
            validation?.coherence_tests.bounds_ok && validation?.coherence_tests.ic_ok && /* @__PURE__ */ jsxDEV(
              "span",
              {
                className: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold",
                style: { background: "hsla(213,60%,30%,0.85)", color: "white" },
                children: [
                  /* @__PURE__ */ jsxDEV(CheckCircle2, { size: 12 }, void 0, false, {
                    fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                    lineNumber: 526,
                    columnNumber: 15
                  }, this),
                  " Cohérence validée"
                ]
              },
              void 0,
              true,
              {
                fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                lineNumber: 524,
                columnNumber: 11
              },
              this
            )
          ] }, void 0, true, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 510,
            columnNumber: 9
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 500,
          columnNumber: 7
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex flex-wrap gap-1.5 mt-3", children: [
          "FE-OLS + Ridge",
          "Gaussian Process",
          "XGBoost résidus",
          "Conformal Prediction IC 95%"
        ].map(
          (b, i) => /* @__PURE__ */ jsxDEV(
            "span",
            {
              className: "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold backdrop-blur",
              style: { background: "hsla(0,0%,100%,0.20)", color: "white", border: "1px solid hsla(0,0%,100%,0.25)" },
              children: b
            },
            i,
            false,
            {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 539,
              columnNumber: 9
            },
            this
          )
        ) }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 532,
          columnNumber: 7
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 495,
      columnNumber: 5
    },
    this
  );
}
_c0 = Header;
function OverviewTab({ activeRegion }) {
  _s3();
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState("nv_primes_2030");
  const [sortDir, setSortDir] = useState("desc");
  useEffect(() => {
    setLoading(true);
    api.get("/predictions/axe2/overview").then((r) => setRows(r.data)).finally(() => setLoading(false));
  }, []);
  const filtered = useMemo(() => {
    if (!rows) return [];
    if (activeRegion === "all") return rows;
    return rows.filter((r) => r.region === activeRegion);
  }, [rows, activeRegion]);
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [filtered, sortKey, sortDir]);
  const totalPrimes2030 = useMemo(() => filtered.reduce((s, r) => s + (r.nv_primes_2030 ?? 0), 0), [filtered]);
  const medianGrowth = useMemo(() => {
    const vals = filtered.map((r) => r.nv_primes_var_pct).filter((v) => v != null).sort((a, b) => a - b);
    if (!vals.length) return null;
    return vals[Math.floor(vals.length / 2)];
  }, [filtered]);
  const bestPenetration = useMemo(() => {
    let best = { pays: "—", val: 0 };
    filtered.forEach((r) => {
      if ((r.nv_penetration_2030 ?? 0) > best.val) best = { pays: r.pays, val: r.nv_penetration_2030 ?? 0 };
    });
    return best;
  }, [filtered]);
  const medianSP = useMemo(() => {
    const vals = filtered.map((r) => r.nv_sp_2030).filter((v) => v != null).sort((a, b) => a - b);
    if (!vals.length) return null;
    return vals[Math.floor(vals.length / 2)];
  }, [filtered]);
  const top10 = useMemo(() => {
    return [...filtered].sort((a, b) => (b.nv_primes_2030 ?? 0) - (a.nv_primes_2030 ?? 0)).slice(0, 10).map((r) => ({
      pays: r.pays,
      nv: r.nv_primes_2030 ?? 0,
      vie: r.vie_primes_2030 ?? 0,
      region: r.region
    }));
  }, [filtered]);
  if (loading || !rows) {
    return /* @__PURE__ */ jsxDEV("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: [...Array(4)].map((_, i) => /* @__PURE__ */ jsxDEV(SkeletonCard, {}, i, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 621,
        columnNumber: 40
      }, this)) }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 620,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(SkeletonChart, {}, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 623,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 619,
      columnNumber: 7
    }, this);
  }
  const PAGE_SIZE = 15;
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  function changeSort(key) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }
  const sortIcon = (key) => sortKey === key ? sortDir === "asc" ? "↑" : "↓" : "";
  return /* @__PURE__ */ jsxDEV("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: [
      /* @__PURE__ */ jsxDEV(KpiCard, { label: "Primes Non-Vie 2030", value: fmtMn(totalPrimes2030), subtitle: `${filtered.length} pays`, accent: NAVY }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 643,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(KpiCard, { label: "Croissance médiane primes NV", value: fmtPctSgn(medianGrowth), subtitle: "2024 → 2030", accent: GREEN }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 644,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(KpiCard, { label: "Meilleure pénétration NV 2030", value: fmtPct(bestPenetration.val, 2), subtitle: bestPenetration.pays, accent: OLIVE }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 645,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(KpiCard, { label: "Ratio S/P médian 2030", value: fmtPct(medianSP, 1), subtitle: filtered.length > 0 ? "Non-Vie" : "—", accent: ORANGE }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 646,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 642,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-xl p-4", style: { border: "1px solid hsl(0,0%,90%)" }, children: [
      /* @__PURE__ */ jsxDEV(SectionTitle, { children: "Top 10 marchés africains 2030 (primes Non-Vie + Vie)" }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 650,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(ResponsiveContainer, { width: "100%", height: 400, children: /* @__PURE__ */ jsxDEV(BarChart, { data: top10, layout: "vertical", margin: { top: 10, right: 30, left: 80, bottom: 0 }, children: [
        /* @__PURE__ */ jsxDEV(CartesianGrid, { strokeDasharray: "3 3", stroke: "hsl(0,0%,93%)" }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 653,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(XAxis, { type: "number", tick: { fontSize: 10 }, tickFormatter: (v) => fmtMn(v) }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 654,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(YAxis, { type: "category", dataKey: "pays", tick: { fontSize: 11 }, width: 75 }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 655,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(
          Tooltip,
          {
            content: ({ payload, label }) => {
              if (!payload || !payload.length) return null;
              const d = payload[0].payload;
              return /* @__PURE__ */ jsxDEV(
                "div",
                {
                  className: "bg-white px-3 py-2 rounded shadow text-xs",
                  style: { border: "1px solid hsl(0,0%,85%)" },
                  children: [
                    /* @__PURE__ */ jsxDEV("div", { className: "font-bold text-gray-800 mb-1", children: label }, void 0, false, {
                      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                      lineNumber: 663,
                      columnNumber: 21
                    }, this),
                    /* @__PURE__ */ jsxDEV("div", { className: "text-[10px] text-gray-500 mb-1", children: d.region }, void 0, false, {
                      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                      lineNumber: 664,
                      columnNumber: 21
                    }, this),
                    /* @__PURE__ */ jsxDEV("div", { children: [
                      "Non-Vie : ",
                      /* @__PURE__ */ jsxDEV("strong", { children: fmtMn(d.nv) }, void 0, false, {
                        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                        lineNumber: 665,
                        columnNumber: 36
                      }, this)
                    ] }, void 0, true, {
                      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                      lineNumber: 665,
                      columnNumber: 21
                    }, this),
                    /* @__PURE__ */ jsxDEV("div", { children: [
                      "Vie : ",
                      /* @__PURE__ */ jsxDEV("strong", { children: fmtMn(d.vie) }, void 0, false, {
                        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                        lineNumber: 666,
                        columnNumber: 32
                      }, this)
                    ] }, void 0, true, {
                      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                      lineNumber: 666,
                      columnNumber: 21
                    }, this),
                    /* @__PURE__ */ jsxDEV("div", { className: "border-t mt-1 pt-1", children: [
                      "Total : ",
                      /* @__PURE__ */ jsxDEV("strong", { children: fmtMn(d.nv + d.vie) }, void 0, false, {
                        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                        lineNumber: 667,
                        columnNumber: 65
                      }, this)
                    ] }, void 0, true, {
                      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                      lineNumber: 667,
                      columnNumber: 21
                    }, this)
                  ]
                },
                void 0,
                true,
                {
                  fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                  lineNumber: 661,
                  columnNumber: 19
                },
                this
              );
            }
          },
          void 0,
          false,
          {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 656,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(Legend, { verticalAlign: "top", height: 28, iconSize: 10, wrapperStyle: { fontSize: 11 } }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 672,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(Bar, { dataKey: "nv", name: "Non-Vie 2030", stackId: "a", fill: OLIVE }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 673,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(Bar, { dataKey: "vie", name: "Vie 2030", stackId: "a", fill: NAVY }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 674,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 652,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 651,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 649,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-xl p-4", style: { border: "1px solid hsl(0,0%,90%)" }, children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between flex-wrap gap-2 mb-3", children: /* @__PURE__ */ jsxDEV(SectionTitle, { children: [
        "Synthèse ",
        filtered.length,
        " pays — 2024 vs 2030"
      ] }, void 0, true, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 681,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 680,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxDEV("table", { className: "w-full text-xs", children: [
        /* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", { className: "border-b-2", style: { borderColor: OLIVE_15 }, children: [
          /* @__PURE__ */ jsxDEV("th", { className: "text-left py-2 px-2 cursor-pointer hover:bg-gray-50", onClick: () => changeSort("pays"), children: [
            "Pays ",
            sortIcon("pays")
          ] }, void 0, true, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 687,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "text-left py-2 px-2", children: "Région" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 688,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "text-right py-2 px-2 cursor-pointer hover:bg-gray-50", onClick: () => changeSort("nv_primes_2030"), children: [
            "Primes NV 2030 ",
            sortIcon("nv_primes_2030")
          ] }, void 0, true, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 689,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "text-right py-2 px-2 cursor-pointer hover:bg-gray-50", onClick: () => changeSort("nv_primes_var_pct"), children: [
            "Var % ",
            sortIcon("nv_primes_var_pct")
          ] }, void 0, true, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 690,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "text-right py-2 px-2 cursor-pointer hover:bg-gray-50", onClick: () => changeSort("nv_penetration_2030"), children: [
            "Pénét. NV ",
            sortIcon("nv_penetration_2030")
          ] }, void 0, true, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 691,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "text-right py-2 px-2 cursor-pointer hover:bg-gray-50", onClick: () => changeSort("nv_sp_2030"), children: [
            "S/P NV ",
            sortIcon("nv_sp_2030")
          ] }, void 0, true, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 692,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "text-right py-2 px-2 cursor-pointer hover:bg-gray-50", onClick: () => changeSort("gdpcap_2030"), children: [
            "PIB/hab ",
            sortIcon("gdpcap_2030")
          ] }, void 0, true, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 693,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "text-right py-2 px-2 cursor-pointer hover:bg-gray-50", onClick: () => changeSort("polstab_2030"), children: [
            "Stab. Pol. ",
            sortIcon("polstab_2030")
          ] }, void 0, true, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 694,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "text-right py-2 px-2 cursor-pointer hover:bg-gray-50", onClick: () => changeSort("vie_primes_2030"), children: [
            "Primes Vie ",
            sortIcon("vie_primes_2030")
          ] }, void 0, true, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 695,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 686,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 685,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("tbody", { children: pageRows.map(
          (r) => /* @__PURE__ */ jsxDEV("tr", { className: "border-b hover:bg-gray-50", style: { borderColor: "hsl(0,0%,95%)" }, children: [
            /* @__PURE__ */ jsxDEV("td", { className: "py-1.5 px-2 font-semibold text-gray-800", children: r.pays }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 701,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "py-1.5 px-2", children: [
              /* @__PURE__ */ jsxDEV(
                "span",
                {
                  className: "inline-block w-2 h-2 rounded-full mr-1.5",
                  style: { background: REGION_COLORS[r.region] ?? GRAY }
                },
                void 0,
                false,
                {
                  fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                  lineNumber: 703,
                  columnNumber: 21
                },
                this
              ),
              /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] text-gray-600", children: r.region }, void 0, false, {
                fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                lineNumber: 705,
                columnNumber: 21
              }, this)
            ] }, void 0, true, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 702,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV(
              "td",
              {
                className: "py-1.5 px-2 text-right font-mono",
                title: r.nv_primes_ic_low != null ? `IC 95%: [${fmtMn(r.nv_primes_ic_low)} ; ${fmtMn(r.nv_primes_ic_up)}]` : "",
                children: fmtMn(r.nv_primes_2030)
              },
              void 0,
              false,
              {
                fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                lineNumber: 707,
                columnNumber: 19
              },
              this
            ),
            /* @__PURE__ */ jsxDEV("td", { className: "py-1.5 px-2 text-right", children: /* @__PURE__ */ jsxDEV(DeltaBadge, { v: r.nv_primes_var_pct, sensFavorable: "hausse" }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 712,
              columnNumber: 21
            }, this) }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 711,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV(
              "td",
              {
                className: "py-1.5 px-2 text-right font-mono",
                title: r.nv_penetration_ic_low != null ? `IC 95%: [${fmtPct(r.nv_penetration_ic_low, 2)} ; ${fmtPct(r.nv_penetration_ic_up, 2)}]` : "",
                children: fmtPct(r.nv_penetration_2030, 2)
              },
              void 0,
              false,
              {
                fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                lineNumber: 714,
                columnNumber: 19
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              "td",
              {
                className: "py-1.5 px-2 text-right font-mono",
                title: r.nv_sp_ic_low != null ? `IC 95%: [${fmtPct(r.nv_sp_ic_low, 1)} ; ${fmtPct(r.nv_sp_ic_up, 1)}]` : "",
                children: fmtPct(r.nv_sp_2030, 1)
              },
              void 0,
              false,
              {
                fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                lineNumber: 718,
                columnNumber: 19
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              "td",
              {
                className: "py-1.5 px-2 text-right font-mono",
                title: r.gdpcap_ic_low != null ? `IC 95%: [${fmtUsd(r.gdpcap_ic_low)} ; ${fmtUsd(r.gdpcap_ic_up)}]` : "",
                children: fmtUsd(r.gdpcap_2030)
              },
              void 0,
              false,
              {
                fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                lineNumber: 722,
                columnNumber: 19
              },
              this
            ),
            /* @__PURE__ */ jsxDEV("td", { className: "py-1.5 px-2 text-right font-mono", children: fmtWgi(r.polstab_2030) }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 726,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "py-1.5 px-2 text-right font-mono", children: fmtMn(r.vie_primes_2030) }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 727,
              columnNumber: 19
            }, this)
          ] }, r.pays, true, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 700,
            columnNumber: 15
          }, this)
        ) }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 698,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 684,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 683,
        columnNumber: 9
      }, this),
      totalPages > 1 && /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between mt-3 text-xs text-gray-600", children: [
        /* @__PURE__ */ jsxDEV("span", { children: [
          "Page ",
          page + 1,
          " / ",
          totalPages
        ] }, void 0, true, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 735,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex gap-1", children: [
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => setPage(Math.max(0, page - 1)),
              disabled: page === 0,
              className: "px-2 py-1 rounded border disabled:opacity-30",
              children: "‹"
            },
            void 0,
            false,
            {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 737,
              columnNumber: 15
            },
            this
          ),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => setPage(Math.min(totalPages - 1, page + 1)),
              disabled: page >= totalPages - 1,
              className: "px-2 py-1 rounded border disabled:opacity-30",
              children: "›"
            },
            void 0,
            false,
            {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 739,
              columnNumber: 15
            },
            this
          )
        ] }, void 0, true, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 736,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 734,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 679,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
    lineNumber: 641,
    columnNumber: 5
  }, this);
}
_s3(OverviewTab, "fqJ4LAq5Ubenscw5CJCrghuiLCs=");
_c1 = OverviewTab;
function KpiCard({ label, value, subtitle, accent }) {
  return /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-xl p-3", style: { border: "1px solid hsl(0,0%,90%)", borderLeft: `3px solid ${accent}` }, children: [
    /* @__PURE__ */ jsxDEV("p", { className: "text-[10px] uppercase font-bold text-gray-500 tracking-wide", children: label }, void 0, false, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 752,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "text-xl font-bold text-gray-800 mt-1", children: value }, void 0, false, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 753,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "text-[10px] text-gray-500 mt-0.5", children: subtitle }, void 0, false, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 754,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
    lineNumber: 751,
    columnNumber: 5
  }, this);
}
_c10 = KpiCard;
function TrajectoiresTab({ metadata }) {
  _s4();
  const [variable, setVariable] = useState("nv_primes");
  const [topN, setTopN] = useState(5);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    api.get("/predictions/axe2/trajectoires", {
      params: { variable, top_n: topN }
    }).then((r) => setData(r.data)).finally(() => setLoading(false));
  }, [variable, topN]);
  const chartData = useMemo(() => {
    if (!data) return [];
    const map = {};
    data.top_pays.forEach((p) => {
      const s = data.series[p];
      if (!s) return;
      s.historique.forEach((h) => {
        if (!map[h.annee]) map[h.annee] = { annee: h.annee };
        map[h.annee][`${p}_hist`] = h.valeur;
      });
      s.predictions.forEach((pp) => {
        if (!map[pp.annee]) map[pp.annee] = { annee: pp.annee };
        map[pp.annee][`${p}_pred`] = pp.valeur;
      });
      const h2024 = s.historique.find((h) => h.annee === 2024);
      if (h2024 && map[2024]) map[2024][`${p}_pred`] = h2024.valeur;
    });
    return Object.values(map).sort((a, b) => a.annee - b.annee);
  }, [data]);
  if (loading || !data) {
    return /* @__PURE__ */ jsxDEV("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxDEV(SkeletonChart, {}, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 805,
        columnNumber: 39
      }, this),
      /* @__PURE__ */ jsxDEV(SkeletonChart, {}, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 805,
        columnNumber: 56
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 805,
      columnNumber: 12
    }, this);
  }
  const meta = data.meta;
  const varOptions = metadata.all_vars.map((v) => ({ value: v, label: metadata.variables[v]?.label ?? v }));
  return /* @__PURE__ */ jsxDEV("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "bg-white rounded-xl p-3 flex items-center gap-3 flex-wrap",
        style: { border: "1px solid hsl(0,0%,90%)" },
        children: [
          /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-semibold text-gray-600", children: "Variable :" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 815,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("div", { style: { minWidth: 220 }, children: /* @__PURE__ */ jsxDEV(
            Select,
            {
              value: varOptions.find((o) => o.value === variable),
              onChange: (o) => setVariable(o.value),
              options: varOptions,
              styles: selectStyles
            },
            void 0,
            false,
            {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 817,
              columnNumber: 11
            },
            this
          ) }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 816,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-semibold text-gray-600 ml-2", children: "Top N :" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 824,
            columnNumber: 9
          }, this),
          [3, 5, 7, 10].map(
            (n) => /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => setTopN(n),
                className: "px-2.5 py-1 rounded text-[11px] font-semibold transition-colors",
                style: topN === n ? { background: OLIVE, color: "white" } : { background: "hsl(0,0%,93%)", color: "#6b7280" },
                children: n
              },
              n,
              false,
              {
                fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                lineNumber: 826,
                columnNumber: 9
              },
              this
            )
          )
        ]
      },
      void 0,
      true,
      {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 813,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-xl p-4", style: { border: "1px solid hsl(0,0%,90%)" }, children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-start justify-between flex-wrap gap-2 mb-3", children: [
        /* @__PURE__ */ jsxDEV(SectionTitle, { children: [
          meta.label,
          " — Top ",
          topN,
          " pays · 2015–2030"
        ] }, void 0, true, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 836,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(ModelBadge, { modele: meta.modele }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 837,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 835,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(ResponsiveContainer, { width: "100%", height: 420, children: /* @__PURE__ */ jsxDEV(ComposedChart, { data: chartData, margin: { top: 10, right: 20, left: 0, bottom: 0 }, children: [
        /* @__PURE__ */ jsxDEV(CartesianGrid, { strokeDasharray: "3 3", stroke: "hsl(0,0%,93%)" }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 841,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(XAxis, { dataKey: "annee", tick: { fontSize: 10 } }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 842,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(YAxis, { tick: { fontSize: 10 }, tickFormatter: (v) => formatByUnite(v, meta.unite) }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 843,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(
          Tooltip,
          {
            content: ({ payload, label }) => {
              if (!payload || !payload.length) return null;
              return /* @__PURE__ */ jsxDEV(
                "div",
                {
                  className: "bg-white px-3 py-2 rounded shadow text-xs",
                  style: { border: "1px solid hsl(0,0%,85%)" },
                  children: [
                    /* @__PURE__ */ jsxDEV("div", { className: "font-bold text-gray-800 mb-1", children: label }, void 0, false, {
                      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                      lineNumber: 850,
                      columnNumber: 21
                    }, this),
                    data.top_pays.map((p, i) => {
                      const d = payload[0].payload;
                      const v = d[`${p}_pred`] ?? d[`${p}_hist`];
                      if (v == null) return null;
                      return /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5", children: [
                        /* @__PURE__ */ jsxDEV("span", { className: "inline-block w-2 h-2 rounded-full", style: { background: TOP_COLORS[i] } }, void 0, false, {
                          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                          lineNumber: 857,
                          columnNumber: 27
                        }, this),
                        /* @__PURE__ */ jsxDEV("span", { className: "text-gray-700", children: [
                          p,
                          " :"
                        ] }, void 0, true, {
                          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                          lineNumber: 858,
                          columnNumber: 27
                        }, this),
                        /* @__PURE__ */ jsxDEV("strong", { children: formatByUnite(v, meta.unite) }, void 0, false, {
                          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                          lineNumber: 859,
                          columnNumber: 27
                        }, this)
                      ] }, p, true, {
                        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                        lineNumber: 856,
                        columnNumber: 25
                      }, this);
                    })
                  ]
                },
                void 0,
                true,
                {
                  fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                  lineNumber: 848,
                  columnNumber: 19
                },
                this
              );
            }
          },
          void 0,
          false,
          {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 844,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(ReferenceLine, { x: 2024, stroke: "hsl(0,0%,60%)", strokeDasharray: "4 3", label: { value: "2024", fontSize: 10, fill: "#888" } }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 867,
          columnNumber: 13
        }, this),
        data.top_pays.map(
          (p, i) => /* @__PURE__ */ jsxDEV(
            Line,
            {
              type: "monotone",
              dataKey: `${p}_hist`,
              stroke: TOP_COLORS[i],
              strokeWidth: 2,
              dot: { r: 2 },
              legendType: "none"
            },
            `${p}_hist`,
            false,
            {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 869,
              columnNumber: 13
            },
            this
          )
        ),
        data.top_pays.map(
          (p, i) => /* @__PURE__ */ jsxDEV(
            Line,
            {
              type: "monotone",
              dataKey: `${p}_pred`,
              stroke: TOP_COLORS[i],
              strokeWidth: 2,
              strokeDasharray: "6 3",
              dot: { r: 2 },
              name: p
            },
            `${p}_pred`,
            false,
            {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 873,
              columnNumber: 13
            },
            this
          )
        )
      ] }, void 0, true, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 840,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 839,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 834,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-xl p-4", style: { border: "1px solid hsl(0,0%,90%)" }, children: [
      /* @__PURE__ */ jsxDEV(SectionTitle, { children: "Profil 2030 — 6 dimensions normalisées" }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 881,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(ResponsiveContainer, { width: "100%", height: 400, children: /* @__PURE__ */ jsxDEV(RadarChart, { data: data.radar, children: [
        /* @__PURE__ */ jsxDEV(PolarGrid, { stroke: "hsl(0,0%,88%)" }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 884,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(PolarAngleAxis, { dataKey: "label", tick: { fontSize: 11 } }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 885,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(PolarRadiusAxis, { angle: 90, domain: [0, 100], tick: { fontSize: 9 } }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 886,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(Tooltip, {}, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 887,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(Legend, { wrapperStyle: { fontSize: 11 } }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 888,
          columnNumber: 13
        }, this),
        data.top_pays.map(
          (p, i) => /* @__PURE__ */ jsxDEV(
            Radar,
            {
              name: p,
              dataKey: p,
              stroke: TOP_COLORS[i],
              fill: TOP_COLORS[i],
              fillOpacity: 0.1,
              strokeWidth: 2
            },
            p,
            false,
            {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 890,
              columnNumber: 13
            },
            this
          )
        )
      ] }, void 0, true, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 883,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 882,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 880,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-xl p-4", style: { border: "1px solid hsl(0,0%,90%)" }, children: [
      /* @__PURE__ */ jsxDEV(SectionTitle, { children: [
        "🎯 Insights ",
        meta.label,
        " 2030"
      ] }, void 0, true, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 898,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3 mt-3", children: [
        /* @__PURE__ */ jsxDEV(InsightCard, { title: "Leader 2030", value: data.top_pays[0] ?? "—", accent: GREEN }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 900,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(InsightCard, { title: `Top ${topN}`, value: data.top_pays.join(" · "), accent: NAVY, small: true }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 901,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(InsightCard, { title: "Modèle", value: MODEL_LABEL[meta.modele] ?? meta.modele, accent: OLIVE, small: true }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 902,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 899,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 897,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
    lineNumber: 812,
    columnNumber: 5
  }, this);
}
_s4(TrajectoiresTab, "bY6zgA2WnQBU0HsNiqo7l0Om5rY=");
_c11 = TrajectoiresTab;
function InsightCard({ title, value, accent, small }) {
  return /* @__PURE__ */ jsxDEV("div", { className: "rounded-lg p-3", style: { background: `${accent}15`, border: `1px solid ${accent}30` }, children: [
    /* @__PURE__ */ jsxDEV("p", { className: "text-[10px] uppercase font-bold tracking-wide", style: { color: accent }, children: title }, void 0, false, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 912,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: `font-bold text-gray-800 mt-1 ${small ? "text-sm" : "text-lg"}`, children: value }, void 0, false, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 913,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
    lineNumber: 911,
    columnNumber: 5
  }, this);
}
_c12 = InsightCard;
function PaysTab({
  metadata,
  validation,
  setValidation
}) {
  _s5();
  const [pays, setPays] = useState(metadata.pays.includes("Maroc") ? "Maroc" : metadata.pays[0]);
  const [dimension, setDimension] = useState("all");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    setLoading(true);
    api.get(`/predictions/axe2/pays/${encodeURIComponent(pays)}`).then((r) => setData(r.data)).finally(() => setLoading(false));
  }, [pays]);
  const paysOptions = metadata.pays_with_region.map((p) => ({
    value: p.pays,
    label: p.pays,
    region: p.region
  }));
  const dims = [
    { id: "all", label: "Tout" },
    { id: "non_vie", label: "Non-Vie" },
    { id: "vie", label: "Vie" },
    { id: "macro", label: "Macro" },
    { id: "gouvernance", label: "Gouvernance" }
  ];
  const filteredVars = useMemo(() => {
    if (!data) return [];
    return Object.values(data.variables).filter(
      (v) => dimension === "all" || v.dimension === dimension
    );
  }, [data, dimension]);
  async function refresh() {
    setRefreshing(true);
    try {
      await api.get("/predictions/axe2/refresh");
      const v = await api.get("/predictions/axe2/validation");
      setValidation(v.data);
      const d = await api.get(`/predictions/axe2/pays/${encodeURIComponent(pays)}`);
      setData(d.data);
    } finally {
      setRefreshing(false);
    }
  }
  return /* @__PURE__ */ jsxDEV("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "bg-white rounded-xl p-3 flex items-center gap-3 flex-wrap",
        style: { border: "1px solid hsl(0,0%,90%)" },
        children: [
          /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-semibold text-gray-600", children: "Pays :" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 983,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("div", { style: { minWidth: 240 }, children: /* @__PURE__ */ jsxDEV(
            Select,
            {
              value: paysOptions.find((o) => o.value === pays),
              onChange: (o) => setPays(o.value),
              options: paysOptions,
              styles: selectStyles,
              formatOptionLabel: (o) => /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxDEV(
                  "span",
                  {
                    className: "inline-block w-2 h-2 rounded-full",
                    style: { background: REGION_COLORS[o.region] ?? GRAY }
                  },
                  void 0,
                  false,
                  {
                    fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                    lineNumber: 992,
                    columnNumber: 17
                  },
                  this
                ),
                /* @__PURE__ */ jsxDEV("span", { children: o.label }, void 0, false, {
                  fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                  lineNumber: 994,
                  columnNumber: 17
                }, this)
              ] }, void 0, true, {
                fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                lineNumber: 991,
                columnNumber: 13
              }, this)
            },
            void 0,
            false,
            {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 985,
              columnNumber: 11
            },
            this
          ) }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 984,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "ml-2 flex items-center gap-1 flex-wrap", children: dims.map(
            (d) => /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => setDimension(d.id),
                className: "px-2.5 py-1 rounded text-[11px] font-semibold transition-colors",
                style: dimension === d.id ? { background: OLIVE, color: "white" } : { background: "hsl(0,0%,93%)", color: "#6b7280" },
                children: d.label
              },
              d.id,
              false,
              {
                fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                lineNumber: 1001,
                columnNumber: 11
              },
              this
            )
          ) }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 999,
            columnNumber: 9
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 981,
        columnNumber: 7
      },
      this
    ),
    loading || !data ? /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [...Array(4)].map((_, i) => /* @__PURE__ */ jsxDEV(SkeletonChart, {}, i, false, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 1012,
      columnNumber: 40
    }, this)) }, void 0, false, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 1011,
      columnNumber: 7
    }, this) : /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: filteredVars.map(
      (v) => /* @__PURE__ */ jsxDEV(
        PredChart,
        {
          variable: v.variable,
          label: v.label,
          unite: v.unite,
          historique: v.historique,
          predictions: v.predictions,
          modele: v.modele,
          r2: v.r2_walforward,
          mape: v.mape,
          axcoBlended: v.axco_blended,
          height: 220
        },
        v.variable,
        false,
        {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1017,
          columnNumber: 9
        },
        this
      )
    ) }, void 0, false, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 1015,
      columnNumber: 7
    }, this),
    validation && /* @__PURE__ */ jsxDEV(ValidationPanel, { validation, onRefresh: refresh, refreshing }, void 0, false, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 1035,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
    lineNumber: 980,
    columnNumber: 5
  }, this);
}
_s5(PaysTab, "B1ygG1dKZWnSkA8zUVtpuwCqVOY=");
_c13 = PaysTab;
function ValidationPanel({
  validation,
  onRefresh,
  refreshing
}) {
  _s6();
  const [open, setOpen] = useState(true);
  return /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-xl", style: { border: "1px solid hsl(0,0%,90%)" }, children: [
    /* @__PURE__ */ jsxDEV(
      "button",
      {
        onClick: () => setOpen(!open),
        className: "w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50",
        children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxDEV(Activity, { size: 16, style: { color: OLIVE } }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1051,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "font-bold text-sm text-gray-800", children: "🔬 Qualité du Modèle" }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1052,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] text-gray-500", children: [
              "(",
              validation.elapsed_seconds,
              "s · ",
              Object.keys(validation.variables).length,
              " variables)"
            ] }, void 0, true, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1053,
              columnNumber: 11
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1050,
            columnNumber: 9
          }, this),
          open ? /* @__PURE__ */ jsxDEV(ChevronUp, { size: 16 }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1057,
            columnNumber: 17
          }, this) : /* @__PURE__ */ jsxDEV(ChevronDown, { size: 16 }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1057,
            columnNumber: 43
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 1048,
        columnNumber: 7
      },
      this
    ),
    open && /* @__PURE__ */ jsxDEV("div", { className: "px-4 pb-4 space-y-3", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxDEV("table", { className: "w-full text-xs", children: [
        /* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", { className: "border-b-2", style: { borderColor: OLIVE_15 }, children: [
          /* @__PURE__ */ jsxDEV("th", { className: "text-left py-2 px-2", children: "Variable" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1066,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "text-left py-2 px-2", children: "Modèle" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1067,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "text-right py-2 px-2", children: "R²" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1068,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "text-right py-2 px-2", children: "MAPE" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1069,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "text-right py-2 px-2", children: "MAE" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1070,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "text-right py-2 px-2", children: "q80" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1071,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "text-right py-2 px-2", children: "q95" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1072,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "text-center py-2 px-2", children: "Source" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1073,
            columnNumber: 19
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1065,
          columnNumber: 17
        }, this) }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1064,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("tbody", { children: Object.entries(validation.variables).map(
          ([k, m]) => /* @__PURE__ */ jsxDEV("tr", { className: "border-b", style: { borderColor: "hsl(0,0%,95%)" }, children: [
            /* @__PURE__ */ jsxDEV("td", { className: "py-1.5 px-2 font-semibold", children: m.label }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1079,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "py-1.5 px-2", children: /* @__PURE__ */ jsxDEV(ModelBadge, { modele: m.modele }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1080,
              columnNumber: 49
            }, this) }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1080,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "py-1.5 px-2 text-right font-mono", children: fmtR2(m.r2_mean) }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1081,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "py-1.5 px-2 text-right font-mono", children: m.mape_mean != null ? fmtPct(m.mape_mean, 1) : "—" }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1082,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "py-1.5 px-2 text-right font-mono", children: fmtNum(m.mae, 3) }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1083,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "py-1.5 px-2 text-right font-mono", children: fmtNum(m.q80, 3) }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1084,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "py-1.5 px-2 text-right font-mono", children: fmtNum(m.q95, 3) }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1085,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "py-1.5 px-2 text-center text-[10px]", children: validation.axco_loaded && (k === "gdp_growth" || k === "gdpcap") ? /* @__PURE__ */ jsxDEV("span", { style: { color: GREEN }, children: "✓ Axco" }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1088,
              columnNumber: 19
            }, this) : /* @__PURE__ */ jsxDEV("span", { className: "text-gray-400", children: "ML pur" }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1089,
              columnNumber: 19
            }, this) }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1086,
              columnNumber: 21
            }, this)
          ] }, k, true, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1078,
            columnNumber: 15
          }, this)
        ) }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1076,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 1063,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 1062,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3 mt-2", children: [
        /* @__PURE__ */ jsxDEV(
          CoherenceCard,
          {
            ok: validation.coherence_tests.bounds_ok,
            label: "Bornes absolues",
            desc: `${validation.coherence_tests.alerts_count} violation(s)`
          },
          void 0,
          false,
          {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1098,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          CoherenceCard,
          {
            ok: validation.coherence_tests.ic_ok,
            label: "Cohérence IC",
            desc: "ic_lower ≤ valeur ≤ ic_upper"
          },
          void 0,
          false,
          {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1103,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          CoherenceCard,
          {
            ok: validation.coherence_tests.axco_alignment != null,
            label: "Alignement Axco",
            desc: validation.coherence_tests.axco_alignment ? `MAE gdp=${fmtNum(validation.coherence_tests.axco_alignment.mae_gdp_growth, 2)} · gdpcap=${fmtNum(validation.coherence_tests.axco_alignment.mae_gdpcap, 0)}$` : "Axco non disponible",
            warning: !validation.axco_loaded
          },
          void 0,
          false,
          {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1108,
            columnNumber: 13
          },
          this
        )
      ] }, void 0, true, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 1097,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: onRefresh,
          disabled: refreshing,
          className: "px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all",
          style: { background: OLIVE, color: "white", opacity: refreshing ? 0.6 : 1 },
          children: [
            /* @__PURE__ */ jsxDEV(RefreshCw, { size: 14, className: refreshing ? "animate-spin" : "" }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1121,
              columnNumber: 13
            }, this),
            refreshing ? "Recalcul en cours…" : "Recalculer le modèle"
          ]
        },
        void 0,
        true,
        {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1118,
          columnNumber: 11
        },
        this
      )
    ] }, void 0, true, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 1061,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
    lineNumber: 1047,
    columnNumber: 5
  }, this);
}
_s6(ValidationPanel, "dVkDIfRb5RN4FjtonjBYYwpg89o=");
_c14 = ValidationPanel;
function CoherenceCard({
  ok,
  label,
  desc,
  warning
}) {
  const Icon = warning ? AlertTriangle : ok ? CheckCircle2 : AlertTriangle;
  const color = warning ? ORANGE : ok ? GREEN : RED;
  return /* @__PURE__ */ jsxDEV("div", { className: "rounded-lg p-2.5", style: { background: `${color}10`, border: `1px solid ${color}30` }, children: [
    /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5", children: [
      /* @__PURE__ */ jsxDEV(Icon, { size: 14, style: { color } }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 1138,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-bold", style: { color }, children: label }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 1139,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 1137,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "text-[10px] text-gray-600 mt-1", children: desc }, void 0, false, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 1141,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
    lineNumber: 1136,
    columnNumber: 5
  }, this);
}
_c15 = CoherenceCard;
function VariableTab({ metadata }) {
  _s7();
  const [variable, setVariable] = useState("nv_penetration");
  const [horizon, setHorizon] = useState(2030);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    api.get(`/predictions/axe2/variable/${variable}`, { params: { horizon } }).then((r) => setData(r.data)).finally(() => setLoading(false));
  }, [variable, horizon]);
  const varOptions = metadata.all_vars.map((v) => ({ value: v, label: metadata.variables[v]?.label ?? v }));
  const chartData = useMemo(() => {
    if (!data) return [];
    const top5 = data.classement.slice(0, 5).map((r) => r.pays);
    const map = {};
    top5.forEach((p) => {
      const s = data.top_series[p];
      if (!s) return;
      s.historique.forEach((h) => {
        if (!map[h.annee]) map[h.annee] = { annee: h.annee };
        map[h.annee][`${p}_hist`] = h.valeur;
      });
      s.predictions.forEach((pp) => {
        if (!map[pp.annee]) map[pp.annee] = { annee: pp.annee };
        map[pp.annee][`${p}_pred`] = pp.valeur;
      });
      const h2024 = s.historique.find((h) => h.annee === 2024);
      if (h2024 && map[2024]) map[2024][`${p}_pred`] = h2024.valeur;
    });
    return Object.values(map).sort((a, b) => a.annee - b.annee);
  }, [data]);
  const top5Pays = data?.classement.slice(0, 5).map((r) => r.pays) ?? [];
  if (loading || !data) return /* @__PURE__ */ jsxDEV("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxDEV(SkeletonChart, {}, void 0, false, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 1204,
      columnNumber: 59
    }, this),
    /* @__PURE__ */ jsxDEV(SkeletonChart, {}, void 0, false, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 1204,
      columnNumber: 76
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
    lineNumber: 1204,
    columnNumber: 32
  }, this);
  return /* @__PURE__ */ jsxDEV("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "bg-white rounded-xl p-3 flex items-center gap-3 flex-wrap",
        style: { border: "1px solid hsl(0,0%,90%)" },
        children: [
          /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-semibold text-gray-600", children: "Variable :" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1210,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("div", { style: { minWidth: 220 }, children: /* @__PURE__ */ jsxDEV(
            Select,
            {
              value: varOptions.find((o) => o.value === variable),
              onChange: (o) => setVariable(o.value),
              options: varOptions,
              styles: selectStyles
            },
            void 0,
            false,
            {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1212,
              columnNumber: 11
            },
            this
          ) }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1211,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-semibold text-gray-600 ml-2", children: "Horizon :" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1219,
            columnNumber: 9
          }, this),
          [2025, 2027, 2030].map(
            (h) => /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => setHorizon(h),
                className: "px-3 py-1 rounded-full text-[11px] font-semibold transition-colors",
                style: horizon === h ? { background: OLIVE, color: "white" } : { background: "hsl(0,0%,93%)", color: "#6b7280" },
                children: h
              },
              h,
              false,
              {
                fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                lineNumber: 1221,
                columnNumber: 9
              },
              this
            )
          )
        ]
      },
      void 0,
      true,
      {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 1208,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-xl p-4", style: { border: "1px solid hsl(0,0%,90%)" }, children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between flex-wrap gap-2 mb-2", children: [
        /* @__PURE__ */ jsxDEV(SectionTitle, { children: [
          data.meta.label,
          " — Top 5 pays · ",
          horizon
        ] }, void 0, true, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1231,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxDEV(ModelBadge, { modele: data.meta.modele }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1233,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] font-mono text-gray-600", children: [
            "R²=",
            fmtR2(data.meta.r2_walforward)
          ] }, void 0, true, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1234,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1232,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 1230,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(ResponsiveContainer, { width: "100%", height: 360, children: /* @__PURE__ */ jsxDEV(LineChart, { data: chartData, margin: { top: 10, right: 20, left: 0, bottom: 0 }, children: [
        /* @__PURE__ */ jsxDEV(CartesianGrid, { strokeDasharray: "3 3", stroke: "hsl(0,0%,93%)" }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1239,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(XAxis, { dataKey: "annee", tick: { fontSize: 10 } }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1240,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(YAxis, { tick: { fontSize: 10 }, tickFormatter: (v) => formatByUnite(v, data.meta.unite) }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1241,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(
          Tooltip,
          {
            content: ({ payload, label }) => {
              if (!payload || !payload.length) return null;
              return /* @__PURE__ */ jsxDEV(
                "div",
                {
                  className: "bg-white px-3 py-2 rounded shadow text-xs",
                  style: { border: "1px solid hsl(0,0%,85%)" },
                  children: [
                    /* @__PURE__ */ jsxDEV("div", { className: "font-bold text-gray-800 mb-1", children: label }, void 0, false, {
                      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                      lineNumber: 1248,
                      columnNumber: 21
                    }, this),
                    top5Pays.map((p, i) => {
                      const d = payload[0].payload;
                      const v = d[`${p}_pred`] ?? d[`${p}_hist`];
                      if (v == null) return null;
                      return /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5", children: [
                        /* @__PURE__ */ jsxDEV("span", { className: "inline-block w-2 h-2 rounded-full", style: { background: TOP_COLORS[i] } }, void 0, false, {
                          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                          lineNumber: 1255,
                          columnNumber: 27
                        }, this),
                        /* @__PURE__ */ jsxDEV("span", { children: [
                          p,
                          " : ",
                          /* @__PURE__ */ jsxDEV("strong", { children: formatByUnite(v, data.meta.unite) }, void 0, false, {
                            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                            lineNumber: 1256,
                            columnNumber: 39
                          }, this)
                        ] }, void 0, true, {
                          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                          lineNumber: 1256,
                          columnNumber: 27
                        }, this)
                      ] }, p, true, {
                        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                        lineNumber: 1254,
                        columnNumber: 25
                      }, this);
                    })
                  ]
                },
                void 0,
                true,
                {
                  fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                  lineNumber: 1246,
                  columnNumber: 19
                },
                this
              );
            }
          },
          void 0,
          false,
          {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1242,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(ReferenceLine, { x: 2024, stroke: "hsl(0,0%,60%)", strokeDasharray: "4 3" }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1264,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(Legend, { wrapperStyle: { fontSize: 11 } }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1265,
          columnNumber: 13
        }, this),
        top5Pays.map(
          (p, i) => /* @__PURE__ */ jsxDEV(
            Line,
            {
              type: "monotone",
              dataKey: `${p}_hist`,
              stroke: TOP_COLORS[i],
              strokeWidth: 2,
              dot: { r: 2 },
              legendType: "none"
            },
            `${p}_hist`,
            false,
            {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1267,
              columnNumber: 13
            },
            this
          )
        ),
        top5Pays.map(
          (p, i) => /* @__PURE__ */ jsxDEV(
            Line,
            {
              type: "monotone",
              dataKey: `${p}_pred`,
              stroke: TOP_COLORS[i],
              strokeWidth: 2,
              strokeDasharray: "6 3",
              dot: { r: 2 },
              name: p
            },
            `${p}_pred`,
            false,
            {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1271,
              columnNumber: 13
            },
            this
          )
        )
      ] }, void 0, true, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 1238,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 1237,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 1229,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-xl p-4", style: { border: "1px solid hsl(0,0%,90%)" }, children: [
      /* @__PURE__ */ jsxDEV(SectionTitle, { children: [
        "Classement ",
        data.classement.length,
        " pays — ",
        data.meta.label,
        " ",
        horizon
      ] }, void 0, true, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 1279,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "overflow-x-auto mt-3", children: /* @__PURE__ */ jsxDEV("table", { className: "w-full text-xs", children: [
        /* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", { className: "border-b-2", style: { borderColor: OLIVE_15 }, children: [
          /* @__PURE__ */ jsxDEV("th", { className: "text-left py-2 px-2 w-8", children: "#" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1284,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "text-left py-2 px-2", children: "Pays" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1285,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "text-left py-2 px-2", children: "Région" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1286,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "text-right py-2 px-2", children: "2024" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1287,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "text-right py-2 px-2", children: horizon }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1288,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "text-right py-2 px-2", children: "Variation" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1289,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "text-right py-2 px-2", children: "IC 95%" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1290,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1283,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1282,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("tbody", { children: data.classement.map(
          (r) => /* @__PURE__ */ jsxDEV("tr", { className: "border-b hover:bg-gray-50", style: { borderColor: "hsl(0,0%,95%)" }, children: [
            /* @__PURE__ */ jsxDEV("td", { className: "py-1.5 px-2 font-mono text-gray-500", children: r.rang }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1296,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "py-1.5 px-2 font-semibold", children: r.pays }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1297,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "py-1.5 px-2", children: [
              /* @__PURE__ */ jsxDEV(
                "span",
                {
                  className: "inline-block w-2 h-2 rounded-full mr-1.5",
                  style: { background: REGION_COLORS[r.region] ?? GRAY }
                },
                void 0,
                false,
                {
                  fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                  lineNumber: 1299,
                  columnNumber: 21
                },
                this
              ),
              /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] text-gray-600", children: r.region }, void 0, false, {
                fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                lineNumber: 1301,
                columnNumber: 21
              }, this)
            ] }, void 0, true, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1298,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "py-1.5 px-2 text-right font-mono", children: formatByUnite(r.valeur_2024, data.meta.unite) }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1303,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "py-1.5 px-2 text-right font-mono font-semibold", children: formatByUnite(r.valeur_horizon, data.meta.unite) }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1304,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "py-1.5 px-2 text-right", children: /* @__PURE__ */ jsxDEV(DeltaBadge, { v: r.variation_pct, sensFavorable: data.meta.sens_favorable }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1306,
              columnNumber: 21
            }, this) }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1305,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "py-1.5 px-2 text-right font-mono text-[10px] text-gray-600", children: [
              "[",
              formatByUnite(r.ic_lower, data.meta.unite),
              " ; ",
              formatByUnite(r.ic_upper, data.meta.unite),
              "]"
            ] }, void 0, true, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1308,
              columnNumber: 19
            }, this)
          ] }, r.pays, true, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1295,
            columnNumber: 15
          }, this)
        ) }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1293,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 1281,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 1280,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 1278,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
    lineNumber: 1207,
    columnNumber: 5
  }, this);
}
_s7(VariableTab, "czu4O/Jm069eM7ZK/ccxLUawbgY=");
_c16 = VariableTab;
function ComparaisonTab({ metadata }) {
  _s8();
  const [paysA, setPaysA] = useState(metadata.pays.includes("Maroc") ? "Maroc" : metadata.pays[0]);
  const [paysB, setPaysB] = useState(metadata.pays.includes("Égypte") ? "Égypte" : metadata.pays[1]);
  const [variable, setVariable] = useState("nv_primes");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (paysA === paysB) return;
    setLoading(true);
    api.get("/predictions/axe2/comparaison", {
      params: { pays_a: paysA, pays_b: paysB, variable }
    }).then((r) => setData(r.data)).finally(() => setLoading(false));
  }, [paysA, paysB, variable]);
  const paysOptions = metadata.pays_with_region.map((p) => ({ value: p.pays, label: p.pays, region: p.region }));
  const varOptions = metadata.all_vars.map((v) => ({ value: v, label: metadata.variables[v]?.label ?? v }));
  const chartData = useMemo(() => {
    if (!data) return [];
    const map = {};
    const sa = data.pays_a.data;
    const sb = data.pays_b.data;
    sa.historique.forEach((h) => {
      map[h.annee] = { ...map[h.annee] ?? { annee: h.annee }, a_hist: h.valeur };
    });
    sa.predictions.forEach((p) => {
      map[p.annee] = { ...map[p.annee] ?? { annee: p.annee }, a_pred: p.valeur, a_lo: p.ic_lower, a_hi: p.ic_upper };
    });
    sb.historique.forEach((h) => {
      map[h.annee] = { ...map[h.annee] ?? { annee: h.annee }, b_hist: h.valeur };
    });
    sb.predictions.forEach((p) => {
      map[p.annee] = { ...map[p.annee] ?? { annee: p.annee }, b_pred: p.valeur, b_lo: p.ic_lower, b_hi: p.ic_upper };
    });
    if (map[2024]) {
      map[2024].a_pred = map[2024].a_hist;
      map[2024].b_pred = map[2024].b_hist;
    }
    return Object.values(map).sort((a, b) => a.annee - b.annee);
  }, [data]);
  if (loading || !data) return /* @__PURE__ */ jsxDEV("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxDEV(SkeletonChart, {}, void 0, false, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 1379,
      columnNumber: 59
    }, this),
    /* @__PURE__ */ jsxDEV(SkeletonChart, {}, void 0, false, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 1379,
      columnNumber: 76
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
    lineNumber: 1379,
    columnNumber: 32
  }, this);
  return /* @__PURE__ */ jsxDEV("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "bg-white rounded-xl p-3 flex items-center gap-3 flex-wrap",
        style: { border: "1px solid hsl(0,0%,90%)" },
        children: [
          /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-semibold text-gray-600", children: "Pays A :" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1385,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("div", { style: { minWidth: 200 }, children: /* @__PURE__ */ jsxDEV(
            Select,
            {
              value: paysOptions.find((o) => o.value === paysA),
              onChange: (o) => setPaysA(o.value),
              options: paysOptions.filter((o) => o.value !== paysB),
              styles: selectStyles
            },
            void 0,
            false,
            {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1387,
              columnNumber: 11
            },
            this
          ) }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1386,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-semibold text-gray-600 ml-2", children: "Pays B :" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1394,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("div", { style: { minWidth: 200 }, children: /* @__PURE__ */ jsxDEV(
            Select,
            {
              value: paysOptions.find((o) => o.value === paysB),
              onChange: (o) => setPaysB(o.value),
              options: paysOptions.filter((o) => o.value !== paysA),
              styles: selectStyles
            },
            void 0,
            false,
            {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1396,
              columnNumber: 11
            },
            this
          ) }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1395,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-semibold text-gray-600 ml-2", children: "Variable :" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1403,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("div", { style: { minWidth: 220 }, children: /* @__PURE__ */ jsxDEV(
            Select,
            {
              value: varOptions.find((o) => o.value === variable),
              onChange: (o) => setVariable(o.value),
              options: varOptions,
              styles: selectStyles
            },
            void 0,
            false,
            {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1405,
              columnNumber: 11
            },
            this
          ) }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1404,
            columnNumber: 9
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 1383,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-xl p-4", style: { border: "1px solid hsl(0,0%,90%)" }, children: [
      /* @__PURE__ */ jsxDEV(SectionTitle, { children: [
        data.meta.label,
        " — ",
        paysA,
        " vs ",
        paysB
      ] }, void 0, true, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 1415,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(ResponsiveContainer, { width: "100%", height: 360, children: /* @__PURE__ */ jsxDEV(ComposedChart, { data: chartData, margin: { top: 10, right: 20, left: 0, bottom: 0 }, children: [
        /* @__PURE__ */ jsxDEV(CartesianGrid, { strokeDasharray: "3 3", stroke: "hsl(0,0%,93%)" }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1418,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(XAxis, { dataKey: "annee", tick: { fontSize: 10 } }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1419,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(YAxis, { tick: { fontSize: 10 }, tickFormatter: (v) => formatByUnite(v, data.meta.unite) }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1420,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(
          Tooltip,
          {
            content: ({ payload, label }) => {
              if (!payload || !payload.length) return null;
              const d = payload[0].payload;
              return /* @__PURE__ */ jsxDEV(
                "div",
                {
                  className: "bg-white px-3 py-2 rounded shadow text-xs",
                  style: { border: "1px solid hsl(0,0%,85%)" },
                  children: [
                    /* @__PURE__ */ jsxDEV("div", { className: "font-bold text-gray-800 mb-1", children: label }, void 0, false, {
                      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                      lineNumber: 1428,
                      columnNumber: 21
                    }, this),
                    /* @__PURE__ */ jsxDEV("div", { style: { color: OLIVE }, children: [
                      paysA,
                      " : ",
                      /* @__PURE__ */ jsxDEV("strong", { children: formatByUnite(d.a_pred ?? d.a_hist, data.meta.unite) }, void 0, false, {
                        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                        lineNumber: 1429,
                        columnNumber: 61
                      }, this)
                    ] }, void 0, true, {
                      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                      lineNumber: 1429,
                      columnNumber: 21
                    }, this),
                    /* @__PURE__ */ jsxDEV("div", { style: { color: NAVY }, children: [
                      paysB,
                      " : ",
                      /* @__PURE__ */ jsxDEV("strong", { children: formatByUnite(d.b_pred ?? d.b_hist, data.meta.unite) }, void 0, false, {
                        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                        lineNumber: 1430,
                        columnNumber: 60
                      }, this)
                    ] }, void 0, true, {
                      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                      lineNumber: 1430,
                      columnNumber: 21
                    }, this)
                  ]
                },
                void 0,
                true,
                {
                  fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                  lineNumber: 1426,
                  columnNumber: 19
                },
                this
              );
            }
          },
          void 0,
          false,
          {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1421,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(Area, { type: "monotone", dataKey: "a_hi", stroke: "none", fill: OLIVE, fillOpacity: 0.08 }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1435,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(Area, { type: "monotone", dataKey: "a_lo", stroke: "none", fill: "#fff", fillOpacity: 1 }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1436,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(Area, { type: "monotone", dataKey: "b_hi", stroke: "none", fill: NAVY, fillOpacity: 0.08 }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1437,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(Area, { type: "monotone", dataKey: "b_lo", stroke: "none", fill: "#fff", fillOpacity: 1 }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1438,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(ReferenceLine, { x: 2024, stroke: "hsl(0,0%,60%)", strokeDasharray: "4 3" }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1439,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(Legend, { wrapperStyle: { fontSize: 11 } }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1440,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(Line, { type: "monotone", dataKey: "a_hist", stroke: OLIVE, strokeWidth: 2, dot: { r: 2 }, legendType: "none" }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1441,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(Line, { type: "monotone", dataKey: "a_pred", stroke: OLIVE, strokeWidth: 2, strokeDasharray: "6 3", dot: { r: 2 }, name: paysA }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1442,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(Line, { type: "monotone", dataKey: "b_hist", stroke: NAVY, strokeWidth: 2, dot: { r: 2 }, legendType: "none" }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1443,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(Line, { type: "monotone", dataKey: "b_pred", stroke: NAVY, strokeWidth: 2, strokeDasharray: "6 3", dot: { r: 2 }, name: paysB }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1444,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 1417,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 1416,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 1414,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-xl p-4", style: { border: "1px solid hsl(0,0%,90%)" }, children: [
      /* @__PURE__ */ jsxDEV(SectionTitle, { children: [
        "Tableau comparatif — Dimension ",
        data.meta.dimension
      ] }, void 0, true, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 1450,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "overflow-x-auto mt-2", children: /* @__PURE__ */ jsxDEV("table", { className: "w-full text-xs", children: [
        /* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", { className: "border-b-2", style: { borderColor: OLIVE_15 }, children: [
          /* @__PURE__ */ jsxDEV("th", { className: "text-left py-2 px-2", children: "Variable" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1455,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "text-right py-2 px-2", style: { color: OLIVE }, children: [
            paysA,
            " 2024"
          ] }, void 0, true, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1456,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "text-right py-2 px-2", style: { color: OLIVE }, children: [
            paysA,
            " 2030"
          ] }, void 0, true, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1457,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "text-right py-2 px-2", children: "Δ A" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1458,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "text-right py-2 px-2", style: { color: NAVY }, children: [
            paysB,
            " 2024"
          ] }, void 0, true, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1459,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "text-right py-2 px-2", style: { color: NAVY }, children: [
            paysB,
            " 2030"
          ] }, void 0, true, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1460,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "text-right py-2 px-2", children: "Δ B" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1461,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "text-center py-2 px-2", children: "Gagnant ✓" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1462,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1454,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1453,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("tbody", { children: data.tableau.map(
          (r) => /* @__PURE__ */ jsxDEV("tr", { className: "border-b", style: { borderColor: "hsl(0,0%,95%)" }, children: [
            /* @__PURE__ */ jsxDEV("td", { className: "py-1.5 px-2 font-semibold", children: r.label }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1468,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "py-1.5 px-2 text-right font-mono", children: formatByUnite(r.a_2024, r.unite) }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1469,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "py-1.5 px-2 text-right font-mono font-semibold", children: formatByUnite(r.a_2030, r.unite) }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1470,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "py-1.5 px-2 text-right", children: /* @__PURE__ */ jsxDEV(DeltaBadge, { v: r.a_delta_pct, sensFavorable: r.sens_favorable }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1471,
              columnNumber: 58
            }, this) }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1471,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "py-1.5 px-2 text-right font-mono", children: formatByUnite(r.b_2024, r.unite) }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1472,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "py-1.5 px-2 text-right font-mono font-semibold", children: formatByUnite(r.b_2030, r.unite) }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1473,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "py-1.5 px-2 text-right", children: /* @__PURE__ */ jsxDEV(DeltaBadge, { v: r.b_delta_pct, sensFavorable: r.sens_favorable }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1474,
              columnNumber: 58
            }, this) }, void 0, false, {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1474,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV(
              "td",
              {
                className: "py-1.5 px-2 text-center text-[10px] font-bold",
                style: { color: r.gagnant === paysA ? OLIVE : r.gagnant === paysB ? NAVY : "#999" },
                children: r.gagnant ?? "—"
              },
              void 0,
              false,
              {
                fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                lineNumber: 1475,
                columnNumber: 19
              },
              this
            )
          ] }, r.variable, true, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1467,
            columnNumber: 15
          }, this)
        ) }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1465,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 1452,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 1451,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 1449,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
    lineNumber: 1382,
    columnNumber: 5
  }, this);
}
_s8(ComparaisonTab, "HyblEkL9X4eP3iqQvQUTZa/mBX8=");
_c17 = ComparaisonTab;
function CarteTab({ metadata }) {
  _s9();
  const [variable, setVariable] = useState("nv_primes");
  const [horizon, setHorizon] = useState(2030);
  const [classement, setClassement] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1.2);
  useEffect(() => {
    setLoading(true);
    api.get(`/predictions/axe2/variable/${variable}`, { params: { horizon } }).then((r) => {
      setClassement(r.data.classement);
      setMeta(r.data.meta);
    }).finally(() => setLoading(false));
  }, [variable, horizon]);
  const valueByPays = useMemo(() => {
    const m = {};
    classement.forEach((r) => {
      m[r.pays] = r.valeur_horizon;
    });
    return m;
  }, [classement]);
  const minMax = useMemo(() => {
    const vals = Object.values(valueByPays).filter((v) => v != null && !isNaN(v));
    if (!vals.length) return { min: 0, max: 1 };
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [valueByPays]);
  const FR_TO_ISO3 = useMemo(() => {
    const m = {};
    Object.entries(ISO3_NAMES).forEach(([iso, fr]) => {
      m[fr] = iso;
    });
    m["Nigeria"] = "NGA";
    m["RDC"] = "COD";
    return m;
  }, []);
  const ISO3_TO_VALUE = useMemo(() => {
    const m = {};
    Object.entries(valueByPays).forEach(([fr, v]) => {
      const iso = FR_TO_ISO3[fr];
      if (iso) m[iso] = v;
    });
    return m;
  }, [valueByPays, FR_TO_ISO3]);
  const colorScale = useMemo(() => {
    if (variable === "nv_primes" || variable === "vie_primes" || variable === "gdp") return COLOR_SCALES_POSITIONED.primes;
    if (variable === "nv_sp") return COLOR_SCALES_POSITIONED.sp;
    if (variable === "nv_penetration" || variable === "vie_penetration") return COLOR_SCALES_POSITIONED.penetration;
    if (variable === "nv_densite" || variable === "vie_densite") return COLOR_SCALES_POSITIONED.densite;
    if (variable === "gdpcap") return COLOR_SCALES_POSITIONED.gdpCap;
    if (variable === "gdp_growth") return COLOR_SCALES_POSITIONED.croissance;
    if (variable === "polstab" || variable === "regqual") return COLOR_SCALES_POSITIONED.wgi;
    return COLOR_SCALES_POSITIONED.primes;
  }, [variable]);
  const varOptions = metadata.all_vars.map((v) => ({ value: v, label: metadata.variables[v]?.label ?? v }));
  function colorFor(iso) {
    const v = ISO3_TO_VALUE[iso];
    if (v == null || isNaN(v)) return "#d0d0d0";
    const t = (v - minMax.min) / Math.max(minMax.max - minMax.min, 1e-9);
    return interpolatePositioned(t, colorScale);
  }
  return /* @__PURE__ */ jsxDEV("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "bg-white rounded-xl p-3 flex items-center gap-3 flex-wrap",
        style: { border: "1px solid hsl(0,0%,90%)" },
        children: [
          /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-semibold text-gray-600", children: "Variable :" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1563,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("div", { style: { minWidth: 220 }, children: /* @__PURE__ */ jsxDEV(
            Select,
            {
              value: varOptions.find((o) => o.value === variable),
              onChange: (o) => setVariable(o.value),
              options: varOptions,
              styles: selectStyles
            },
            void 0,
            false,
            {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1565,
              columnNumber: 11
            },
            this
          ) }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1564,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-semibold text-gray-600 ml-2", children: "Horizon :" }, void 0, false, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1572,
            columnNumber: 9
          }, this),
          [2025, 2027, 2030].map(
            (h) => /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => setHorizon(h),
                className: "px-3 py-1 rounded-full text-[11px] font-semibold transition-colors",
                style: horizon === h ? { background: OLIVE, color: "white" } : { background: "hsl(0,0%,93%)", color: "#6b7280" },
                children: h
              },
              h,
              false,
              {
                fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                lineNumber: 1574,
                columnNumber: 9
              },
              this
            )
          ),
          /* @__PURE__ */ jsxDEV("div", { className: "ml-auto flex gap-1", children: [
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => setZoom(Math.max(0.6, zoom - 0.2)),
                className: "w-8 h-8 rounded border text-sm font-bold",
                children: "−"
              },
              void 0,
              false,
              {
                fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                lineNumber: 1581,
                columnNumber: 11
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => setZoom(Math.min(2.5, zoom + 0.2)),
                className: "w-8 h-8 rounded border text-sm font-bold",
                children: "+"
              },
              void 0,
              false,
              {
                fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                lineNumber: 1583,
                columnNumber: 11
              },
              this
            )
          ] }, void 0, true, {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1580,
            columnNumber: 9
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 1561,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-xl p-3", style: { border: "1px solid hsl(0,0%,90%)" }, children: [
      meta && /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between flex-wrap gap-2 mb-2", children: [
        /* @__PURE__ */ jsxDEV(SectionTitle, { children: [
          meta.label,
          " ",
          horizon,
          " — ",
          classement.length,
          " pays"
        ] }, void 0, true, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1591,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(ModelBadge, { modele: meta.modele }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1592,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 1590,
        columnNumber: 9
      }, this),
      loading ? /* @__PURE__ */ jsxDEV(SkeletonChart, {}, void 0, false, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 1595,
        columnNumber: 20
      }, this) : /* @__PURE__ */ jsxDEV("div", { style: { height: 560, position: "relative" }, children: [
        /* @__PURE__ */ jsxDEV(ComposableMap, { projection: "geoMercator", projectionConfig: { scale: 380 * zoom, center: [18, 4] }, children: /* @__PURE__ */ jsxDEV(ZoomableGroup, { zoom: 1, center: [18, 4], children: /* @__PURE__ */ jsxDEV(Geographies, { geography: GEO_URL, children: ({ geographies }) => geographies.filter((geo) => AFRICA_NUMERIC.has(Number(geo.id))).map((geo) => {
          const iso = NUMERIC_TO_ISO3[Number(geo.id)];
          const fill = iso ? colorFor(iso) : "#d0d0d0";
          const name = iso ? ISO3_NAMES[iso] : "Inconnu";
          const v = iso ? ISO3_TO_VALUE[iso] : null;
          return /* @__PURE__ */ jsxDEV(
            Geography,
            {
              geography: geo,
              fill,
              stroke: "#fff",
              strokeWidth: 0.5,
              style: {
                default: { outline: "none" },
                hover: { outline: "none", filter: "brightness(1.1)", cursor: "pointer" },
                pressed: { outline: "none" }
              },
              children: /* @__PURE__ */ jsxDEV("title", { children: [
                name,
                v != null ? `: ${formatByUnite(v, meta?.unite ?? "")}` : " (hors panel)"
              ] }, void 0, true, {
                fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                lineNumber: 1616,
                columnNumber: 29
              }, this)
            },
            geo.rsmKey,
            false,
            {
              fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
              lineNumber: 1609,
              columnNumber: 21
            },
            this
          );
        }) }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1599,
          columnNumber: 17
        }, this) }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1598,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
          lineNumber: 1597,
          columnNumber: 13
        }, this),
        meta && /* @__PURE__ */ jsxDEV(
          "div",
          {
            className: "absolute bottom-3 left-3 bg-white rounded-lg p-3 text-xs shadow",
            style: { border: "1px solid hsl(0,0%,85%)" },
            children: [
              /* @__PURE__ */ jsxDEV("div", { className: "font-bold text-gray-700 mb-1", children: meta.label }, void 0, false, {
                fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                lineNumber: 1628,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxDEV("span", { className: "font-mono text-[10px]", children: formatByUnite(minMax.min, meta.unite) }, void 0, false, {
                  fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                  lineNumber: 1630,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ jsxDEV(
                  "div",
                  {
                    className: "h-3 w-32 rounded",
                    style: {
                      background: `linear-gradient(to right, ${colorScale.map((s) => s[1]).join(",")})`
                    }
                  },
                  void 0,
                  false,
                  {
                    fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                    lineNumber: 1631,
                    columnNumber: 19
                  },
                  this
                ),
                /* @__PURE__ */ jsxDEV("span", { className: "font-mono text-[10px]", children: formatByUnite(minMax.max, meta.unite) }, void 0, false, {
                  fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                  lineNumber: 1635,
                  columnNumber: 19
                }, this)
              ] }, void 0, true, {
                fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                lineNumber: 1629,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "text-[10px] text-gray-500 mt-1", children: "Hors Afrique du Sud (biais d'échelle)" }, void 0, false, {
                fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
                lineNumber: 1637,
                columnNumber: 17
              }, this)
            ]
          },
          void 0,
          true,
          {
            fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
            lineNumber: 1626,
            columnNumber: 11
          },
          this
        )
      ] }, void 0, true, {
        fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
        lineNumber: 1596,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
      lineNumber: 1588,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx",
    lineNumber: 1560,
    columnNumber: 5
  }, this);
}
_s9(CarteTab, "70OAnRu2UCKX1HVaaBrvk6/Nxdk=");
_c18 = CarteTab;
const selectStyles = {
  control: (b) => ({ ...b, minHeight: 32, fontSize: 12, borderColor: "hsl(0,0%,85%)" }),
  menu: (b) => ({ ...b, fontSize: 12, zIndex: 100 }),
  option: (b, s) => ({
    ...b,
    background: s.isSelected ? OLIVE : s.isFocused ? OLIVE_8 : "white",
    color: s.isSelected ? "white" : "#374151"
  })
};
var _c, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9, _c0, _c1, _c10, _c11, _c12, _c13, _c14, _c15, _c16, _c17, _c18;
$RefreshReg$(_c, "ModelBadge");
$RefreshReg$(_c2, "SectionTitle");
$RefreshReg$(_c3, "DeltaBadge");
$RefreshReg$(_c4, "SkeletonCard");
$RefreshReg$(_c5, "SkeletonChart");
$RefreshReg$(_c6, "PredChart");
$RefreshReg$(_c7, "TabNav");
$RefreshReg$(_c8, "TabProgress");
$RefreshReg$(_c9, "PredictionsAxe2");
$RefreshReg$(_c0, "Header");
$RefreshReg$(_c1, "OverviewTab");
$RefreshReg$(_c10, "KpiCard");
$RefreshReg$(_c11, "TrajectoiresTab");
$RefreshReg$(_c12, "InsightCard");
$RefreshReg$(_c13, "PaysTab");
$RefreshReg$(_c14, "ValidationPanel");
$RefreshReg$(_c15, "CoherenceCard");
$RefreshReg$(_c16, "VariableTab");
$RefreshReg$(_c17, "ComparaisonTab");
$RefreshReg$(_c18, "CarteTab");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("C:/Users/SMAIKI/AtlanticRe/frontend/src/pages/PredictionsAxe2.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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YUFBQUcsS0FBQTtBQUFBLGFBQUFFLEtBQUE7QUFBQSxhQUFBK1MsS0FBQTtBQUFBLGFBQUFsUSxLQUFBO0FBQUEsYUFBQVEsS0FBQTtBQUFBLGFBQUEyUCxLQUFBO0FBQUEsYUFBQXpOLEtBQUE7QUFBQSxhQUFBME4sS0FBQTtBQUFBLGFBQUExSixNQUFBO0FBQUEsYUFBQTJKLE1BQUE7QUFBQSxhQUFBN0gsTUFBQTtBQUFBLGFBQUE4SCxNQUFBO0FBQUEsYUFBQUMsTUFBQTtBQUFBLGFBQUF0RixNQUFBO0FBQUEsYUFBQXVGLE1BQUE7QUFBQSxhQUFBQyxNQUFBO0FBQUEsYUFBQUMsTUFBQSIsIm5hbWVzIjpbInVzZVN0YXRlIiwidXNlRWZmZWN0IiwidXNlTWVtbyIsIlJlc3BvbnNpdmVDb250YWluZXIiLCJDb21wb3NlZENoYXJ0IiwiTGluZUNoYXJ0IiwiQmFyQ2hhcnQiLCJCYXIiLCJYQXhpcyIsIllBeGlzIiwiQ2FydGVzaWFuR3JpZCIsIlRvb2x0aXAiLCJBcmVhIiwiTGluZSIsIlJlZmVyZW5jZUxpbmUiLCJMZWdlbmQiLCJSYWRhckNoYXJ0IiwiUG9sYXJHcmlkIiwiUG9sYXJBbmdsZUF4aXMiLCJQb2xhclJhZGl1c0F4aXMiLCJSYWRhciIsIlNlbGVjdCIsIlRyZW5kaW5nVXAiLCJUcmVuZGluZ0Rvd24iLCJNaW51cyIsIlJlZnJlc2hDdyIsIkNoZXZyb25Eb3duIiwiQ2hldnJvblVwIiwiQ2hlY2tDaXJjbGUyIiwiQWxlcnRUcmlhbmdsZSIsIkFjdGl2aXR5IiwiWmFwIiwiQ29tcG9zYWJsZU1hcCIsIkdlb2dyYXBoaWVzIiwiR2VvZ3JhcGh5IiwiWm9vbWFibGVHcm91cCIsImFwaSIsIk5VTUVSSUNfVE9fSVNPMyIsIklTTzNfTkFNRVMiLCJBRlJJQ0FfTlVNRVJJQyIsImludGVycG9sYXRlUG9zaXRpb25lZCIsIkNPTE9SX1NDQUxFU19QT1NJVElPTkVEIiwiT0xJVkUiLCJOQVZZIiwiR1JFRU4iLCJSRUQiLCJPUkFOR0UiLCJWSU9MRVQiLCJCTFVFIiwiR1JBWSIsIk9MSVZFXzE1IiwiT0xJVkVfOCIsIlRPUF9DT0xPUlMiLCJSRUdJT05fQ09MT1JTIiwiTU9ERUxfQ09MT1JTIiwiYmciLCJmZyIsIkdhdXNzaWFuUHJvY2VzcyIsIkRlcml2ZWQiLCJNT0RFTF9MQUJFTCIsIkdFT19VUkwiLCJmbXRQY3QiLCJ2IiwiZGVjIiwiaXNOYU4iLCJ0b0ZpeGVkIiwiZm10UGN0U2duIiwiZm10TW4iLCJmbXRVc2QiLCJNYXRoIiwicm91bmQiLCJ0b0xvY2FsZVN0cmluZyIsImZtdFVzZEhhYiIsImZtdFdnaSIsImZtdFIyIiwiZm10TnVtIiwiZm9ybWF0QnlVbml0ZSIsInVuaXRlIiwiTW9kZWxCYWRnZSIsIm1vZGVsZSIsImJsZW5kZWQiLCJjIiwibGFiZWwiLCJiYWNrZ3JvdW5kIiwiY29sb3IiLCJfYyIsIlNlY3Rpb25UaXRsZSIsImNoaWxkcmVuIiwiYm9yZGVyQm90dG9tIiwiX2MyIiwiRGVsdGFCYWRnZSIsInNlbnNGYXZvcmFibGUiLCJpc0Zhdm9yYWJsZSIsImlzRmxhdCIsImFicyIsIkljb24iLCJfYzMiLCJTa2VsZXRvbkNhcmQiLCJoZWlnaHQiLCJfYzQiLCJTa2VsZXRvbkNoYXJ0IiwiX2M1IiwiUHJlZENoYXJ0IiwiaGlzdG9yaXF1ZSIsInByZWRpY3Rpb25zIiwicjIiLCJtYXBlIiwiYXhjb0JsZW5kZWQiLCJfcyIsImRhdGEiLCJtYXAiLCJmb3JFYWNoIiwiaCIsImFubmVlIiwiaGlzdCIsInZhbGV1ciIsInAiLCJleGlzdGluZyIsInByZWQiLCJpY19sb3dlciIsImljX3VwcGVyIiwiT2JqZWN0IiwidmFsdWVzIiwic29ydCIsImEiLCJiIiwiYm9yZGVyIiwidG9wIiwicmlnaHQiLCJsZWZ0IiwiYm90dG9tIiwiZm9udFNpemUiLCJwYXlsb2FkIiwibGJsIiwibGVuZ3RoIiwiZCIsInIiLCJUQUJTIiwiaWQiLCJpY29uIiwiVGFiTmF2IiwiYWN0aXZlIiwib25DaGFuZ2UiLCJib3hTaGFkb3ciLCJ0YWIiLCJpc0FjdGl2ZSIsIl9jNyIsIlRhYlByb2dyZXNzIiwiaWR4IiwiZmluZEluZGV4IiwidCIsIl8iLCJpIiwiZmxleCIsIl9jOCIsIlByZWRpY3Rpb25zQXhlMiIsIl9zMiIsImFjdGl2ZVRhYiIsInNldEFjdGl2ZVRhYiIsIm1ldGFkYXRhIiwic2V0TWV0YWRhdGEiLCJ2YWxpZGF0aW9uIiwic2V0VmFsaWRhdGlvbiIsImxvYWRpbmdNZXRhIiwic2V0TG9hZGluZ01ldGEiLCJhY3RpdmVSZWdpb24iLCJzZXRBY3RpdmVSZWdpb24iLCJkb2N1bWVudCIsImdldEVsZW1lbnRCeUlkIiwic2Nyb2xsVG8iLCJiZWhhdmlvciIsIlByb21pc2UiLCJhbGwiLCJnZXQiLCJ0aGVuIiwiZmluYWxseSIsIkFycmF5IiwibWluSGVpZ2h0IiwicmVnaW9ucyIsIkhlYWRlciIsInBheXMiLCJ0YXJnZXRfdmFycyIsImFubmVlc19wcmVkaWN0aW9uIiwiYXhjb19sb2FkZWQiLCJheGNvX2ZpbGVuYW1lIiwiY29oZXJlbmNlX3Rlc3RzIiwiYm91bmRzX29rIiwiaWNfb2siLCJfYzAiLCJPdmVydmlld1RhYiIsIl9zMyIsInJvd3MiLCJzZXRSb3dzIiwibG9hZGluZyIsInNldExvYWRpbmciLCJwYWdlIiwic2V0UGFnZSIsInNvcnRLZXkiLCJzZXRTb3J0S2V5Iiwic29ydERpciIsInNldFNvcnREaXIiLCJmaWx0ZXJlZCIsImZpbHRlciIsInJlZ2lvbiIsInNvcnRlZCIsImF2IiwiYnYiLCJsb2NhbGVDb21wYXJlIiwidG90YWxQcmltZXMyMDMwIiwicmVkdWNlIiwicyIsIm52X3ByaW1lc18yMDMwIiwibWVkaWFuR3Jvd3RoIiwidmFscyIsIm52X3ByaW1lc192YXJfcGN0IiwiZmxvb3IiLCJiZXN0UGVuZXRyYXRpb24iLCJiZXN0IiwidmFsIiwibnZfcGVuZXRyYXRpb25fMjAzMCIsIm1lZGlhblNQIiwibnZfc3BfMjAzMCIsInRvcDEwIiwic2xpY2UiLCJudiIsInZpZSIsInZpZV9wcmltZXNfMjAzMCIsIlBBR0VfU0laRSIsInRvdGFsUGFnZXMiLCJtYXgiLCJjZWlsIiwicGFnZVJvd3MiLCJjaGFuZ2VTb3J0Iiwia2V5Iiwic29ydEljb24iLCJib3JkZXJDb2xvciIsIm52X3ByaW1lc19pY19sb3ciLCJudl9wcmltZXNfaWNfdXAiLCJudl9wZW5ldHJhdGlvbl9pY19sb3ciLCJudl9wZW5ldHJhdGlvbl9pY191cCIsIm52X3NwX2ljX2xvdyIsIm52X3NwX2ljX3VwIiwiZ2RwY2FwX2ljX2xvdyIsImdkcGNhcF9pY191cCIsImdkcGNhcF8yMDMwIiwicG9sc3RhYl8yMDMwIiwibWluIiwiS3BpQ2FyZCIsInZhbHVlIiwic3VidGl0bGUiLCJhY2NlbnQiLCJib3JkZXJMZWZ0IiwiX2MxMCIsIlRyYWplY3RvaXJlc1RhYiIsIl9zNCIsInZhcmlhYmxlIiwic2V0VmFyaWFibGUiLCJ0b3BOIiwic2V0VG9wTiIsInNldERhdGEiLCJwYXJhbXMiLCJ0b3BfbiIsImNoYXJ0RGF0YSIsInRvcF9wYXlzIiwic2VyaWVzIiwicHAiLCJoMjAyNCIsImZpbmQiLCJtZXRhIiwidmFyT3B0aW9ucyIsImFsbF92YXJzIiwidmFyaWFibGVzIiwibWluV2lkdGgiLCJvIiwic2VsZWN0U3R5bGVzIiwibiIsImZpbGwiLCJyYWRhciIsImpvaW4iLCJJbnNpZ2h0Q2FyZCIsInRpdGxlIiwic21hbGwiLCJfYzEyIiwiUGF5c1RhYiIsIl9zNSIsInNldFBheXMiLCJpbmNsdWRlcyIsImRpbWVuc2lvbiIsInNldERpbWVuc2lvbiIsInJlZnJlc2hpbmciLCJzZXRSZWZyZXNoaW5nIiwiZW5jb2RlVVJJQ29tcG9uZW50IiwicGF5c09wdGlvbnMiLCJwYXlzX3dpdGhfcmVnaW9uIiwiZGltcyIsImZpbHRlcmVkVmFycyIsInJlZnJlc2giLCJyMl93YWxmb3J3YXJkIiwiYXhjb19ibGVuZGVkIiwiVmFsaWRhdGlvblBhbmVsIiwib25SZWZyZXNoIiwiX3M2Iiwib3BlbiIsInNldE9wZW4iLCJlbGFwc2VkX3NlY29uZHMiLCJrZXlzIiwiZW50cmllcyIsImsiLCJtIiwicjJfbWVhbiIsIm1hcGVfbWVhbiIsIm1hZSIsInE4MCIsInE5NSIsImFsZXJ0c19jb3VudCIsImF4Y29fYWxpZ25tZW50IiwibWFlX2dkcF9ncm93dGgiLCJtYWVfZ2RwY2FwIiwib3BhY2l0eSIsIkNvaGVyZW5jZUNhcmQiLCJvayIsImRlc2MiLCJ3YXJuaW5nIiwiX2MxNSIsIlZhcmlhYmxlVGFiIiwiX3M3IiwiaG9yaXpvbiIsInNldEhvcml6b24iLCJ0b3A1IiwiY2xhc3NlbWVudCIsInRvcF9zZXJpZXMiLCJ0b3A1UGF5cyIsInJhbmciLCJ2YWxldXJfMjAyNCIsInZhbGV1cl9ob3Jpem9uIiwidmFyaWF0aW9uX3BjdCIsInNlbnNfZmF2b3JhYmxlIiwiQ29tcGFyYWlzb25UYWIiLCJfczgiLCJwYXlzQSIsInNldFBheXNBIiwicGF5c0IiLCJzZXRQYXlzQiIsInBheXNfYSIsInBheXNfYiIsInNhIiwic2IiLCJhX2hpc3QiLCJhX3ByZWQiLCJhX2xvIiwiYV9oaSIsImJfaGlzdCIsImJfcHJlZCIsImJfbG8iLCJiX2hpIiwidGFibGVhdSIsImFfMjAyNCIsImFfMjAzMCIsImFfZGVsdGFfcGN0IiwiYl8yMDI0IiwiYl8yMDMwIiwiYl9kZWx0YV9wY3QiLCJnYWduYW50IiwiQ2FydGVUYWIiLCJfczkiLCJzZXRDbGFzc2VtZW50Iiwic2V0TWV0YSIsInpvb20iLCJzZXRab29tIiwidmFsdWVCeVBheXMiLCJtaW5NYXgiLCJGUl9UT19JU08zIiwiaXNvIiwiZnIiLCJJU08zX1RPX1ZBTFVFIiwiY29sb3JTY2FsZSIsInByaW1lcyIsInNwIiwicGVuZXRyYXRpb24iLCJkZW5zaXRlIiwiZ2RwQ2FwIiwiY3JvaXNzYW5jZSIsIndnaSIsImNvbG9yRm9yIiwicG9zaXRpb24iLCJzY2FsZSIsImNlbnRlciIsImdlb2dyYXBoaWVzIiwiZ2VvIiwiaGFzIiwiTnVtYmVyIiwibmFtZSIsImRlZmF1bHQiLCJvdXRsaW5lIiwiaG92ZXIiLCJjdXJzb3IiLCJwcmVzc2VkIiwicnNtS2V5IiwiY29udHJvbCIsIm1lbnUiLCJ6SW5kZXgiLCJvcHRpb24iLCJpc1NlbGVjdGVkIiwiaXNGb2N1c2VkIiwiX2M2IiwiX2M5IiwiX2MxIiwiX2MxMSIsIl9jMTMiLCJfYzE0IiwiX2MxNiIsIl9jMTciLCJfYzE4Il0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIlByZWRpY3Rpb25zQXhlMi50c3giXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBQcmVkaWN0aW9uc0F4ZTIudHN4IOKAlCBQYWdlIFByw6lkaWN0aW9ucyBNYXJjaMOpcyBBZnJpY2FpbnMgMjAzMCAoQXhlIDIpXG4gKlxuICogNiBvbmdsZXRzIDpcbiAqICAgMS4gVnVlIGQnZW5zZW1ibGUgICAg8J+UriDigJQgS1BJcyArIGJhcmNoYXJ0IHRvcCAxMCArIHRhYmxlYXUgcsOpY2FwaXR1bGF0aWZcbiAqICAgMi4gVHJhamVjdG9pcmVzICAgICAg8J+TiCDigJQgVG9wIE4gcGF5cyBzdXBlcnBvc8OpcyArIHJhZGFyIDIwMzBcbiAqICAgMy4gQW5hbHlzZSBwYXIgUGF5cyAg8J+MjSDigJQgVG91dGVzIHZhcmlhYmxlcyBkJ3VuIHBheXMgKyBRdWFsaXTDqSBkdSBNb2TDqGxlXG4gKiAgIDQuIFBhciBWYXJpYWJsZSAgICAgIPCfk4og4oCUIENsYXNzZW1lbnQgZXQgdG9wIDUgc8Opcmllc1xuICogICA1LiBDb21wYXJhaXNvbiAgICAgICDimpbvuI8g4oCUIERldXggcGF5cyBjw7R0ZSDDoCBjw7R0ZVxuICogICA2LiBDYXJ0ZSAyMDMwICAgICAgICDwn5e677iPIOKAlCBDaG9yb3Bsw6h0aGUgQWZyaXF1ZVxuICpcbiAqIEJhY2tlbmQgOiAvYXBpL3ByZWRpY3Rpb25zL2F4ZTIvKiAoRkUtT0xTICsgUmlkZ2UgKyBBUklNQSArIEdQICsgWEdCb29zdCxcbiAqICAgICAgICAgICBDb25mb3JtYWwgUHJlZGljdGlvbiBJQywgYmxlbmRpbmcgQXhjbyBvcHRpb25uZWwpXG4gKi9cbmltcG9ydCB7IHVzZVN0YXRlLCB1c2VFZmZlY3QsIHVzZU1lbW8gfSBmcm9tICdyZWFjdCdcbmltcG9ydCB7XG4gIFJlc3BvbnNpdmVDb250YWluZXIsIENvbXBvc2VkQ2hhcnQsIExpbmVDaGFydCwgQmFyQ2hhcnQsIEJhcixcbiAgWEF4aXMsIFlBeGlzLCBDYXJ0ZXNpYW5HcmlkLCBUb29sdGlwLCBBcmVhLCBMaW5lLCBSZWZlcmVuY2VMaW5lLFxuICBMZWdlbmQsIFJhZGFyQ2hhcnQsIFBvbGFyR3JpZCwgUG9sYXJBbmdsZUF4aXMsIFBvbGFyUmFkaXVzQXhpcywgUmFkYXIsXG59IGZyb20gJ3JlY2hhcnRzJ1xuaW1wb3J0IFNlbGVjdCBmcm9tICdyZWFjdC1zZWxlY3QnXG5pbXBvcnQge1xuICBUcmVuZGluZ1VwLCBUcmVuZGluZ0Rvd24sIE1pbnVzLCBSZWZyZXNoQ3csIENoZXZyb25Eb3duLCBDaGV2cm9uVXAsXG4gIENoZWNrQ2lyY2xlMiwgQWxlcnRUcmlhbmdsZSwgQWN0aXZpdHksIFphcCxcbn0gZnJvbSAnbHVjaWRlLXJlYWN0J1xuaW1wb3J0IHtcbiAgQ29tcG9zYWJsZU1hcCwgR2VvZ3JhcGhpZXMsIEdlb2dyYXBoeSwgWm9vbWFibGVHcm91cCxcbn0gZnJvbSAncmVhY3Qtc2ltcGxlLW1hcHMnXG5pbXBvcnQgYXBpIGZyb20gJy4uL3V0aWxzL2FwaSdcbmltcG9ydCB7XG4gIE5VTUVSSUNfVE9fSVNPMywgSVNPM19OQU1FUyxcbiAgQUZSSUNBX05VTUVSSUMsIGludGVycG9sYXRlUG9zaXRpb25lZCwgQ09MT1JfU0NBTEVTX1BPU0lUSU9ORUQsXG59IGZyb20gJy4uL3V0aWxzL2NhcnRvZ3JhcGhpZUNvbnN0YW50cydcblxuLy8g4pSA4pSAIENvdWxldXJzIEF4ZSAyIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuY29uc3QgT0xJVkUgPSAnaHNsKDgzLDUyJSwzNiUpJ1xuY29uc3QgTkFWWSA9ICdoc2woMjEzLDYwJSwyNyUpJ1xuY29uc3QgR1JFRU4gPSAnaHNsKDE1Miw1NiUsMzklKSdcbmNvbnN0IFJFRCA9ICdoc2woMzU4LDY2JSw1NCUpJ1xuY29uc3QgT1JBTkdFID0gJ2hzbCgzMCw4OCUsNTYlKSdcbmNvbnN0IFZJT0xFVCA9ICdoc2woMjcwLDUwJSw0NSUpJ1xuY29uc3QgQkxVRSA9ICdoc2woMjAwLDcwJSw0MCUpJ1xuY29uc3QgR1JBWSA9ICdoc2woMjE4LDE0JSw1NSUpJ1xuY29uc3QgT0xJVkVfMTUgPSAnaHNsYSg4Myw1MiUsMzYlLDAuMTUpJ1xuY29uc3QgT0xJVkVfOCA9ICdoc2xhKDgzLDUyJSwzNiUsMC4wOCknXG5cbmNvbnN0IFRPUF9DT0xPUlMgPSBbT0xJVkUsIE5BVlksIEdSRUVOLCBPUkFOR0UsIFZJT0xFVCwgUkVELCBCTFVFLCAnIzhFNDRBRCcsICcjRDM1NDAwJywgJyMxNkEwODUnXVxuXG5jb25zdCBSRUdJT05fQ09MT1JTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAnQWZyaXF1ZSBkdSBOb3JkJzogTkFWWSxcbiAgXCJBZnJpcXVlIGRlIGwnT3Vlc3RcIjogT1JBTkdFLFxuICAnQWZyaXF1ZSBDZW50cmFsZSc6IEJMVUUsXG4gIFwiQWZyaXF1ZSBkZSBsJ0VzdFwiOiBHUkVFTixcbiAgJ0FmcmlxdWUgQXVzdHJhbGUnOiBWSU9MRVQsXG59XG5cbi8vIENvdWxldXJzIGJhZGdlIHBhciBmYW1pbGxlIGRlIG1vZMOobGVcbmNvbnN0IE1PREVMX0NPTE9SUzogUmVjb3JkPHN0cmluZywgeyBiZzogc3RyaW5nOyBmZzogc3RyaW5nIH0+ID0ge1xuICAnRkUtT0xTK1JpZGdlK0FSSU1BJzogeyBiZzogJ2hzbGEoMjEzLDYwJSwyNyUsMC4xMCknLCBmZzogTkFWWSB9LFxuICAnQVIyK1JpZGdlK1hHQm9vc3QnOiB7IGJnOiAnaHNsYSgzMCw4OCUsNTYlLDAuMTUpJywgZmc6IE9SQU5HRSB9LFxuICBHYXVzc2lhblByb2Nlc3M6IHsgYmc6ICdoc2xhKDI3MCw1MCUsNDUlLDAuMTMpJywgZmc6IFZJT0xFVCB9LFxuICAnQVIxLU1SJzogeyBiZzogJ2hzbGEoODMsNTIlLDM2JSwwLjEzKScsIGZnOiBPTElWRSB9LFxuICAnUmlkZ2UtSGllcmFyY2hpcXVlJzogeyBiZzogJ2hzbGEoMjAwLDcwJSw0MCUsMC4xMyknLCBmZzogQkxVRSB9LFxuICBEZXJpdmVkOiB7IGJnOiAnaHNsYSgyMTgsMTQlLDU1JSwwLjEzKScsIGZnOiBHUkFZIH0sXG59XG5cbmNvbnN0IE1PREVMX0xBQkVMOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAnRkUtT0xTK1JpZGdlK0FSSU1BJzogJ0ZFLU9MUyArIFJpZGdlJyxcbiAgJ0FSMitSaWRnZStYR0Jvb3N0JzogJ0FSKDIpICsgWEdCJyxcbiAgR2F1c3NpYW5Qcm9jZXNzOiAnR1AnLFxuICAnQVIxLU1SJzogJ0FSKDEpIE1SJyxcbiAgJ1JpZGdlLUhpZXJhcmNoaXF1ZSc6ICdSaWRnZSBIacOpcmFyLicsXG4gIERlcml2ZWQ6ICdEw6lyaXbDqWUnLFxufVxuXG5jb25zdCBHRU9fVVJMID0gJ2h0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9ucG0vd29ybGQtYXRsYXNAMi9jb3VudHJpZXMtMTEwbS5qc29uJ1xuXG4vLyDilIDilIAgVHlwZXMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5pbnRlcmZhY2UgSGlzdFBvaW50IHsgYW5uZWU6IG51bWJlcjsgdmFsZXVyOiBudW1iZXIgfVxuaW50ZXJmYWNlIFByZWRQb2ludCB7IGFubmVlOiBudW1iZXI7IHZhbGV1cjogbnVtYmVyOyBpY19sb3dlcjogbnVtYmVyOyBpY191cHBlcjogbnVtYmVyIH1cblxuaW50ZXJmYWNlIFZhckRhdGEge1xuICB2YXJpYWJsZTogc3RyaW5nXG4gIGxhYmVsOiBzdHJpbmdcbiAgdW5pdGU6IHN0cmluZ1xuICBzZW5zX2Zhdm9yYWJsZTogJ2hhdXNzZScgfCAnYmFpc3NlJ1xuICBkaW1lbnNpb246IHN0cmluZ1xuICBtb2RlbGU6IHN0cmluZ1xuICByMl93YWxmb3J3YXJkOiBudW1iZXIgfCBudWxsXG4gIG1hcGU6IG51bWJlciB8IG51bGxcbiAgcTgwOiBudW1iZXIgfCBudWxsXG4gIHE5NTogbnVtYmVyIHwgbnVsbFxuICBoaXN0b3JpcXVlOiBIaXN0UG9pbnRbXVxuICBwcmVkaWN0aW9uczogUHJlZFBvaW50W11cbiAgYXhjb19ibGVuZGVkOiBib29sZWFuXG59XG5cbmludGVyZmFjZSBPdmVydmlld1JvdyB7XG4gIHBheXM6IHN0cmluZ1xuICByZWdpb246IHN0cmluZ1xuICBudl9wZW5ldHJhdGlvbl8yMDI0OiBudW1iZXIgfCBudWxsXG4gIHZpZV9wZW5ldHJhdGlvbl8yMDI0OiBudW1iZXIgfCBudWxsXG4gIG52X3NwXzIwMjQ6IG51bWJlciB8IG51bGxcbiAgZ2RwY2FwXzIwMjQ6IG51bWJlciB8IG51bGxcbiAgZ2RwX2dyb3d0aF8yMDI0OiBudW1iZXIgfCBudWxsXG4gIHBvbHN0YWJfMjAyNDogbnVtYmVyIHwgbnVsbFxuICByZWdxdWFsXzIwMjQ6IG51bWJlciB8IG51bGxcbiAgbnZfcHJpbWVzXzIwMjQ6IG51bWJlciB8IG51bGxcbiAgdmllX3ByaW1lc18yMDI0OiBudW1iZXIgfCBudWxsXG4gIG52X3BlbmV0cmF0aW9uXzIwMzA6IG51bWJlciB8IG51bGxcbiAgdmllX3BlbmV0cmF0aW9uXzIwMzA6IG51bWJlciB8IG51bGxcbiAgbnZfc3BfMjAzMDogbnVtYmVyIHwgbnVsbFxuICBnZHBjYXBfMjAzMDogbnVtYmVyIHwgbnVsbFxuICBnZHBfZ3Jvd3RoXzIwMzA6IG51bWJlciB8IG51bGxcbiAgcG9sc3RhYl8yMDMwOiBudW1iZXIgfCBudWxsXG4gIHJlZ3F1YWxfMjAzMDogbnVtYmVyIHwgbnVsbFxuICBudl9wcmltZXNfMjAzMDogbnVtYmVyIHwgbnVsbFxuICB2aWVfcHJpbWVzXzIwMzA6IG51bWJlciB8IG51bGxcbiAgbnZfcGVuZXRyYXRpb25fdmFyX3BjdDogbnVtYmVyIHwgbnVsbFxuICBudl9wcmltZXNfdmFyX3BjdDogbnVtYmVyIHwgbnVsbFxuICBnZHBjYXBfdmFyX3BjdDogbnVtYmVyIHwgbnVsbFxuICBudl9wZW5ldHJhdGlvbl9pY19sb3c6IG51bWJlciB8IG51bGxcbiAgbnZfcGVuZXRyYXRpb25faWNfdXA6IG51bWJlciB8IG51bGxcbiAgbnZfcHJpbWVzX2ljX2xvdzogbnVtYmVyIHwgbnVsbFxuICBudl9wcmltZXNfaWNfdXA6IG51bWJlciB8IG51bGxcbiAgbnZfc3BfaWNfbG93OiBudW1iZXIgfCBudWxsXG4gIG52X3NwX2ljX3VwOiBudW1iZXIgfCBudWxsXG4gIGdkcGNhcF9pY19sb3c6IG51bWJlciB8IG51bGxcbiAgZ2RwY2FwX2ljX3VwOiBudW1iZXIgfCBudWxsXG59XG5cbmludGVyZmFjZSBWYXJpYWJsZU1ldGEge1xuICBsYWJlbDogc3RyaW5nXG4gIHVuaXRlOiBzdHJpbmdcbiAgc2Vuc19mYXZvcmFibGU6ICdoYXVzc2UnIHwgJ2JhaXNzZSdcbiAgZGltZW5zaW9uOiBzdHJpbmdcbiAgbW9kZWxlOiBzdHJpbmdcbn1cblxuaW50ZXJmYWNlIE1ldGFkYXRhIHtcbiAgcGF5czogc3RyaW5nW11cbiAgcGF5c193aXRoX3JlZ2lvbjogeyBwYXlzOiBzdHJpbmc7IHJlZ2lvbjogc3RyaW5nIH1bXVxuICByZWdpb25zOiBzdHJpbmdbXVxuICByZWdpb25zX3BheXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZ1tdPlxuICB0YXJnZXRfdmFyczogc3RyaW5nW11cbiAgZGVyaXZlZF92YXJzOiBzdHJpbmdbXVxuICBhbGxfdmFyczogc3RyaW5nW11cbiAgdmFyaWFibGVzOiBSZWNvcmQ8c3RyaW5nLCBWYXJpYWJsZU1ldGE+XG4gIGFubmVlc19oaXN0b3JpcXVlOiBudW1iZXJbXVxuICBhbm5lZXNfcHJlZGljdGlvbjogbnVtYmVyW11cbiAgYXhjb19sb2FkZWQ6IGJvb2xlYW5cbiAgYXhjb19maWxlbmFtZTogc3RyaW5nIHwgbnVsbFxufVxuXG5pbnRlcmZhY2UgVmFsaWRhdGlvbk1ldHJpY3Mge1xuICBheGNvX2xvYWRlZDogYm9vbGVhblxuICBheGNvX2ZpbGVuYW1lOiBzdHJpbmcgfCBudWxsXG4gIGVsYXBzZWRfc2Vjb25kczogbnVtYmVyXG4gIHZhcmlhYmxlczogUmVjb3JkPHN0cmluZywge1xuICAgIG1vZGVsZTogc3RyaW5nXG4gICAgbGFiZWw6IHN0cmluZ1xuICAgIGRpbWVuc2lvbjogc3RyaW5nXG4gICAgcjJfbWVhbjogbnVtYmVyIHwgbnVsbFxuICAgIG1hcGVfbWVhbjogbnVtYmVyIHwgbnVsbFxuICAgIG1hZTogbnVtYmVyIHwgbnVsbFxuICAgIG5fY2FsaWJyYXRpb246IG51bWJlciB8IG51bGxcbiAgICBxODA6IG51bWJlciB8IG51bGxcbiAgICBxOTU6IG51bWJlciB8IG51bGxcbiAgfT5cbiAgY29oZXJlbmNlX3Rlc3RzOiB7XG4gICAgYm91bmRzX29rOiBib29sZWFuXG4gICAgaWNfb2s6IGJvb2xlYW5cbiAgICBheGNvX2FsaWdubWVudDogeyBtYWVfZ2RwX2dyb3d0aDogbnVtYmVyIHwgbnVsbDsgbWFlX2dkcGNhcDogbnVtYmVyIHwgbnVsbCB9IHwgbnVsbFxuICAgIGFsZXJ0c19jb3VudDogbnVtYmVyXG4gICAgYWxlcnRzX3NhbXBsZTogc3RyaW5nW11cbiAgfVxufVxuXG4vLyDilIDilIAgSGVscGVycyBkZSBmb3JtYXQg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5jb25zdCBmbXRQY3QgPSAodjogbnVtYmVyIHwgbnVsbCB8IHVuZGVmaW5lZCwgZGVjID0gMSkgPT5cbiAgdiA9PSBudWxsIHx8IGlzTmFOKHYpID8gJ+KAlCcgOiBgJHt2LnRvRml4ZWQoZGVjKX0gJWBcbmNvbnN0IGZtdFBjdFNnbiA9ICh2OiBudW1iZXIgfCBudWxsIHwgdW5kZWZpbmVkLCBkZWMgPSAxKSA9PlxuICB2ID09IG51bGwgfHwgaXNOYU4odikgPyAn4oCUJyA6IGAke3YgPj0gMCA/ICcrJyA6ICcnfSR7di50b0ZpeGVkKGRlYyl9ICVgXG5jb25zdCBmbXRNbiA9ICh2OiBudW1iZXIgfCBudWxsIHwgdW5kZWZpbmVkKSA9PlxuICB2ID09IG51bGwgfHwgaXNOYU4odikgPyAn4oCUJyA6IHYgPj0gMTAwMCA/IGAkeyh2IC8gMTAwMCkudG9GaXhlZCgxKX0gTXJkJGAgOiBgJHt2LnRvRml4ZWQoMCl9IE1uJGBcbmNvbnN0IGZtdFVzZCA9ICh2OiBudW1iZXIgfCBudWxsIHwgdW5kZWZpbmVkKSA9PlxuICB2ID09IG51bGwgfHwgaXNOYU4odikgPyAn4oCUJyA6IGAkJHtNYXRoLnJvdW5kKHYpLnRvTG9jYWxlU3RyaW5nKCl9YFxuY29uc3QgZm10VXNkSGFiID0gKHY6IG51bWJlciB8IG51bGwgfCB1bmRlZmluZWQpID0+XG4gIHYgPT0gbnVsbCB8fCBpc05hTih2KSA/ICfigJQnIDogYCQke01hdGgucm91bmQodikudG9Mb2NhbGVTdHJpbmcoKX0vaGFiYFxuY29uc3QgZm10V2dpID0gKHY6IG51bWJlciB8IG51bGwgfCB1bmRlZmluZWQpID0+XG4gIHYgPT0gbnVsbCB8fCBpc05hTih2KSA/ICfigJQnIDogYCR7diA+PSAwID8gJysnIDogJyd9JHt2LnRvRml4ZWQoMil9YFxuY29uc3QgZm10UjIgPSAodjogbnVtYmVyIHwgbnVsbCB8IHVuZGVmaW5lZCkgPT5cbiAgdiA9PSBudWxsIHx8IGlzTmFOKHYpID8gJ+KAlCcgOiB2LnRvRml4ZWQoMylcbmNvbnN0IGZtdE51bSA9ICh2OiBudW1iZXIgfCBudWxsIHwgdW5kZWZpbmVkLCBkZWMgPSAyKSA9PlxuICB2ID09IG51bGwgfHwgaXNOYU4odikgPyAn4oCUJyA6IHYudG9GaXhlZChkZWMpXG5cbmZ1bmN0aW9uIGZvcm1hdEJ5VW5pdGUodjogbnVtYmVyIHwgbnVsbCB8IHVuZGVmaW5lZCwgdW5pdGU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmICh2ID09IG51bGwgfHwgaXNOYU4odikpIHJldHVybiAn4oCUJ1xuICBpZiAodW5pdGUgPT09ICdNbiBVU0QnKSByZXR1cm4gZm10TW4odilcbiAgaWYgKHVuaXRlID09PSAnVVNEL2hhYicpIHJldHVybiBmbXRVc2RIYWIodilcbiAgaWYgKHVuaXRlID09PSAnVVNEJykgcmV0dXJuIGZtdFVzZCh2KVxuICBpZiAodW5pdGUgPT09ICclJykgcmV0dXJuIGZtdFBjdCh2KVxuICBpZiAodW5pdGUgPT09ICdpbmRpY2UnKSByZXR1cm4gZm10V2dpKHYpXG4gIHJldHVybiBmbXROdW0odilcbn1cblxuLy8g4pSA4pSAIENvbXBvc2FudHMgYXRvbWlxdWVzIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuZnVuY3Rpb24gTW9kZWxCYWRnZSh7IG1vZGVsZSwgYmxlbmRlZCB9OiB7IG1vZGVsZTogc3RyaW5nOyBibGVuZGVkPzogYm9vbGVhbiB9KSB7XG4gIGNvbnN0IGMgPSBNT0RFTF9DT0xPUlNbbW9kZWxlXSA/PyBNT0RFTF9DT0xPUlMuRGVyaXZlZFxuICBjb25zdCBsYWJlbCA9IE1PREVMX0xBQkVMW21vZGVsZV0gPz8gbW9kZWxlXG4gIHJldHVybiAoXG4gICAgPHNwYW4gY2xhc3NOYW1lPVwiaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjUgcHgtMiBweS0wLjUgcm91bmRlZCB0ZXh0LVsxMHB4XSBmb250LW1vbm8gZm9udC1zZW1pYm9sZFwiXG4gICAgICBzdHlsZT17eyBiYWNrZ3JvdW5kOiBjLmJnLCBjb2xvcjogYy5mZyB9fT5cbiAgICAgIHtsYWJlbH1cbiAgICAgIHtibGVuZGVkICYmIDxzcGFuIHRpdGxlPVwiQXhjbyBibGVuZGVkXCIgY2xhc3NOYW1lPVwib3BhY2l0eS04MFwiPuKckyBBeGNvPC9zcGFuPn1cbiAgICA8L3NwYW4+XG4gIClcbn1cblxuZnVuY3Rpb24gU2VjdGlvblRpdGxlKHsgY2hpbGRyZW4gfTogeyBjaGlsZHJlbjogUmVhY3QuUmVhY3ROb2RlIH0pIHtcbiAgcmV0dXJuIChcbiAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC1iYXNlIGZvbnQtYm9sZCB0ZXh0LWdyYXktODAwIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHBiLTJcIlxuICAgICAgc3R5bGU9e3sgYm9yZGVyQm90dG9tOiAnMnB4IHNvbGlkIGhzbGEoODMsNTIlLDQyJSwwLjIwKScgfX0+XG4gICAgICB7Y2hpbGRyZW59XG4gICAgPC9oMj5cbiAgKVxufVxuXG5mdW5jdGlvbiBEZWx0YUJhZGdlKHsgdiwgc2Vuc0Zhdm9yYWJsZSB9OiB7IHY6IG51bWJlciB8IG51bGw7IHNlbnNGYXZvcmFibGU6ICdoYXVzc2UnIHwgJ2JhaXNzZScgfSkge1xuICBpZiAodiA9PSBudWxsIHx8IGlzTmFOKHYpKSByZXR1cm4gPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1ncmF5LTQwMFwiPuKAlDwvc3Bhbj5cbiAgY29uc3QgaXNGYXZvcmFibGUgPSBzZW5zRmF2b3JhYmxlID09PSAnaGF1c3NlJyA/IHYgPiAwIDogdiA8IDBcbiAgY29uc3QgaXNGbGF0ID0gTWF0aC5hYnModikgPCAwLjVcbiAgY29uc3QgSWNvbiA9IGlzRmxhdCA/IE1pbnVzIDogKHYgPiAwID8gVHJlbmRpbmdVcCA6IFRyZW5kaW5nRG93bilcbiAgY29uc3QgY29sb3IgPSBpc0ZsYXQgPyBHUkFZIDogKGlzRmF2b3JhYmxlID8gR1JFRU4gOiBSRUQpXG4gIHJldHVybiAoXG4gICAgPHNwYW4gY2xhc3NOYW1lPVwiaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIGdhcC0wLjUgZm9udC1zZW1pYm9sZCB0ZXh0LVsxMXB4XVwiXG4gICAgICBzdHlsZT17eyBjb2xvciB9fT5cbiAgICAgIDxJY29uIHNpemU9ezEyfSAvPlxuICAgICAge2ZtdFBjdFNnbih2LCAxKX1cbiAgICA8L3NwYW4+XG4gIClcbn1cblxuLy8g4pSA4pSAIFNrZWxldG9uIGxvYWRlcnMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5mdW5jdGlvbiBTa2VsZXRvbkNhcmQoKSB7XG4gIHJldHVybiA8ZGl2IGNsYXNzTmFtZT1cInJvdW5kZWQteGwgYmctZ3JheS0xMDAgYW5pbWF0ZS1wdWxzZVwiIHN0eWxlPXt7IGhlaWdodDogMTAwIH19IC8+XG59XG5mdW5jdGlvbiBTa2VsZXRvbkNoYXJ0KCkge1xuICByZXR1cm4gPGRpdiBjbGFzc05hbWU9XCJyb3VuZGVkLXhsIGJnLWdyYXktMTAwIGFuaW1hdGUtcHVsc2VcIiBzdHlsZT17eyBoZWlnaHQ6IDMyMCB9fSAvPlxufVxuXG4vLyDilIDilIAgUHJlZENoYXJ0IDogdW4gZ3JhcGhpcXVlIGhpc3RvcmlxdWUgKyBwcsOpZGljdGlvbnMgYXZlYyBJQyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcbmludGVyZmFjZSBQcmVkQ2hhcnRQcm9wcyB7XG4gIHZhcmlhYmxlOiBzdHJpbmdcbiAgbGFiZWw6IHN0cmluZ1xuICB1bml0ZTogc3RyaW5nXG4gIGhpc3RvcmlxdWU6IEhpc3RQb2ludFtdXG4gIHByZWRpY3Rpb25zOiBQcmVkUG9pbnRbXVxuICBtb2RlbGU6IHN0cmluZ1xuICByMjogbnVtYmVyIHwgbnVsbFxuICBtYXBlOiBudW1iZXIgfCBudWxsXG4gIGF4Y29CbGVuZGVkOiBib29sZWFuXG4gIGhlaWdodD86IG51bWJlclxufVxuXG5mdW5jdGlvbiBQcmVkQ2hhcnQoe1xuICBsYWJlbCwgdW5pdGUsIGhpc3RvcmlxdWUsIHByZWRpY3Rpb25zLCBtb2RlbGUsIHIyLCBtYXBlLCBheGNvQmxlbmRlZCwgaGVpZ2h0ID0gMjUwLFxufTogUHJlZENoYXJ0UHJvcHMpIHtcbiAgY29uc3QgZGF0YSA9IHVzZU1lbW8oKCkgPT4ge1xuICAgIGNvbnN0IG1hcDogUmVjb3JkPG51bWJlciwgYW55PiA9IHt9XG4gICAgaGlzdG9yaXF1ZS5mb3JFYWNoKGggPT4geyBtYXBbaC5hbm5lZV0gPSB7IGFubmVlOiBoLmFubmVlLCBoaXN0OiBoLnZhbGV1ciB9IH0pXG4gICAgcHJlZGljdGlvbnMuZm9yRWFjaChwID0+IHtcbiAgICAgIGNvbnN0IGV4aXN0aW5nID0gbWFwW3AuYW5uZWVdID8/IHsgYW5uZWU6IHAuYW5uZWUgfVxuICAgICAgbWFwW3AuYW5uZWVdID0geyAuLi5leGlzdGluZywgcHJlZDogcC52YWxldXIsIGljX2xvd2VyOiBwLmljX2xvd2VyLCBpY191cHBlcjogcC5pY191cHBlciB9XG4gICAgfSlcbiAgICBpZiAobWFwWzIwMjRdKSB7XG4gICAgICBtYXBbMjAyNF0ucHJlZCA9IG1hcFsyMDI0XS5oaXN0XG4gICAgICBtYXBbMjAyNF0uaWNfbG93ZXIgPSBtYXBbMjAyNF0uaGlzdFxuICAgICAgbWFwWzIwMjRdLmljX3VwcGVyID0gbWFwWzIwMjRdLmhpc3RcbiAgICB9XG4gICAgcmV0dXJuIE9iamVjdC52YWx1ZXMobWFwKS5zb3J0KChhOiBhbnksIGI6IGFueSkgPT4gYS5hbm5lZSAtIGIuYW5uZWUpXG4gIH0sIFtoaXN0b3JpcXVlLCBwcmVkaWN0aW9uc10pXG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXdoaXRlIHJvdW5kZWQteGwgcC0zXCIgc3R5bGU9e3sgYm9yZGVyOiAnMXB4IHNvbGlkIGhzbCgwLDAlLDkwJSknIH19PlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLXN0YXJ0IGp1c3RpZnktYmV0d2VlbiBtYi0yIGZsZXgtd3JhcCBnYXAtMlwiPlxuICAgICAgICA8ZGl2PlxuICAgICAgICAgIDxoMyBjbGFzc05hbWU9XCJ0ZXh0LXNtIGZvbnQtYm9sZCB0ZXh0LWdyYXktODAwXCI+e2xhYmVsfTwvaDM+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1ncmF5LTUwMCBtdC0wLjVcIj57dW5pdGV9PC9wPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiBmbGV4LXdyYXBcIj5cbiAgICAgICAgICA8TW9kZWxCYWRnZSBtb2RlbGU9e21vZGVsZX0gYmxlbmRlZD17YXhjb0JsZW5kZWR9IC8+XG4gICAgICAgICAge3IyICE9IG51bGwgJiYgKFxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gZm9udC1tb25vIHRleHQtZ3JheS02MDBcIj5SwrI9e2ZtdFIyKHIyKX08L3NwYW4+XG4gICAgICAgICAgKX1cbiAgICAgICAgICB7bWFwZSAhPSBudWxsICYmIChcbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIGZvbnQtbW9ubyB0ZXh0LWdyYXktNjAwXCI+TUFQRT17Zm10UGN0KG1hcGUpfTwvc3Bhbj5cbiAgICAgICAgICApfVxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgICAgPFJlc3BvbnNpdmVDb250YWluZXIgd2lkdGg9XCIxMDAlXCIgaGVpZ2h0PXtoZWlnaHR9PlxuICAgICAgICA8Q29tcG9zZWRDaGFydCBkYXRhPXtkYXRhIGFzIGFueVtdfSBtYXJnaW49e3sgdG9wOiA1LCByaWdodDogMTAsIGxlZnQ6IC01LCBib3R0b206IDAgfX0+XG4gICAgICAgICAgPENhcnRlc2lhbkdyaWQgc3Ryb2tlRGFzaGFycmF5PVwiMyAzXCIgc3Ryb2tlPVwiaHNsKDAsMCUsOTMlKVwiIC8+XG4gICAgICAgICAgPFhBeGlzIGRhdGFLZXk9XCJhbm5lZVwiIHRpY2s9e3sgZm9udFNpemU6IDEwIH19IHN0cm9rZT1cImhzbCgwLDAlLDUwJSlcIiAvPlxuICAgICAgICAgIDxZQXhpcyB0aWNrPXt7IGZvbnRTaXplOiAxMCB9fSBzdHJva2U9XCJoc2woMCwwJSw1MCUpXCIgLz5cbiAgICAgICAgICA8VG9vbHRpcFxuICAgICAgICAgICAgY29udGVudD17KHsgcGF5bG9hZCwgbGFiZWw6IGxibCB9KSA9PiB7XG4gICAgICAgICAgICAgIGlmICghcGF5bG9hZCB8fCAhcGF5bG9hZC5sZW5ndGgpIHJldHVybiBudWxsXG4gICAgICAgICAgICAgIGNvbnN0IGQ6IGFueSA9IHBheWxvYWRbMF0ucGF5bG9hZFxuICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctd2hpdGUgcHgtMi41IHB5LTIgcm91bmRlZCBzaGFkb3cgdGV4dC14c1wiXG4gICAgICAgICAgICAgICAgICBzdHlsZT17eyBib3JkZXI6ICcxcHggc29saWQgaHNsKDAsMCUsODUlKScgfX0+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZvbnQtYm9sZCB0ZXh0LWdyYXktODAwIG1iLTFcIj57bGJsfTwvZGl2PlxuICAgICAgICAgICAgICAgICAge2QuaGlzdCAhPSBudWxsICYmIDxkaXY+SGlzdG9yaXF1ZSA6IDxzdHJvbmc+e2Zvcm1hdEJ5VW5pdGUoZC5oaXN0LCB1bml0ZSl9PC9zdHJvbmc+PC9kaXY+fVxuICAgICAgICAgICAgICAgICAge2QucHJlZCAhPSBudWxsICYmIGQuYW5uZWUgPiAyMDI0ICYmIChcbiAgICAgICAgICAgICAgICAgICAgPD5cbiAgICAgICAgICAgICAgICAgICAgICA8ZGl2PlByw6lkaWN0aW9uIDogPHN0cm9uZz57Zm9ybWF0QnlVbml0ZShkLnByZWQsIHVuaXRlKX08L3N0cm9uZz48L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtZ3JheS01MDBcIj5JQyA5NSUgOiBbe2Zvcm1hdEJ5VW5pdGUoZC5pY19sb3dlciwgdW5pdGUpfSA7IHtmb3JtYXRCeVVuaXRlKGQuaWNfdXBwZXIsIHVuaXRlKX1dPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvPlxuICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgfX1cbiAgICAgICAgICAvPlxuICAgICAgICAgIDxBcmVhIHR5cGU9XCJtb25vdG9uZVwiIGRhdGFLZXk9XCJpY191cHBlclwiIHN0cm9rZT1cIm5vbmVcIiBmaWxsPXtPTElWRX0gZmlsbE9wYWNpdHk9ezAuMTB9IC8+XG4gICAgICAgICAgPEFyZWEgdHlwZT1cIm1vbm90b25lXCIgZGF0YUtleT1cImljX2xvd2VyXCIgc3Ryb2tlPVwibm9uZVwiIGZpbGw9XCIjZmZmXCIgZmlsbE9wYWNpdHk9ezF9IC8+XG4gICAgICAgICAgPFJlZmVyZW5jZUxpbmUgeD17MjAyNH0gc3Ryb2tlPVwiaHNsKDAsMCUsNzAlKVwiIHN0cm9rZURhc2hhcnJheT1cIjMgM1wiIC8+XG4gICAgICAgICAgPExpbmUgdHlwZT1cIm1vbm90b25lXCIgZGF0YUtleT1cImhpc3RcIiBzdHJva2U9e05BVll9IHN0cm9rZVdpZHRoPXsyfSBkb3Q9e3sgcjogMi41IH19IC8+XG4gICAgICAgICAgPExpbmUgdHlwZT1cIm1vbm90b25lXCIgZGF0YUtleT1cInByZWRcIiBzdHJva2U9e09MSVZFfSBzdHJva2VXaWR0aD17Mn1cbiAgICAgICAgICAgIHN0cm9rZURhc2hhcnJheT1cIjYgM1wiIGRvdD17eyByOiAyLjUgfX0gLz5cbiAgICAgICAgPC9Db21wb3NlZENoYXJ0PlxuICAgICAgPC9SZXNwb25zaXZlQ29udGFpbmVyPlxuICAgIDwvZGl2PlxuICApXG59XG5cbi8vIOKUgOKUgCBPbmdsZXRzIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxudHlwZSBUYWJJZCA9ICdvdmVydmlldycgfCAndHJhamVjdG9pcmVzJyB8ICdwYXlzJyB8ICd2YXJpYWJsZScgfCAnY29tcGFyYWlzb24nIHwgJ2NhcnRlJ1xuXG5jb25zdCBUQUJTOiB7IGlkOiBUYWJJZDsgbGFiZWw6IHN0cmluZzsgaWNvbjogc3RyaW5nIH1bXSA9IFtcbiAgeyBpZDogJ292ZXJ2aWV3JywgbGFiZWw6IFwiVnVlIGQnZW5zZW1ibGVcIiwgaWNvbjogJ/CflK4nIH0sXG4gIHsgaWQ6ICd0cmFqZWN0b2lyZXMnLCBsYWJlbDogJ1RyYWplY3RvaXJlcycsIGljb246ICfwn5OIJyB9LFxuICB7IGlkOiAncGF5cycsIGxhYmVsOiAnQW5hbHlzZSBwYXIgUGF5cycsIGljb246ICfwn4yNJyB9LFxuICB7IGlkOiAndmFyaWFibGUnLCBsYWJlbDogJ1BhciBWYXJpYWJsZScsIGljb246ICfwn5OKJyB9LFxuICB7IGlkOiAnY29tcGFyYWlzb24nLCBsYWJlbDogJ0NvbXBhcmFpc29uJywgaWNvbjogJ+Kalu+4jycgfSxcbiAgeyBpZDogJ2NhcnRlJywgbGFiZWw6ICdDYXJ0ZSAyMDMwJywgaWNvbjogJ/Cfl7rvuI8nIH0sXG5dXG5cbmZ1bmN0aW9uIFRhYk5hdih7IGFjdGl2ZSwgb25DaGFuZ2UgfTogeyBhY3RpdmU6IFRhYklkOyBvbkNoYW5nZTogKHQ6IFRhYklkKSA9PiB2b2lkIH0pIHtcbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXdoaXRlIHJvdW5kZWQteGwgb3ZlcmZsb3ctaGlkZGVuIG1iLTFcIlxuICAgICAgc3R5bGU9e3sgYm9yZGVyOiAnMXB4IHNvbGlkIGhzbCgwLDAlLDkwJSknLCBib3hTaGFkb3c6ICcwIDJweCA4cHggcmdiYSgwLDAsMCwwLjA1KScgfX0+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggb3ZlcmZsb3cteC1hdXRvIHNjcm9sbGJhci1oaWRlXCI+XG4gICAgICAgIHtUQUJTLm1hcCh0YWIgPT4ge1xuICAgICAgICAgIGNvbnN0IGlzQWN0aXZlID0gYWN0aXZlID09PSB0YWIuaWRcbiAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgPGJ1dHRvbiBrZXk9e3RhYi5pZH0gb25DbGljaz17KCkgPT4gb25DaGFuZ2UodGFiLmlkKX1cbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNSBweC00IHB5LTMgdGV4dC14cyBmb250LXNlbWlib2xkIHdoaXRlc3BhY2Utbm93cmFwIHRyYW5zaXRpb24tYWxsIHJlbGF0aXZlIGZsZXgtc2hyaW5rLTBcIlxuICAgICAgICAgICAgICBzdHlsZT17aXNBY3RpdmVcbiAgICAgICAgICAgICAgICA/IHsgY29sb3I6ICdoc2woODMsNTIlLDMwJSknLCBiYWNrZ3JvdW5kOiBPTElWRV84LCBib3JkZXJCb3R0b206IGAycHggc29saWQgJHtPTElWRX1gIH1cbiAgICAgICAgICAgICAgICA6IHsgY29sb3I6ICcjNmI3MjgwJywgYm9yZGVyQm90dG9tOiAnMnB4IHNvbGlkIHRyYW5zcGFyZW50JyB9XG4gICAgICAgICAgICAgIH0+XG4gICAgICAgICAgICAgIDxzcGFuPnt0YWIuaWNvbn08L3NwYW4+XG4gICAgICAgICAgICAgIDxzcGFuPnt0YWIubGFiZWx9PC9zcGFuPlxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgKVxuICAgICAgICB9KX1cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApXG59XG5cbmZ1bmN0aW9uIFRhYlByb2dyZXNzKHsgYWN0aXZlIH06IHsgYWN0aXZlOiBUYWJJZCB9KSB7XG4gIGNvbnN0IGlkeCA9IFRBQlMuZmluZEluZGV4KHQgPT4gdC5pZCA9PT0gYWN0aXZlKVxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNSBtYi00XCI+XG4gICAgICB7VEFCUy5tYXAoKF8sIGkpID0+IChcbiAgICAgICAgPGRpdiBrZXk9e2l9IGNsYXNzTmFtZT1cImgtMSByb3VuZGVkLWZ1bGwgdHJhbnNpdGlvbi1hbGxcIlxuICAgICAgICAgIHN0eWxlPXt7XG4gICAgICAgICAgICBmbGV4OiAxLFxuICAgICAgICAgICAgYmFja2dyb3VuZDogaSA9PT0gaWR4ID8gT0xJVkUgOiAoaSA8IGlkeCA/IE9MSVZFXzE1IDogJ2hzbCgwLDAlLDkwJSknKSxcbiAgICAgICAgICB9fSAvPlxuICAgICAgKSl9XG4gICAgPC9kaXY+XG4gIClcbn1cblxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG4vLyBDT01QT1NBTlQgUFJJTkNJUEFMXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gUHJlZGljdGlvbnNBeGUyKCkge1xuICBjb25zdCBbYWN0aXZlVGFiLCBzZXRBY3RpdmVUYWJdID0gdXNlU3RhdGU8VGFiSWQ+KCdvdmVydmlldycpXG4gIGNvbnN0IFttZXRhZGF0YSwgc2V0TWV0YWRhdGFdID0gdXNlU3RhdGU8TWV0YWRhdGEgfCBudWxsPihudWxsKVxuICBjb25zdCBbdmFsaWRhdGlvbiwgc2V0VmFsaWRhdGlvbl0gPSB1c2VTdGF0ZTxWYWxpZGF0aW9uTWV0cmljcyB8IG51bGw+KG51bGwpXG4gIGNvbnN0IFtsb2FkaW5nTWV0YSwgc2V0TG9hZGluZ01ldGFdID0gdXNlU3RhdGUodHJ1ZSlcbiAgY29uc3QgW2FjdGl2ZVJlZ2lvbiwgc2V0QWN0aXZlUmVnaW9uXSA9IHVzZVN0YXRlPHN0cmluZz4oJ2FsbCcpXG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2Nhci1tYWluLXNjcm9sbCcpPy5zY3JvbGxUbyh7IHRvcDogMCwgYmVoYXZpb3I6ICdpbnN0YW50JyB9KVxuICB9LCBbYWN0aXZlVGFiXSlcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIHNldExvYWRpbmdNZXRhKHRydWUpXG4gICAgUHJvbWlzZS5hbGwoW1xuICAgICAgYXBpLmdldDxNZXRhZGF0YT4oJy9wcmVkaWN0aW9ucy9heGUyL21ldGFkYXRhJykudGhlbihyID0+IHNldE1ldGFkYXRhKHIuZGF0YSkpLFxuICAgICAgYXBpLmdldDxWYWxpZGF0aW9uTWV0cmljcz4oJy9wcmVkaWN0aW9ucy9heGUyL3ZhbGlkYXRpb24nKS50aGVuKHIgPT4gc2V0VmFsaWRhdGlvbihyLmRhdGEpKSxcbiAgICBdKS5maW5hbGx5KCgpID0+IHNldExvYWRpbmdNZXRhKGZhbHNlKSlcbiAgfSwgW10pXG5cbiAgaWYgKGxvYWRpbmdNZXRhIHx8ICFtZXRhZGF0YSkge1xuICAgIHJldHVybiAoXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cInB4LTYgcHktNiBzcGFjZS15LTNcIj5cbiAgICAgICAgPFNrZWxldG9uQ2hhcnQgLz5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0yIG1kOmdyaWQtY29scy00IGdhcC0zXCI+XG4gICAgICAgICAge1suLi5BcnJheSg0KV0ubWFwKChfLCBpKSA9PiA8U2tlbGV0b25DYXJkIGtleT17aX0gLz4pfVxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIClcbiAgfVxuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJweC02IHB5LTVcIiBzdHlsZT17eyBiYWNrZ3JvdW5kOiAnaHNsKDIxMCwyMCUsOTglKScsIG1pbkhlaWdodDogJzEwMCUnIH19PlxuICAgICAgPEhlYWRlciBtZXRhZGF0YT17bWV0YWRhdGF9IHZhbGlkYXRpb249e3ZhbGlkYXRpb259IC8+XG5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctd2hpdGUgcm91bmRlZC14bCBwLTMgbWItNCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyBmbGV4LXdyYXBcIlxuICAgICAgICBzdHlsZT17eyBib3JkZXI6ICcxcHggc29saWQgaHNsKDAsMCUsOTAlKScgfX0+XG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteHMgZm9udC1zZW1pYm9sZCB0ZXh0LWdyYXktNjAwXCI+UsOpZ2lvbiA6PC9zcGFuPlxuICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IHNldEFjdGl2ZVJlZ2lvbignYWxsJyl9XG4gICAgICAgICAgY2xhc3NOYW1lPVwicHgtMyBweS0xIHJvdW5kZWQtZnVsbCB0ZXh0LVsxMXB4XSBmb250LXNlbWlib2xkIHRyYW5zaXRpb24tY29sb3JzXCJcbiAgICAgICAgICBzdHlsZT17YWN0aXZlUmVnaW9uID09PSAnYWxsJyA/IHsgYmFja2dyb3VuZDogT0xJVkUsIGNvbG9yOiAnd2hpdGUnIH0gOiB7IGJhY2tncm91bmQ6ICdoc2woMCwwJSw5MyUpJywgY29sb3I6ICcjNmI3MjgwJyB9fT5cbiAgICAgICAgICBUb3V0ZXNcbiAgICAgICAgPC9idXR0b24+XG4gICAgICAgIHttZXRhZGF0YS5yZWdpb25zLm1hcChyID0+IChcbiAgICAgICAgICA8YnV0dG9uIGtleT17cn0gb25DbGljaz17KCkgPT4gc2V0QWN0aXZlUmVnaW9uKHIpfVxuICAgICAgICAgICAgY2xhc3NOYW1lPVwicHgtMyBweS0xIHJvdW5kZWQtZnVsbCB0ZXh0LVsxMXB4XSBmb250LXNlbWlib2xkIHRyYW5zaXRpb24tY29sb3JzXCJcbiAgICAgICAgICAgIHN0eWxlPXthY3RpdmVSZWdpb24gPT09IHJcbiAgICAgICAgICAgICAgPyB7IGJhY2tncm91bmQ6IFJFR0lPTl9DT0xPUlNbcl0gPz8gT0xJVkUsIGNvbG9yOiAnd2hpdGUnIH1cbiAgICAgICAgICAgICAgOiB7IGJhY2tncm91bmQ6ICdoc2woMCwwJSw5MyUpJywgY29sb3I6ICcjNmI3MjgwJyB9fT5cbiAgICAgICAgICAgIHtyfVxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICApKX1cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8VGFiTmF2IGFjdGl2ZT17YWN0aXZlVGFifSBvbkNoYW5nZT17c2V0QWN0aXZlVGFifSAvPlxuICAgICAgPFRhYlByb2dyZXNzIGFjdGl2ZT17YWN0aXZlVGFifSAvPlxuXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImFuaW1hdGUtZmFkZS1pblwiPlxuICAgICAgICB7YWN0aXZlVGFiID09PSAnb3ZlcnZpZXcnICYmIDxPdmVydmlld1RhYiBhY3RpdmVSZWdpb249e2FjdGl2ZVJlZ2lvbn0gLz59XG4gICAgICAgIHthY3RpdmVUYWIgPT09ICd0cmFqZWN0b2lyZXMnICYmIDxUcmFqZWN0b2lyZXNUYWIgbWV0YWRhdGE9e21ldGFkYXRhfSAvPn1cbiAgICAgICAge2FjdGl2ZVRhYiA9PT0gJ3BheXMnICYmIDxQYXlzVGFiIG1ldGFkYXRhPXttZXRhZGF0YX0gdmFsaWRhdGlvbj17dmFsaWRhdGlvbn0gc2V0VmFsaWRhdGlvbj17c2V0VmFsaWRhdGlvbn0gLz59XG4gICAgICAgIHthY3RpdmVUYWIgPT09ICd2YXJpYWJsZScgJiYgPFZhcmlhYmxlVGFiIG1ldGFkYXRhPXttZXRhZGF0YX0gLz59XG4gICAgICAgIHthY3RpdmVUYWIgPT09ICdjb21wYXJhaXNvbicgJiYgPENvbXBhcmFpc29uVGFiIG1ldGFkYXRhPXttZXRhZGF0YX0gLz59XG4gICAgICAgIHthY3RpdmVUYWIgPT09ICdjYXJ0ZScgJiYgPENhcnRlVGFiIG1ldGFkYXRhPXttZXRhZGF0YX0gLz59XG4gICAgICA8L2Rpdj5cblxuICAgICAgPHN0eWxlPntgXG4gICAgICAgIEBrZXlmcmFtZXMgZmFkZS1pbiB7XG4gICAgICAgICAgZnJvbSB7IG9wYWNpdHk6IDA7IHRyYW5zZm9ybTogdHJhbnNsYXRlWSg0cHgpOyB9XG4gICAgICAgICAgdG8geyBvcGFjaXR5OiAxOyB0cmFuc2Zvcm06IHRyYW5zbGF0ZVkoMCk7IH1cbiAgICAgICAgfVxuICAgICAgICAuYW5pbWF0ZS1mYWRlLWluIHsgYW5pbWF0aW9uOiBmYWRlLWluIDAuMjVzIGVhc2Utb3V0OyB9XG4gICAgICAgIC5zY3JvbGxiYXItaGlkZTo6LXdlYmtpdC1zY3JvbGxiYXIgeyBkaXNwbGF5OiBub25lOyB9XG4gICAgICAgIC5zY3JvbGxiYXItaGlkZSB7IC1tcy1vdmVyZmxvdy1zdHlsZTogbm9uZTsgc2Nyb2xsYmFyLXdpZHRoOiBub25lOyB9XG4gICAgICBgfTwvc3R5bGU+XG4gICAgPC9kaXY+XG4gIClcbn1cblxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG4vLyBIRUFERVJcbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuXG5mdW5jdGlvbiBIZWFkZXIoeyBtZXRhZGF0YSwgdmFsaWRhdGlvbiB9OiB7IG1ldGFkYXRhOiBNZXRhZGF0YTsgdmFsaWRhdGlvbjogVmFsaWRhdGlvbk1ldHJpY3MgfCBudWxsIH0pIHtcbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cInJvdW5kZWQtMnhsIHAtNSBtYi00XCJcbiAgICAgIHN0eWxlPXt7XG4gICAgICAgIGJhY2tncm91bmQ6IGBsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCAke09MSVZFfSAwJSwgaHNsKDgzLDUyJSwyOCUpIDEwMCUpYCxcbiAgICAgICAgYm94U2hhZG93OiAnMCA4cHggMzJweCBoc2xhKDgzLDQwJSwyMCUsMC4xOCknLFxuICAgICAgfX0+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtc3RhcnQganVzdGlmeS1iZXR3ZWVuIGZsZXgtd3JhcCBnYXAtM1wiPlxuICAgICAgICA8ZGl2PlxuICAgICAgICAgIDxoMSBjbGFzc05hbWU9XCJ0ZXh0LTJ4bCBmb250LWJvbGQgdGV4dC13aGl0ZSBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICAg8J+UriBQcsOpZGljdGlvbnMgTWFyY2jDqXMgQWZyaWNhaW5zIDIwMzBcbiAgICAgICAgICA8L2gxPlxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtd2hpdGUvODUgdGV4dC1zbSBtdC0xXCI+XG4gICAgICAgICAgICBNb2TDqGxlIGh5YnJpZGUgwrcge21ldGFkYXRhLnBheXMubGVuZ3RofSBwYXlzIMK3IHttZXRhZGF0YS50YXJnZXRfdmFycy5sZW5ndGh9IHZhcmlhYmxlcyDCt1xuICAgICAgICAgICAgSG9yaXpvbnMge21ldGFkYXRhLmFubmVlc19wcmVkaWN0aW9uWzBdfeKAk3ttZXRhZGF0YS5hbm5lZXNfcHJlZGljdGlvblttZXRhZGF0YS5hbm5lZXNfcHJlZGljdGlvbi5sZW5ndGggLSAxXX1cbiAgICAgICAgICA8L3A+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC13cmFwIGdhcC0xLjUgaXRlbXMtY2VudGVyXCI+XG4gICAgICAgICAge21ldGFkYXRhLmF4Y29fbG9hZGVkID8gKFxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjUgcHgtMi41IHB5LTEgcm91bmRlZC1mdWxsIHRleHQtWzExcHhdIGZvbnQtc2VtaWJvbGRcIlxuICAgICAgICAgICAgICBzdHlsZT17eyBiYWNrZ3JvdW5kOiAnaHNsYSgxNDAsNTUlLDQwJSwwLjk1KScsIGNvbG9yOiAnd2hpdGUnIH19XG4gICAgICAgICAgICAgIHRpdGxlPXttZXRhZGF0YS5heGNvX2ZpbGVuYW1lID8/ICcnfT5cbiAgICAgICAgICAgICAgPENoZWNrQ2lyY2xlMiBzaXplPXsxMn0gLz4gQXhjbyBOYXZpZ2F0b3JcbiAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICApIDogKFxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjUgcHgtMi41IHB5LTEgcm91bmRlZC1mdWxsIHRleHQtWzExcHhdIGZvbnQtc2VtaWJvbGRcIlxuICAgICAgICAgICAgICBzdHlsZT17eyBiYWNrZ3JvdW5kOiAnaHNsYSgzMCw4OCUsNTYlLDAuOTUpJywgY29sb3I6ICd3aGl0ZScgfX0+XG4gICAgICAgICAgICAgIDxaYXAgc2l6ZT17MTJ9IC8+IE1vZMOobGUgTUwgcHVyXG4gICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgKX1cbiAgICAgICAgICB7dmFsaWRhdGlvbj8uY29oZXJlbmNlX3Rlc3RzLmJvdW5kc19vayAmJiB2YWxpZGF0aW9uPy5jb2hlcmVuY2VfdGVzdHMuaWNfb2sgJiYgKFxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjUgcHgtMi41IHB5LTEgcm91bmRlZC1mdWxsIHRleHQtWzExcHhdIGZvbnQtc2VtaWJvbGRcIlxuICAgICAgICAgICAgICBzdHlsZT17eyBiYWNrZ3JvdW5kOiAnaHNsYSgyMTMsNjAlLDMwJSwwLjg1KScsIGNvbG9yOiAnd2hpdGUnIH19PlxuICAgICAgICAgICAgICA8Q2hlY2tDaXJjbGUyIHNpemU9ezEyfSAvPiBDb2jDqXJlbmNlIHZhbGlkw6llXG4gICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgKX1cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtd3JhcCBnYXAtMS41IG10LTNcIj5cbiAgICAgICAge1tcbiAgICAgICAgICAnRkUtT0xTICsgUmlkZ2UnLFxuICAgICAgICAgICdHYXVzc2lhbiBQcm9jZXNzJyxcbiAgICAgICAgICAnWEdCb29zdCByw6lzaWR1cycsXG4gICAgICAgICAgJ0NvbmZvcm1hbCBQcmVkaWN0aW9uIElDIDk1JScsXG4gICAgICAgIF0ubWFwKChiLCBpKSA9PiAoXG4gICAgICAgICAgPHNwYW4ga2V5PXtpfSBjbGFzc05hbWU9XCJpbmxpbmUtZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEgcHgtMiBweS0wLjUgcm91bmRlZCB0ZXh0LVsxMHB4XSBmb250LW1vbm8gZm9udC1zZW1pYm9sZCBiYWNrZHJvcC1ibHVyXCJcbiAgICAgICAgICAgIHN0eWxlPXt7IGJhY2tncm91bmQ6ICdoc2xhKDAsMCUsMTAwJSwwLjIwKScsIGNvbG9yOiAnd2hpdGUnLCBib3JkZXI6ICcxcHggc29saWQgaHNsYSgwLDAlLDEwMCUsMC4yNSknIH19PlxuICAgICAgICAgICAge2J9XG4gICAgICAgICAgPC9zcGFuPlxuICAgICAgICApKX1cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApXG59XG5cbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuLy8gVEFCIDEg4oCUIE9WRVJWSUVXXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcblxuZnVuY3Rpb24gT3ZlcnZpZXdUYWIoeyBhY3RpdmVSZWdpb24gfTogeyBhY3RpdmVSZWdpb246IHN0cmluZyB9KSB7XG4gIGNvbnN0IFtyb3dzLCBzZXRSb3dzXSA9IHVzZVN0YXRlPE92ZXJ2aWV3Um93W10gfCBudWxsPihudWxsKVxuICBjb25zdCBbbG9hZGluZywgc2V0TG9hZGluZ10gPSB1c2VTdGF0ZSh0cnVlKVxuICBjb25zdCBbcGFnZSwgc2V0UGFnZV0gPSB1c2VTdGF0ZSgwKVxuICBjb25zdCBbc29ydEtleSwgc2V0U29ydEtleV0gPSB1c2VTdGF0ZTxrZXlvZiBPdmVydmlld1Jvdz4oJ252X3ByaW1lc18yMDMwJylcbiAgY29uc3QgW3NvcnREaXIsIHNldFNvcnREaXJdID0gdXNlU3RhdGU8J2FzYycgfCAnZGVzYyc+KCdkZXNjJylcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIHNldExvYWRpbmcodHJ1ZSlcbiAgICBhcGkuZ2V0PE92ZXJ2aWV3Um93W10+KCcvcHJlZGljdGlvbnMvYXhlMi9vdmVydmlldycpXG4gICAgICAudGhlbihyID0+IHNldFJvd3Moci5kYXRhKSlcbiAgICAgIC5maW5hbGx5KCgpID0+IHNldExvYWRpbmcoZmFsc2UpKVxuICB9LCBbXSlcblxuICBjb25zdCBmaWx0ZXJlZCA9IHVzZU1lbW8oKCkgPT4ge1xuICAgIGlmICghcm93cykgcmV0dXJuIFtdXG4gICAgaWYgKGFjdGl2ZVJlZ2lvbiA9PT0gJ2FsbCcpIHJldHVybiByb3dzXG4gICAgcmV0dXJuIHJvd3MuZmlsdGVyKHIgPT4gci5yZWdpb24gPT09IGFjdGl2ZVJlZ2lvbilcbiAgfSwgW3Jvd3MsIGFjdGl2ZVJlZ2lvbl0pXG5cbiAgY29uc3Qgc29ydGVkID0gdXNlTWVtbygoKSA9PiB7XG4gICAgcmV0dXJuIFsuLi5maWx0ZXJlZF0uc29ydCgoYSwgYikgPT4ge1xuICAgICAgY29uc3QgYXYgPSBhW3NvcnRLZXldIGFzIGFueVxuICAgICAgY29uc3QgYnYgPSBiW3NvcnRLZXldIGFzIGFueVxuICAgICAgaWYgKGF2ID09IG51bGwpIHJldHVybiAxXG4gICAgICBpZiAoYnYgPT0gbnVsbCkgcmV0dXJuIC0xXG4gICAgICBpZiAodHlwZW9mIGF2ID09PSAnc3RyaW5nJyAmJiB0eXBlb2YgYnYgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBzb3J0RGlyID09PSAnYXNjJyA/IGF2LmxvY2FsZUNvbXBhcmUoYnYpIDogYnYubG9jYWxlQ29tcGFyZShhdilcbiAgICAgIH1cbiAgICAgIHJldHVybiBzb3J0RGlyID09PSAnYXNjJyA/IGF2IC0gYnYgOiBidiAtIGF2XG4gICAgfSlcbiAgfSwgW2ZpbHRlcmVkLCBzb3J0S2V5LCBzb3J0RGlyXSlcblxuICBjb25zdCB0b3RhbFByaW1lczIwMzAgPSB1c2VNZW1vKCgpID0+IGZpbHRlcmVkLnJlZHVjZSgocywgcikgPT4gcyArIChyLm52X3ByaW1lc18yMDMwID8/IDApLCAwKSwgW2ZpbHRlcmVkXSlcbiAgY29uc3QgbWVkaWFuR3Jvd3RoID0gdXNlTWVtbygoKSA9PiB7XG4gICAgY29uc3QgdmFscyA9IGZpbHRlcmVkLm1hcChyID0+IHIubnZfcHJpbWVzX3Zhcl9wY3QpLmZpbHRlcigodik6IHYgaXMgbnVtYmVyID0+IHYgIT0gbnVsbCkuc29ydCgoYSwgYikgPT4gYSAtIGIpXG4gICAgaWYgKCF2YWxzLmxlbmd0aCkgcmV0dXJuIG51bGxcbiAgICByZXR1cm4gdmFsc1tNYXRoLmZsb29yKHZhbHMubGVuZ3RoIC8gMildXG4gIH0sIFtmaWx0ZXJlZF0pXG4gIGNvbnN0IGJlc3RQZW5ldHJhdGlvbiA9IHVzZU1lbW8oKCkgPT4ge1xuICAgIGxldCBiZXN0ID0geyBwYXlzOiAn4oCUJywgdmFsOiAwIH1cbiAgICBmaWx0ZXJlZC5mb3JFYWNoKHIgPT4ge1xuICAgICAgaWYgKChyLm52X3BlbmV0cmF0aW9uXzIwMzAgPz8gMCkgPiBiZXN0LnZhbCkgYmVzdCA9IHsgcGF5czogci5wYXlzLCB2YWw6IHIubnZfcGVuZXRyYXRpb25fMjAzMCA/PyAwIH1cbiAgICB9KVxuICAgIHJldHVybiBiZXN0XG4gIH0sIFtmaWx0ZXJlZF0pXG4gIGNvbnN0IG1lZGlhblNQID0gdXNlTWVtbygoKSA9PiB7XG4gICAgY29uc3QgdmFscyA9IGZpbHRlcmVkLm1hcChyID0+IHIubnZfc3BfMjAzMCkuZmlsdGVyKCh2KTogdiBpcyBudW1iZXIgPT4gdiAhPSBudWxsKS5zb3J0KChhLCBiKSA9PiBhIC0gYilcbiAgICBpZiAoIXZhbHMubGVuZ3RoKSByZXR1cm4gbnVsbFxuICAgIHJldHVybiB2YWxzW01hdGguZmxvb3IodmFscy5sZW5ndGggLyAyKV1cbiAgfSwgW2ZpbHRlcmVkXSlcblxuICBjb25zdCB0b3AxMCA9IHVzZU1lbW8oKCkgPT4ge1xuICAgIHJldHVybiBbLi4uZmlsdGVyZWRdXG4gICAgICAuc29ydCgoYSwgYikgPT4gKGIubnZfcHJpbWVzXzIwMzAgPz8gMCkgLSAoYS5udl9wcmltZXNfMjAzMCA/PyAwKSlcbiAgICAgIC5zbGljZSgwLCAxMClcbiAgICAgIC5tYXAociA9PiAoe1xuICAgICAgICBwYXlzOiByLnBheXMsXG4gICAgICAgIG52OiByLm52X3ByaW1lc18yMDMwID8/IDAsXG4gICAgICAgIHZpZTogci52aWVfcHJpbWVzXzIwMzAgPz8gMCxcbiAgICAgICAgcmVnaW9uOiByLnJlZ2lvbixcbiAgICAgIH0pKVxuICB9LCBbZmlsdGVyZWRdKVxuXG4gIGlmIChsb2FkaW5nIHx8ICFyb3dzKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwic3BhY2UteS00XCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMiBtZDpncmlkLWNvbHMtNCBnYXAtM1wiPlxuICAgICAgICAgIHtbLi4uQXJyYXkoNCldLm1hcCgoXywgaSkgPT4gPFNrZWxldG9uQ2FyZCBrZXk9e2l9IC8+KX1cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxTa2VsZXRvbkNoYXJ0IC8+XG4gICAgICA8L2Rpdj5cbiAgICApXG4gIH1cblxuICBjb25zdCBQQUdFX1NJWkUgPSAxNVxuICBjb25zdCB0b3RhbFBhZ2VzID0gTWF0aC5tYXgoMSwgTWF0aC5jZWlsKHNvcnRlZC5sZW5ndGggLyBQQUdFX1NJWkUpKVxuICBjb25zdCBwYWdlUm93cyA9IHNvcnRlZC5zbGljZShwYWdlICogUEFHRV9TSVpFLCAocGFnZSArIDEpICogUEFHRV9TSVpFKVxuXG4gIGZ1bmN0aW9uIGNoYW5nZVNvcnQoa2V5OiBrZXlvZiBPdmVydmlld1Jvdykge1xuICAgIGlmIChzb3J0S2V5ID09PSBrZXkpIHNldFNvcnREaXIoc29ydERpciA9PT0gJ2FzYycgPyAnZGVzYycgOiAnYXNjJylcbiAgICBlbHNlIHsgc2V0U29ydEtleShrZXkpOyBzZXRTb3J0RGlyKCdkZXNjJykgfVxuICB9XG5cbiAgY29uc3Qgc29ydEljb24gPSAoa2V5OiBrZXlvZiBPdmVydmlld1JvdykgPT5cbiAgICBzb3J0S2V5ID09PSBrZXkgPyAoc29ydERpciA9PT0gJ2FzYycgPyAn4oaRJyA6ICfihpMnKSA6ICcnXG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cInNwYWNlLXktNFwiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0yIG1kOmdyaWQtY29scy00IGdhcC0zXCI+XG4gICAgICAgIDxLcGlDYXJkIGxhYmVsPVwiUHJpbWVzIE5vbi1WaWUgMjAzMFwiIHZhbHVlPXtmbXRNbih0b3RhbFByaW1lczIwMzApfSBzdWJ0aXRsZT17YCR7ZmlsdGVyZWQubGVuZ3RofSBwYXlzYH0gYWNjZW50PXtOQVZZfSAvPlxuICAgICAgICA8S3BpQ2FyZCBsYWJlbD1cIkNyb2lzc2FuY2UgbcOpZGlhbmUgcHJpbWVzIE5WXCIgdmFsdWU9e2ZtdFBjdFNnbihtZWRpYW5Hcm93dGgpfSBzdWJ0aXRsZT1cIjIwMjQg4oaSIDIwMzBcIiBhY2NlbnQ9e0dSRUVOfSAvPlxuICAgICAgICA8S3BpQ2FyZCBsYWJlbD1cIk1laWxsZXVyZSBww6luw6l0cmF0aW9uIE5WIDIwMzBcIiB2YWx1ZT17Zm10UGN0KGJlc3RQZW5ldHJhdGlvbi52YWwsIDIpfSBzdWJ0aXRsZT17YmVzdFBlbmV0cmF0aW9uLnBheXN9IGFjY2VudD17T0xJVkV9IC8+XG4gICAgICAgIDxLcGlDYXJkIGxhYmVsPVwiUmF0aW8gUy9QIG3DqWRpYW4gMjAzMFwiIHZhbHVlPXtmbXRQY3QobWVkaWFuU1AsIDEpfSBzdWJ0aXRsZT17ZmlsdGVyZWQubGVuZ3RoID4gMCA/ICdOb24tVmllJyA6ICfigJQnfSBhY2NlbnQ9e09SQU5HRX0gLz5cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXdoaXRlIHJvdW5kZWQteGwgcC00XCIgc3R5bGU9e3sgYm9yZGVyOiAnMXB4IHNvbGlkIGhzbCgwLDAlLDkwJSknIH19PlxuICAgICAgICA8U2VjdGlvblRpdGxlPlRvcCAxMCBtYXJjaMOpcyBhZnJpY2FpbnMgMjAzMCAocHJpbWVzIE5vbi1WaWUgKyBWaWUpPC9TZWN0aW9uVGl0bGU+XG4gICAgICAgIDxSZXNwb25zaXZlQ29udGFpbmVyIHdpZHRoPVwiMTAwJVwiIGhlaWdodD17NDAwfT5cbiAgICAgICAgICA8QmFyQ2hhcnQgZGF0YT17dG9wMTB9IGxheW91dD1cInZlcnRpY2FsXCIgbWFyZ2luPXt7IHRvcDogMTAsIHJpZ2h0OiAzMCwgbGVmdDogODAsIGJvdHRvbTogMCB9fT5cbiAgICAgICAgICAgIDxDYXJ0ZXNpYW5HcmlkIHN0cm9rZURhc2hhcnJheT1cIjMgM1wiIHN0cm9rZT1cImhzbCgwLDAlLDkzJSlcIiAvPlxuICAgICAgICAgICAgPFhBeGlzIHR5cGU9XCJudW1iZXJcIiB0aWNrPXt7IGZvbnRTaXplOiAxMCB9fSB0aWNrRm9ybWF0dGVyPXt2ID0+IGZtdE1uKHYpfSAvPlxuICAgICAgICAgICAgPFlBeGlzIHR5cGU9XCJjYXRlZ29yeVwiIGRhdGFLZXk9XCJwYXlzXCIgdGljaz17eyBmb250U2l6ZTogMTEgfX0gd2lkdGg9ezc1fSAvPlxuICAgICAgICAgICAgPFRvb2x0aXBcbiAgICAgICAgICAgICAgY29udGVudD17KHsgcGF5bG9hZCwgbGFiZWwgfSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghcGF5bG9hZCB8fCAhcGF5bG9hZC5sZW5ndGgpIHJldHVybiBudWxsXG4gICAgICAgICAgICAgICAgY29uc3QgZDogYW55ID0gcGF5bG9hZFswXS5wYXlsb2FkXG4gICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctd2hpdGUgcHgtMyBweS0yIHJvdW5kZWQgc2hhZG93IHRleHQteHNcIlxuICAgICAgICAgICAgICAgICAgICBzdHlsZT17eyBib3JkZXI6ICcxcHggc29saWQgaHNsKDAsMCUsODUlKScgfX0+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZm9udC1ib2xkIHRleHQtZ3JheS04MDAgbWItMVwiPntsYWJlbH08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LWdyYXktNTAwIG1iLTFcIj57ZC5yZWdpb259PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXY+Tm9uLVZpZSA6IDxzdHJvbmc+e2ZtdE1uKGQubnYpfTwvc3Ryb25nPjwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2PlZpZSA6IDxzdHJvbmc+e2ZtdE1uKGQudmllKX08L3N0cm9uZz48L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJib3JkZXItdCBtdC0xIHB0LTFcIj5Ub3RhbCA6IDxzdHJvbmc+e2ZtdE1uKGQubnYgKyBkLnZpZSl9PC9zdHJvbmc+PC9kaXY+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAvPlxuICAgICAgICAgICAgPExlZ2VuZCB2ZXJ0aWNhbEFsaWduPVwidG9wXCIgaGVpZ2h0PXsyOH0gaWNvblNpemU9ezEwfSB3cmFwcGVyU3R5bGU9e3sgZm9udFNpemU6IDExIH19IC8+XG4gICAgICAgICAgICA8QmFyIGRhdGFLZXk9XCJudlwiIG5hbWU9XCJOb24tVmllIDIwMzBcIiBzdGFja0lkPVwiYVwiIGZpbGw9e09MSVZFfSAvPlxuICAgICAgICAgICAgPEJhciBkYXRhS2V5PVwidmllXCIgbmFtZT1cIlZpZSAyMDMwXCIgc3RhY2tJZD1cImFcIiBmaWxsPXtOQVZZfSAvPlxuICAgICAgICAgIDwvQmFyQ2hhcnQ+XG4gICAgICAgIDwvUmVzcG9uc2l2ZUNvbnRhaW5lcj5cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXdoaXRlIHJvdW5kZWQteGwgcC00XCIgc3R5bGU9e3sgYm9yZGVyOiAnMXB4IHNvbGlkIGhzbCgwLDAlLDkwJSknIH19PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBmbGV4LXdyYXAgZ2FwLTIgbWItM1wiPlxuICAgICAgICAgIDxTZWN0aW9uVGl0bGU+U3ludGjDqHNlIHtmaWx0ZXJlZC5sZW5ndGh9IHBheXMg4oCUIDIwMjQgdnMgMjAzMDwvU2VjdGlvblRpdGxlPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJvdmVyZmxvdy14LWF1dG9cIj5cbiAgICAgICAgICA8dGFibGUgY2xhc3NOYW1lPVwidy1mdWxsIHRleHQteHNcIj5cbiAgICAgICAgICAgIDx0aGVhZD5cbiAgICAgICAgICAgICAgPHRyIGNsYXNzTmFtZT1cImJvcmRlci1iLTJcIiBzdHlsZT17eyBib3JkZXJDb2xvcjogT0xJVkVfMTUgfX0+XG4gICAgICAgICAgICAgICAgPHRoIGNsYXNzTmFtZT1cInRleHQtbGVmdCBweS0yIHB4LTIgY3Vyc29yLXBvaW50ZXIgaG92ZXI6YmctZ3JheS01MFwiIG9uQ2xpY2s9eygpID0+IGNoYW5nZVNvcnQoJ3BheXMnKX0+UGF5cyB7c29ydEljb24oJ3BheXMnKX08L3RoPlxuICAgICAgICAgICAgICAgIDx0aCBjbGFzc05hbWU9XCJ0ZXh0LWxlZnQgcHktMiBweC0yXCI+UsOpZ2lvbjwvdGg+XG4gICAgICAgICAgICAgICAgPHRoIGNsYXNzTmFtZT1cInRleHQtcmlnaHQgcHktMiBweC0yIGN1cnNvci1wb2ludGVyIGhvdmVyOmJnLWdyYXktNTBcIiBvbkNsaWNrPXsoKSA9PiBjaGFuZ2VTb3J0KCdudl9wcmltZXNfMjAzMCcpfT5QcmltZXMgTlYgMjAzMCB7c29ydEljb24oJ252X3ByaW1lc18yMDMwJyl9PC90aD5cbiAgICAgICAgICAgICAgICA8dGggY2xhc3NOYW1lPVwidGV4dC1yaWdodCBweS0yIHB4LTIgY3Vyc29yLXBvaW50ZXIgaG92ZXI6YmctZ3JheS01MFwiIG9uQ2xpY2s9eygpID0+IGNoYW5nZVNvcnQoJ252X3ByaW1lc192YXJfcGN0Jyl9PlZhciAlIHtzb3J0SWNvbignbnZfcHJpbWVzX3Zhcl9wY3QnKX08L3RoPlxuICAgICAgICAgICAgICAgIDx0aCBjbGFzc05hbWU9XCJ0ZXh0LXJpZ2h0IHB5LTIgcHgtMiBjdXJzb3ItcG9pbnRlciBob3ZlcjpiZy1ncmF5LTUwXCIgb25DbGljaz17KCkgPT4gY2hhbmdlU29ydCgnbnZfcGVuZXRyYXRpb25fMjAzMCcpfT5Qw6luw6l0LiBOViB7c29ydEljb24oJ252X3BlbmV0cmF0aW9uXzIwMzAnKX08L3RoPlxuICAgICAgICAgICAgICAgIDx0aCBjbGFzc05hbWU9XCJ0ZXh0LXJpZ2h0IHB5LTIgcHgtMiBjdXJzb3ItcG9pbnRlciBob3ZlcjpiZy1ncmF5LTUwXCIgb25DbGljaz17KCkgPT4gY2hhbmdlU29ydCgnbnZfc3BfMjAzMCcpfT5TL1AgTlYge3NvcnRJY29uKCdudl9zcF8yMDMwJyl9PC90aD5cbiAgICAgICAgICAgICAgICA8dGggY2xhc3NOYW1lPVwidGV4dC1yaWdodCBweS0yIHB4LTIgY3Vyc29yLXBvaW50ZXIgaG92ZXI6YmctZ3JheS01MFwiIG9uQ2xpY2s9eygpID0+IGNoYW5nZVNvcnQoJ2dkcGNhcF8yMDMwJyl9PlBJQi9oYWIge3NvcnRJY29uKCdnZHBjYXBfMjAzMCcpfTwvdGg+XG4gICAgICAgICAgICAgICAgPHRoIGNsYXNzTmFtZT1cInRleHQtcmlnaHQgcHktMiBweC0yIGN1cnNvci1wb2ludGVyIGhvdmVyOmJnLWdyYXktNTBcIiBvbkNsaWNrPXsoKSA9PiBjaGFuZ2VTb3J0KCdwb2xzdGFiXzIwMzAnKX0+U3RhYi4gUG9sLiB7c29ydEljb24oJ3BvbHN0YWJfMjAzMCcpfTwvdGg+XG4gICAgICAgICAgICAgICAgPHRoIGNsYXNzTmFtZT1cInRleHQtcmlnaHQgcHktMiBweC0yIGN1cnNvci1wb2ludGVyIGhvdmVyOmJnLWdyYXktNTBcIiBvbkNsaWNrPXsoKSA9PiBjaGFuZ2VTb3J0KCd2aWVfcHJpbWVzXzIwMzAnKX0+UHJpbWVzIFZpZSB7c29ydEljb24oJ3ZpZV9wcmltZXNfMjAzMCcpfTwvdGg+XG4gICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICA8L3RoZWFkPlxuICAgICAgICAgICAgPHRib2R5PlxuICAgICAgICAgICAgICB7cGFnZVJvd3MubWFwKChyKSA9PiAoXG4gICAgICAgICAgICAgICAgPHRyIGtleT17ci5wYXlzfSBjbGFzc05hbWU9XCJib3JkZXItYiBob3ZlcjpiZy1ncmF5LTUwXCIgc3R5bGU9e3sgYm9yZGVyQ29sb3I6ICdoc2woMCwwJSw5NSUpJyB9fT5cbiAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzc05hbWU9XCJweS0xLjUgcHgtMiBmb250LXNlbWlib2xkIHRleHQtZ3JheS04MDBcIj57ci5wYXlzfTwvdGQ+XG4gICAgICAgICAgICAgICAgICA8dGQgY2xhc3NOYW1lPVwicHktMS41IHB4LTJcIj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiaW5saW5lLWJsb2NrIHctMiBoLTIgcm91bmRlZC1mdWxsIG1yLTEuNVwiXG4gICAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgYmFja2dyb3VuZDogUkVHSU9OX0NPTE9SU1tyLnJlZ2lvbl0gPz8gR1JBWSB9fSAvPlxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LWdyYXktNjAwXCI+e3IucmVnaW9ufTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgICA8dGQgY2xhc3NOYW1lPVwicHktMS41IHB4LTIgdGV4dC1yaWdodCBmb250LW1vbm9cIlxuICAgICAgICAgICAgICAgICAgICB0aXRsZT17ci5udl9wcmltZXNfaWNfbG93ICE9IG51bGwgPyBgSUMgOTUlOiBbJHtmbXRNbihyLm52X3ByaW1lc19pY19sb3cpfSA7ICR7Zm10TW4oci5udl9wcmltZXNfaWNfdXApfV1gIDogJyd9PlxuICAgICAgICAgICAgICAgICAgICB7Zm10TW4oci5udl9wcmltZXNfMjAzMCl9XG4gICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInB5LTEuNSBweC0yIHRleHQtcmlnaHRcIj5cbiAgICAgICAgICAgICAgICAgICAgPERlbHRhQmFkZ2Ugdj17ci5udl9wcmltZXNfdmFyX3BjdH0gc2Vuc0Zhdm9yYWJsZT1cImhhdXNzZVwiIC8+XG4gICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInB5LTEuNSBweC0yIHRleHQtcmlnaHQgZm9udC1tb25vXCJcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU9e3IubnZfcGVuZXRyYXRpb25faWNfbG93ICE9IG51bGwgPyBgSUMgOTUlOiBbJHtmbXRQY3Qoci5udl9wZW5ldHJhdGlvbl9pY19sb3csIDIpfSA7ICR7Zm10UGN0KHIubnZfcGVuZXRyYXRpb25faWNfdXAsIDIpfV1gIDogJyd9PlxuICAgICAgICAgICAgICAgICAgICB7Zm10UGN0KHIubnZfcGVuZXRyYXRpb25fMjAzMCwgMil9XG4gICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInB5LTEuNSBweC0yIHRleHQtcmlnaHQgZm9udC1tb25vXCJcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU9e3IubnZfc3BfaWNfbG93ICE9IG51bGwgPyBgSUMgOTUlOiBbJHtmbXRQY3Qoci5udl9zcF9pY19sb3csIDEpfSA7ICR7Zm10UGN0KHIubnZfc3BfaWNfdXAsIDEpfV1gIDogJyd9PlxuICAgICAgICAgICAgICAgICAgICB7Zm10UGN0KHIubnZfc3BfMjAzMCwgMSl9XG4gICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInB5LTEuNSBweC0yIHRleHQtcmlnaHQgZm9udC1tb25vXCJcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU9e3IuZ2RwY2FwX2ljX2xvdyAhPSBudWxsID8gYElDIDk1JTogWyR7Zm10VXNkKHIuZ2RwY2FwX2ljX2xvdyl9IDsgJHtmbXRVc2Qoci5nZHBjYXBfaWNfdXApfV1gIDogJyd9PlxuICAgICAgICAgICAgICAgICAgICB7Zm10VXNkKHIuZ2RwY2FwXzIwMzApfVxuICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzc05hbWU9XCJweS0xLjUgcHgtMiB0ZXh0LXJpZ2h0IGZvbnQtbW9ub1wiPntmbXRXZ2koci5wb2xzdGFiXzIwMzApfTwvdGQ+XG4gICAgICAgICAgICAgICAgICA8dGQgY2xhc3NOYW1lPVwicHktMS41IHB4LTIgdGV4dC1yaWdodCBmb250LW1vbm9cIj57Zm10TW4oci52aWVfcHJpbWVzXzIwMzApfTwvdGQ+XG4gICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICA8L3Rib2R5PlxuICAgICAgICAgIDwvdGFibGU+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICB7dG90YWxQYWdlcyA+IDEgJiYgKFxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIG10LTMgdGV4dC14cyB0ZXh0LWdyYXktNjAwXCI+XG4gICAgICAgICAgICA8c3Bhbj5QYWdlIHtwYWdlICsgMX0gLyB7dG90YWxQYWdlc308L3NwYW4+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZ2FwLTFcIj5cbiAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBzZXRQYWdlKE1hdGgubWF4KDAsIHBhZ2UgLSAxKSl9IGRpc2FibGVkPXtwYWdlID09PSAwfVxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInB4LTIgcHktMSByb3VuZGVkIGJvcmRlciBkaXNhYmxlZDpvcGFjaXR5LTMwXCI+4oC5PC9idXR0b24+XG4gICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gc2V0UGFnZShNYXRoLm1pbih0b3RhbFBhZ2VzIC0gMSwgcGFnZSArIDEpKX0gZGlzYWJsZWQ9e3BhZ2UgPj0gdG90YWxQYWdlcyAtIDF9XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicHgtMiBweS0xIHJvdW5kZWQgYm9yZGVyIGRpc2FibGVkOm9wYWNpdHktMzBcIj7igLo8L2J1dHRvbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICApfVxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gIClcbn1cblxuZnVuY3Rpb24gS3BpQ2FyZCh7IGxhYmVsLCB2YWx1ZSwgc3VidGl0bGUsIGFjY2VudCB9OiB7IGxhYmVsOiBzdHJpbmc7IHZhbHVlOiBzdHJpbmc7IHN1YnRpdGxlOiBzdHJpbmc7IGFjY2VudDogc3RyaW5nIH0pIHtcbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXdoaXRlIHJvdW5kZWQteGwgcC0zXCIgc3R5bGU9e3sgYm9yZGVyOiAnMXB4IHNvbGlkIGhzbCgwLDAlLDkwJSknLCBib3JkZXJMZWZ0OiBgM3B4IHNvbGlkICR7YWNjZW50fWAgfX0+XG4gICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB1cHBlcmNhc2UgZm9udC1ib2xkIHRleHQtZ3JheS01MDAgdHJhY2tpbmctd2lkZVwiPntsYWJlbH08L3A+XG4gICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhsIGZvbnQtYm9sZCB0ZXh0LWdyYXktODAwIG10LTFcIj57dmFsdWV9PC9wPlxuICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1ncmF5LTUwMCBtdC0wLjVcIj57c3VidGl0bGV9PC9wPlxuICAgIDwvZGl2PlxuICApXG59XG5cbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuLy8gVEFCIDIg4oCUIFRSQUpFQ1RPSVJFU1xuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG5cbmludGVyZmFjZSBUcmFqZWN0b2lyZXNQYXlsb2FkIHtcbiAgdmFyaWFibGU6IHN0cmluZ1xuICBtZXRhOiBWYXJpYWJsZU1ldGFcbiAgdG9wX3BheXM6IHN0cmluZ1tdXG4gIHNlcmllczogUmVjb3JkPHN0cmluZywgeyBoaXN0b3JpcXVlOiBIaXN0UG9pbnRbXTsgcHJlZGljdGlvbnM6IFByZWRQb2ludFtdOyByZWdpb246IHN0cmluZyB9PlxuICByYWRhcjogYW55W11cbn1cblxuZnVuY3Rpb24gVHJhamVjdG9pcmVzVGFiKHsgbWV0YWRhdGEgfTogeyBtZXRhZGF0YTogTWV0YWRhdGEgfSkge1xuICBjb25zdCBbdmFyaWFibGUsIHNldFZhcmlhYmxlXSA9IHVzZVN0YXRlPHN0cmluZz4oJ252X3ByaW1lcycpXG4gIGNvbnN0IFt0b3BOLCBzZXRUb3BOXSA9IHVzZVN0YXRlPG51bWJlcj4oNSlcbiAgY29uc3QgW2RhdGEsIHNldERhdGFdID0gdXNlU3RhdGU8VHJhamVjdG9pcmVzUGF5bG9hZCB8IG51bGw+KG51bGwpXG4gIGNvbnN0IFtsb2FkaW5nLCBzZXRMb2FkaW5nXSA9IHVzZVN0YXRlKHRydWUpXG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBzZXRMb2FkaW5nKHRydWUpXG4gICAgYXBpLmdldDxUcmFqZWN0b2lyZXNQYXlsb2FkPignL3ByZWRpY3Rpb25zL2F4ZTIvdHJhamVjdG9pcmVzJywge1xuICAgICAgcGFyYW1zOiB7IHZhcmlhYmxlLCB0b3BfbjogdG9wTiB9XG4gICAgfSkudGhlbihyID0+IHNldERhdGEoci5kYXRhKSkuZmluYWxseSgoKSA9PiBzZXRMb2FkaW5nKGZhbHNlKSlcbiAgfSwgW3ZhcmlhYmxlLCB0b3BOXSlcblxuICBjb25zdCBjaGFydERhdGEgPSB1c2VNZW1vKCgpID0+IHtcbiAgICBpZiAoIWRhdGEpIHJldHVybiBbXVxuICAgIGNvbnN0IG1hcDogUmVjb3JkPG51bWJlciwgYW55PiA9IHt9XG4gICAgZGF0YS50b3BfcGF5cy5mb3JFYWNoKChwKSA9PiB7XG4gICAgICBjb25zdCBzID0gZGF0YS5zZXJpZXNbcF1cbiAgICAgIGlmICghcykgcmV0dXJuXG4gICAgICBzLmhpc3RvcmlxdWUuZm9yRWFjaChoID0+IHtcbiAgICAgICAgaWYgKCFtYXBbaC5hbm5lZV0pIG1hcFtoLmFubmVlXSA9IHsgYW5uZWU6IGguYW5uZWUgfVxuICAgICAgICBtYXBbaC5hbm5lZV1bYCR7cH1faGlzdGBdID0gaC52YWxldXJcbiAgICAgIH0pXG4gICAgICBzLnByZWRpY3Rpb25zLmZvckVhY2gocHAgPT4ge1xuICAgICAgICBpZiAoIW1hcFtwcC5hbm5lZV0pIG1hcFtwcC5hbm5lZV0gPSB7IGFubmVlOiBwcC5hbm5lZSB9XG4gICAgICAgIG1hcFtwcC5hbm5lZV1bYCR7cH1fcHJlZGBdID0gcHAudmFsZXVyXG4gICAgICB9KVxuICAgICAgY29uc3QgaDIwMjQgPSBzLmhpc3RvcmlxdWUuZmluZChoID0+IGguYW5uZWUgPT09IDIwMjQpXG4gICAgICBpZiAoaDIwMjQgJiYgbWFwWzIwMjRdKSBtYXBbMjAyNF1bYCR7cH1fcHJlZGBdID0gaDIwMjQudmFsZXVyXG4gICAgfSlcbiAgICByZXR1cm4gT2JqZWN0LnZhbHVlcyhtYXApLnNvcnQoKGE6IGFueSwgYjogYW55KSA9PiBhLmFubmVlIC0gYi5hbm5lZSlcbiAgfSwgW2RhdGFdKVxuXG4gIGlmIChsb2FkaW5nIHx8ICFkYXRhKSB7XG4gICAgcmV0dXJuIDxkaXYgY2xhc3NOYW1lPVwic3BhY2UteS0zXCI+PFNrZWxldG9uQ2hhcnQgLz48U2tlbGV0b25DaGFydCAvPjwvZGl2PlxuICB9XG5cbiAgY29uc3QgbWV0YSA9IGRhdGEubWV0YVxuICBjb25zdCB2YXJPcHRpb25zID0gbWV0YWRhdGEuYWxsX3ZhcnMubWFwKHYgPT4gKHsgdmFsdWU6IHYsIGxhYmVsOiBtZXRhZGF0YS52YXJpYWJsZXNbdl0/LmxhYmVsID8/IHYgfSkpXG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cInNwYWNlLXktNFwiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy13aGl0ZSByb3VuZGVkLXhsIHAtMyBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyBmbGV4LXdyYXBcIlxuICAgICAgICBzdHlsZT17eyBib3JkZXI6ICcxcHggc29saWQgaHNsKDAsMCUsOTAlKScgfX0+XG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteHMgZm9udC1zZW1pYm9sZCB0ZXh0LWdyYXktNjAwXCI+VmFyaWFibGUgOjwvc3Bhbj5cbiAgICAgICAgPGRpdiBzdHlsZT17eyBtaW5XaWR0aDogMjIwIH19PlxuICAgICAgICAgIDxTZWxlY3RcbiAgICAgICAgICAgIHZhbHVlPXt2YXJPcHRpb25zLmZpbmQobyA9PiBvLnZhbHVlID09PSB2YXJpYWJsZSl9XG4gICAgICAgICAgICBvbkNoYW5nZT17KG86IGFueSkgPT4gc2V0VmFyaWFibGUoby52YWx1ZSl9XG4gICAgICAgICAgICBvcHRpb25zPXt2YXJPcHRpb25zfVxuICAgICAgICAgICAgc3R5bGVzPXtzZWxlY3RTdHlsZXN9XG4gICAgICAgICAgLz5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteHMgZm9udC1zZW1pYm9sZCB0ZXh0LWdyYXktNjAwIG1sLTJcIj5Ub3AgTiA6PC9zcGFuPlxuICAgICAgICB7WzMsIDUsIDcsIDEwXS5tYXAobiA9PiAoXG4gICAgICAgICAgPGJ1dHRvbiBrZXk9e259IG9uQ2xpY2s9eygpID0+IHNldFRvcE4obil9XG4gICAgICAgICAgICBjbGFzc05hbWU9XCJweC0yLjUgcHktMSByb3VuZGVkIHRleHQtWzExcHhdIGZvbnQtc2VtaWJvbGQgdHJhbnNpdGlvbi1jb2xvcnNcIlxuICAgICAgICAgICAgc3R5bGU9e3RvcE4gPT09IG4gPyB7IGJhY2tncm91bmQ6IE9MSVZFLCBjb2xvcjogJ3doaXRlJyB9IDogeyBiYWNrZ3JvdW5kOiAnaHNsKDAsMCUsOTMlKScsIGNvbG9yOiAnIzZiNzI4MCcgfX0+XG4gICAgICAgICAgICB7bn1cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgKSl9XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy13aGl0ZSByb3VuZGVkLXhsIHAtNFwiIHN0eWxlPXt7IGJvcmRlcjogJzFweCBzb2xpZCBoc2woMCwwJSw5MCUpJyB9fT5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLXN0YXJ0IGp1c3RpZnktYmV0d2VlbiBmbGV4LXdyYXAgZ2FwLTIgbWItM1wiPlxuICAgICAgICAgIDxTZWN0aW9uVGl0bGU+e21ldGEubGFiZWx9IOKAlCBUb3Age3RvcE59IHBheXMgwrcgMjAxNeKAkzIwMzA8L1NlY3Rpb25UaXRsZT5cbiAgICAgICAgICA8TW9kZWxCYWRnZSBtb2RlbGU9e21ldGEubW9kZWxlfSAvPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPFJlc3BvbnNpdmVDb250YWluZXIgd2lkdGg9XCIxMDAlXCIgaGVpZ2h0PXs0MjB9PlxuICAgICAgICAgIDxDb21wb3NlZENoYXJ0IGRhdGE9e2NoYXJ0RGF0YSBhcyBhbnlbXX0gbWFyZ2luPXt7IHRvcDogMTAsIHJpZ2h0OiAyMCwgbGVmdDogMCwgYm90dG9tOiAwIH19PlxuICAgICAgICAgICAgPENhcnRlc2lhbkdyaWQgc3Ryb2tlRGFzaGFycmF5PVwiMyAzXCIgc3Ryb2tlPVwiaHNsKDAsMCUsOTMlKVwiIC8+XG4gICAgICAgICAgICA8WEF4aXMgZGF0YUtleT1cImFubmVlXCIgdGljaz17eyBmb250U2l6ZTogMTAgfX0gLz5cbiAgICAgICAgICAgIDxZQXhpcyB0aWNrPXt7IGZvbnRTaXplOiAxMCB9fSB0aWNrRm9ybWF0dGVyPXt2ID0+IGZvcm1hdEJ5VW5pdGUodiwgbWV0YS51bml0ZSl9IC8+XG4gICAgICAgICAgICA8VG9vbHRpcFxuICAgICAgICAgICAgICBjb250ZW50PXsoeyBwYXlsb2FkLCBsYWJlbCB9KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFwYXlsb2FkIHx8ICFwYXlsb2FkLmxlbmd0aCkgcmV0dXJuIG51bGxcbiAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy13aGl0ZSBweC0zIHB5LTIgcm91bmRlZCBzaGFkb3cgdGV4dC14c1wiXG4gICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IGJvcmRlcjogJzFweCBzb2xpZCBoc2woMCwwJSw4NSUpJyB9fT5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmb250LWJvbGQgdGV4dC1ncmF5LTgwMCBtYi0xXCI+e2xhYmVsfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICB7ZGF0YS50b3BfcGF5cy5tYXAoKHAsIGkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkOiBhbnkgPSBwYXlsb2FkWzBdLnBheWxvYWRcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2ID0gZFtgJHtwfV9wcmVkYF0gPz8gZFtgJHtwfV9oaXN0YF1cbiAgICAgICAgICAgICAgICAgICAgICBpZiAodiA9PSBudWxsKSByZXR1cm4gbnVsbFxuICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGtleT17cH0gY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJpbmxpbmUtYmxvY2sgdy0yIGgtMiByb3VuZGVkLWZ1bGxcIiBzdHlsZT17eyBiYWNrZ3JvdW5kOiBUT1BfQ09MT1JTW2ldIH19IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtZ3JheS03MDBcIj57cH0gOjwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz57Zm9ybWF0QnlVbml0ZSh2LCBtZXRhLnVuaXRlKX08L3N0cm9uZz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAgICAgfSl9XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAvPlxuICAgICAgICAgICAgPFJlZmVyZW5jZUxpbmUgeD17MjAyNH0gc3Ryb2tlPVwiaHNsKDAsMCUsNjAlKVwiIHN0cm9rZURhc2hhcnJheT1cIjQgM1wiIGxhYmVsPXt7IHZhbHVlOiAnMjAyNCcsIGZvbnRTaXplOiAxMCwgZmlsbDogJyM4ODgnIH19IC8+XG4gICAgICAgICAgICB7ZGF0YS50b3BfcGF5cy5tYXAoKHAsIGkpID0+IChcbiAgICAgICAgICAgICAgPExpbmUga2V5PXtgJHtwfV9oaXN0YH0gdHlwZT1cIm1vbm90b25lXCIgZGF0YUtleT17YCR7cH1faGlzdGB9IHN0cm9rZT17VE9QX0NPTE9SU1tpXX1cbiAgICAgICAgICAgICAgICBzdHJva2VXaWR0aD17Mn0gZG90PXt7IHI6IDIgfX0gbGVnZW5kVHlwZT1cIm5vbmVcIiAvPlxuICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICB7ZGF0YS50b3BfcGF5cy5tYXAoKHAsIGkpID0+IChcbiAgICAgICAgICAgICAgPExpbmUga2V5PXtgJHtwfV9wcmVkYH0gdHlwZT1cIm1vbm90b25lXCIgZGF0YUtleT17YCR7cH1fcHJlZGB9IHN0cm9rZT17VE9QX0NPTE9SU1tpXX1cbiAgICAgICAgICAgICAgICBzdHJva2VXaWR0aD17Mn0gc3Ryb2tlRGFzaGFycmF5PVwiNiAzXCIgZG90PXt7IHI6IDIgfX0gbmFtZT17cH0gLz5cbiAgICAgICAgICAgICkpfVxuICAgICAgICAgIDwvQ29tcG9zZWRDaGFydD5cbiAgICAgICAgPC9SZXNwb25zaXZlQ29udGFpbmVyPlxuICAgICAgPC9kaXY+XG5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctd2hpdGUgcm91bmRlZC14bCBwLTRcIiBzdHlsZT17eyBib3JkZXI6ICcxcHggc29saWQgaHNsKDAsMCUsOTAlKScgfX0+XG4gICAgICAgIDxTZWN0aW9uVGl0bGU+UHJvZmlsIDIwMzAg4oCUIDYgZGltZW5zaW9ucyBub3JtYWxpc8OpZXM8L1NlY3Rpb25UaXRsZT5cbiAgICAgICAgPFJlc3BvbnNpdmVDb250YWluZXIgd2lkdGg9XCIxMDAlXCIgaGVpZ2h0PXs0MDB9PlxuICAgICAgICAgIDxSYWRhckNoYXJ0IGRhdGE9e2RhdGEucmFkYXJ9PlxuICAgICAgICAgICAgPFBvbGFyR3JpZCBzdHJva2U9XCJoc2woMCwwJSw4OCUpXCIgLz5cbiAgICAgICAgICAgIDxQb2xhckFuZ2xlQXhpcyBkYXRhS2V5PVwibGFiZWxcIiB0aWNrPXt7IGZvbnRTaXplOiAxMSB9fSAvPlxuICAgICAgICAgICAgPFBvbGFyUmFkaXVzQXhpcyBhbmdsZT17OTB9IGRvbWFpbj17WzAsIDEwMF19IHRpY2s9e3sgZm9udFNpemU6IDkgfX0gLz5cbiAgICAgICAgICAgIDxUb29sdGlwIC8+XG4gICAgICAgICAgICA8TGVnZW5kIHdyYXBwZXJTdHlsZT17eyBmb250U2l6ZTogMTEgfX0gLz5cbiAgICAgICAgICAgIHtkYXRhLnRvcF9wYXlzLm1hcCgocCwgaSkgPT4gKFxuICAgICAgICAgICAgICA8UmFkYXIga2V5PXtwfSBuYW1lPXtwfSBkYXRhS2V5PXtwfSBzdHJva2U9e1RPUF9DT0xPUlNbaV19XG4gICAgICAgICAgICAgICAgZmlsbD17VE9QX0NPTE9SU1tpXX0gZmlsbE9wYWNpdHk9ezAuMTB9IHN0cm9rZVdpZHRoPXsyfSAvPlxuICAgICAgICAgICAgKSl9XG4gICAgICAgICAgPC9SYWRhckNoYXJ0PlxuICAgICAgICA8L1Jlc3BvbnNpdmVDb250YWluZXI+XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy13aGl0ZSByb3VuZGVkLXhsIHAtNFwiIHN0eWxlPXt7IGJvcmRlcjogJzFweCBzb2xpZCBoc2woMCwwJSw5MCUpJyB9fT5cbiAgICAgICAgPFNlY3Rpb25UaXRsZT7wn46vIEluc2lnaHRzIHttZXRhLmxhYmVsfSAyMDMwPC9TZWN0aW9uVGl0bGU+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMSBtZDpncmlkLWNvbHMtMyBnYXAtMyBtdC0zXCI+XG4gICAgICAgICAgPEluc2lnaHRDYXJkIHRpdGxlPVwiTGVhZGVyIDIwMzBcIiB2YWx1ZT17ZGF0YS50b3BfcGF5c1swXSA/PyAn4oCUJ30gYWNjZW50PXtHUkVFTn0gLz5cbiAgICAgICAgICA8SW5zaWdodENhcmQgdGl0bGU9e2BUb3AgJHt0b3BOfWB9IHZhbHVlPXtkYXRhLnRvcF9wYXlzLmpvaW4oJyDCtyAnKX0gYWNjZW50PXtOQVZZfSBzbWFsbCAvPlxuICAgICAgICAgIDxJbnNpZ2h0Q2FyZCB0aXRsZT1cIk1vZMOobGVcIiB2YWx1ZT17TU9ERUxfTEFCRUxbbWV0YS5tb2RlbGVdID8/IG1ldGEubW9kZWxlfSBhY2NlbnQ9e09MSVZFfSBzbWFsbCAvPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApXG59XG5cbmZ1bmN0aW9uIEluc2lnaHRDYXJkKHsgdGl0bGUsIHZhbHVlLCBhY2NlbnQsIHNtYWxsIH06IHsgdGl0bGU6IHN0cmluZzsgdmFsdWU6IHN0cmluZzsgYWNjZW50OiBzdHJpbmc7IHNtYWxsPzogYm9vbGVhbiB9KSB7XG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJyb3VuZGVkLWxnIHAtM1wiIHN0eWxlPXt7IGJhY2tncm91bmQ6IGAke2FjY2VudH0xNWAsIGJvcmRlcjogYDFweCBzb2xpZCAke2FjY2VudH0zMGAgfX0+XG4gICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB1cHBlcmNhc2UgZm9udC1ib2xkIHRyYWNraW5nLXdpZGVcIiBzdHlsZT17eyBjb2xvcjogYWNjZW50IH19Pnt0aXRsZX08L3A+XG4gICAgICA8cCBjbGFzc05hbWU9e2Bmb250LWJvbGQgdGV4dC1ncmF5LTgwMCBtdC0xICR7c21hbGwgPyAndGV4dC1zbScgOiAndGV4dC1sZyd9YH0+e3ZhbHVlfTwvcD5cbiAgICA8L2Rpdj5cbiAgKVxufVxuXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcbi8vIFRBQiAzIOKAlCBBTkFMWVNFIFBBUiBQQVlTXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcblxuaW50ZXJmYWNlIFBheXNEYXRhIHtcbiAgcGF5czogc3RyaW5nXG4gIHJlZ2lvbjogc3RyaW5nXG4gIHZhcmlhYmxlczogUmVjb3JkPHN0cmluZywgVmFyRGF0YT5cbiAgYXhjb19sb2FkZWQ6IGJvb2xlYW5cbn1cblxuZnVuY3Rpb24gUGF5c1RhYih7IG1ldGFkYXRhLCB2YWxpZGF0aW9uLCBzZXRWYWxpZGF0aW9uIH06IHtcbiAgbWV0YWRhdGE6IE1ldGFkYXRhOyB2YWxpZGF0aW9uOiBWYWxpZGF0aW9uTWV0cmljcyB8IG51bGw7XG4gIHNldFZhbGlkYXRpb246ICh2OiBWYWxpZGF0aW9uTWV0cmljcykgPT4gdm9pZDtcbn0pIHtcbiAgY29uc3QgW3BheXMsIHNldFBheXNdID0gdXNlU3RhdGU8c3RyaW5nPihtZXRhZGF0YS5wYXlzLmluY2x1ZGVzKCdNYXJvYycpID8gJ01hcm9jJyA6IG1ldGFkYXRhLnBheXNbMF0pXG4gIGNvbnN0IFtkaW1lbnNpb24sIHNldERpbWVuc2lvbl0gPSB1c2VTdGF0ZTxzdHJpbmc+KCdhbGwnKVxuICBjb25zdCBbZGF0YSwgc2V0RGF0YV0gPSB1c2VTdGF0ZTxQYXlzRGF0YSB8IG51bGw+KG51bGwpXG4gIGNvbnN0IFtsb2FkaW5nLCBzZXRMb2FkaW5nXSA9IHVzZVN0YXRlKHRydWUpXG4gIGNvbnN0IFtyZWZyZXNoaW5nLCBzZXRSZWZyZXNoaW5nXSA9IHVzZVN0YXRlKGZhbHNlKVxuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgc2V0TG9hZGluZyh0cnVlKVxuICAgIGFwaS5nZXQ8UGF5c0RhdGE+KGAvcHJlZGljdGlvbnMvYXhlMi9wYXlzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KHBheXMpfWApXG4gICAgICAudGhlbihyID0+IHNldERhdGEoci5kYXRhKSkuZmluYWxseSgoKSA9PiBzZXRMb2FkaW5nKGZhbHNlKSlcbiAgfSwgW3BheXNdKVxuXG4gIGNvbnN0IHBheXNPcHRpb25zID0gbWV0YWRhdGEucGF5c193aXRoX3JlZ2lvbi5tYXAocCA9PiAoe1xuICAgIHZhbHVlOiBwLnBheXMsXG4gICAgbGFiZWw6IHAucGF5cyxcbiAgICByZWdpb246IHAucmVnaW9uLFxuICB9KSlcblxuICBjb25zdCBkaW1zID0gW1xuICAgIHsgaWQ6ICdhbGwnLCBsYWJlbDogJ1RvdXQnIH0sXG4gICAgeyBpZDogJ25vbl92aWUnLCBsYWJlbDogJ05vbi1WaWUnIH0sXG4gICAgeyBpZDogJ3ZpZScsIGxhYmVsOiAnVmllJyB9LFxuICAgIHsgaWQ6ICdtYWNybycsIGxhYmVsOiAnTWFjcm8nIH0sXG4gICAgeyBpZDogJ2dvdXZlcm5hbmNlJywgbGFiZWw6ICdHb3V2ZXJuYW5jZScgfSxcbiAgXVxuXG4gIGNvbnN0IGZpbHRlcmVkVmFycyA9IHVzZU1lbW8oKCkgPT4ge1xuICAgIGlmICghZGF0YSkgcmV0dXJuIFtdXG4gICAgcmV0dXJuIE9iamVjdC52YWx1ZXMoZGF0YS52YXJpYWJsZXMpLmZpbHRlcih2ID0+XG4gICAgICBkaW1lbnNpb24gPT09ICdhbGwnIHx8IHYuZGltZW5zaW9uID09PSBkaW1lbnNpb25cbiAgICApXG4gIH0sIFtkYXRhLCBkaW1lbnNpb25dKVxuXG4gIGFzeW5jIGZ1bmN0aW9uIHJlZnJlc2goKSB7XG4gICAgc2V0UmVmcmVzaGluZyh0cnVlKVxuICAgIHRyeSB7XG4gICAgICBhd2FpdCBhcGkuZ2V0KCcvcHJlZGljdGlvbnMvYXhlMi9yZWZyZXNoJylcbiAgICAgIGNvbnN0IHYgPSBhd2FpdCBhcGkuZ2V0PFZhbGlkYXRpb25NZXRyaWNzPignL3ByZWRpY3Rpb25zL2F4ZTIvdmFsaWRhdGlvbicpXG4gICAgICBzZXRWYWxpZGF0aW9uKHYuZGF0YSlcbiAgICAgIGNvbnN0IGQgPSBhd2FpdCBhcGkuZ2V0PFBheXNEYXRhPihgL3ByZWRpY3Rpb25zL2F4ZTIvcGF5cy8ke2VuY29kZVVSSUNvbXBvbmVudChwYXlzKX1gKVxuICAgICAgc2V0RGF0YShkLmRhdGEpXG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHNldFJlZnJlc2hpbmcoZmFsc2UpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cInNwYWNlLXktNFwiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy13aGl0ZSByb3VuZGVkLXhsIHAtMyBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyBmbGV4LXdyYXBcIlxuICAgICAgICBzdHlsZT17eyBib3JkZXI6ICcxcHggc29saWQgaHNsKDAsMCUsOTAlKScgfX0+XG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteHMgZm9udC1zZW1pYm9sZCB0ZXh0LWdyYXktNjAwXCI+UGF5cyA6PC9zcGFuPlxuICAgICAgICA8ZGl2IHN0eWxlPXt7IG1pbldpZHRoOiAyNDAgfX0+XG4gICAgICAgICAgPFNlbGVjdFxuICAgICAgICAgICAgdmFsdWU9e3BheXNPcHRpb25zLmZpbmQobyA9PiBvLnZhbHVlID09PSBwYXlzKX1cbiAgICAgICAgICAgIG9uQ2hhbmdlPXsobzogYW55KSA9PiBzZXRQYXlzKG8udmFsdWUpfVxuICAgICAgICAgICAgb3B0aW9ucz17cGF5c09wdGlvbnN9XG4gICAgICAgICAgICBzdHlsZXM9e3NlbGVjdFN0eWxlc31cbiAgICAgICAgICAgIGZvcm1hdE9wdGlvbkxhYmVsPXsobzogYW55KSA9PiAoXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJpbmxpbmUtYmxvY2sgdy0yIGgtMiByb3VuZGVkLWZ1bGxcIlxuICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgYmFja2dyb3VuZDogUkVHSU9OX0NPTE9SU1tvLnJlZ2lvbl0gPz8gR1JBWSB9fSAvPlxuICAgICAgICAgICAgICAgIDxzcGFuPntvLmxhYmVsfTwvc3Bhbj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApfVxuICAgICAgICAgIC8+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1sLTIgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEgZmxleC13cmFwXCI+XG4gICAgICAgICAge2RpbXMubWFwKGQgPT4gKFxuICAgICAgICAgICAgPGJ1dHRvbiBrZXk9e2QuaWR9IG9uQ2xpY2s9eygpID0+IHNldERpbWVuc2lvbihkLmlkKX1cbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicHgtMi41IHB5LTEgcm91bmRlZCB0ZXh0LVsxMXB4XSBmb250LXNlbWlib2xkIHRyYW5zaXRpb24tY29sb3JzXCJcbiAgICAgICAgICAgICAgc3R5bGU9e2RpbWVuc2lvbiA9PT0gZC5pZCA/IHsgYmFja2dyb3VuZDogT0xJVkUsIGNvbG9yOiAnd2hpdGUnIH0gOiB7IGJhY2tncm91bmQ6ICdoc2woMCwwJSw5MyUpJywgY29sb3I6ICcjNmI3MjgwJyB9fT5cbiAgICAgICAgICAgICAge2QubGFiZWx9XG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICApKX1cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cblxuICAgICAge2xvYWRpbmcgfHwgIWRhdGEgPyAoXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMSBtZDpncmlkLWNvbHMtMiBnYXAtM1wiPlxuICAgICAgICAgIHtbLi4uQXJyYXkoNCldLm1hcCgoXywgaSkgPT4gPFNrZWxldG9uQ2hhcnQga2V5PXtpfSAvPil9XG4gICAgICAgIDwvZGl2PlxuICAgICAgKSA6IChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0xIG1kOmdyaWQtY29scy0yIGdhcC0zXCI+XG4gICAgICAgICAge2ZpbHRlcmVkVmFycy5tYXAodiA9PiAoXG4gICAgICAgICAgICA8UHJlZENoYXJ0XG4gICAgICAgICAgICAgIGtleT17di52YXJpYWJsZX1cbiAgICAgICAgICAgICAgdmFyaWFibGU9e3YudmFyaWFibGV9XG4gICAgICAgICAgICAgIGxhYmVsPXt2LmxhYmVsfVxuICAgICAgICAgICAgICB1bml0ZT17di51bml0ZX1cbiAgICAgICAgICAgICAgaGlzdG9yaXF1ZT17di5oaXN0b3JpcXVlfVxuICAgICAgICAgICAgICBwcmVkaWN0aW9ucz17di5wcmVkaWN0aW9uc31cbiAgICAgICAgICAgICAgbW9kZWxlPXt2Lm1vZGVsZX1cbiAgICAgICAgICAgICAgcjI9e3YucjJfd2FsZm9yd2FyZH1cbiAgICAgICAgICAgICAgbWFwZT17di5tYXBlfVxuICAgICAgICAgICAgICBheGNvQmxlbmRlZD17di5heGNvX2JsZW5kZWR9XG4gICAgICAgICAgICAgIGhlaWdodD17MjIwfVxuICAgICAgICAgICAgLz5cbiAgICAgICAgICApKX1cbiAgICAgICAgPC9kaXY+XG4gICAgICApfVxuXG4gICAgICB7dmFsaWRhdGlvbiAmJiAoXG4gICAgICAgIDxWYWxpZGF0aW9uUGFuZWwgdmFsaWRhdGlvbj17dmFsaWRhdGlvbn0gb25SZWZyZXNoPXtyZWZyZXNofSByZWZyZXNoaW5nPXtyZWZyZXNoaW5nfSAvPlxuICAgICAgKX1cbiAgICA8L2Rpdj5cbiAgKVxufVxuXG5mdW5jdGlvbiBWYWxpZGF0aW9uUGFuZWwoeyB2YWxpZGF0aW9uLCBvblJlZnJlc2gsIHJlZnJlc2hpbmcgfToge1xuICB2YWxpZGF0aW9uOiBWYWxpZGF0aW9uTWV0cmljczsgb25SZWZyZXNoOiAoKSA9PiB2b2lkOyByZWZyZXNoaW5nOiBib29sZWFuO1xufSkge1xuICBjb25zdCBbb3Blbiwgc2V0T3Blbl0gPSB1c2VTdGF0ZSh0cnVlKVxuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJiZy13aGl0ZSByb3VuZGVkLXhsXCIgc3R5bGU9e3sgYm9yZGVyOiAnMXB4IHNvbGlkIGhzbCgwLDAlLDkwJSknIH19PlxuICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBzZXRPcGVuKCFvcGVuKX1cbiAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIHB4LTQgcHktMyBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gaG92ZXI6YmctZ3JheS01MFwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgPEFjdGl2aXR5IHNpemU9ezE2fSBzdHlsZT17eyBjb2xvcjogT0xJVkUgfX0gLz5cbiAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmb250LWJvbGQgdGV4dC1zbSB0ZXh0LWdyYXktODAwXCI+8J+UrCBRdWFsaXTDqSBkdSBNb2TDqGxlPC9zcGFuPlxuICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtZ3JheS01MDBcIj5cbiAgICAgICAgICAgICh7dmFsaWRhdGlvbi5lbGFwc2VkX3NlY29uZHN9cyDCtyB7T2JqZWN0LmtleXModmFsaWRhdGlvbi52YXJpYWJsZXMpLmxlbmd0aH0gdmFyaWFibGVzKVxuICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIHtvcGVuID8gPENoZXZyb25VcCBzaXplPXsxNn0gLz4gOiA8Q2hldnJvbkRvd24gc2l6ZT17MTZ9IC8+fVxuICAgICAgPC9idXR0b24+XG5cbiAgICAgIHtvcGVuICYmIChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJweC00IHBiLTQgc3BhY2UteS0zXCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJvdmVyZmxvdy14LWF1dG9cIj5cbiAgICAgICAgICAgIDx0YWJsZSBjbGFzc05hbWU9XCJ3LWZ1bGwgdGV4dC14c1wiPlxuICAgICAgICAgICAgICA8dGhlYWQ+XG4gICAgICAgICAgICAgICAgPHRyIGNsYXNzTmFtZT1cImJvcmRlci1iLTJcIiBzdHlsZT17eyBib3JkZXJDb2xvcjogT0xJVkVfMTUgfX0+XG4gICAgICAgICAgICAgICAgICA8dGggY2xhc3NOYW1lPVwidGV4dC1sZWZ0IHB5LTIgcHgtMlwiPlZhcmlhYmxlPC90aD5cbiAgICAgICAgICAgICAgICAgIDx0aCBjbGFzc05hbWU9XCJ0ZXh0LWxlZnQgcHktMiBweC0yXCI+TW9kw6hsZTwvdGg+XG4gICAgICAgICAgICAgICAgICA8dGggY2xhc3NOYW1lPVwidGV4dC1yaWdodCBweS0yIHB4LTJcIj5SwrI8L3RoPlxuICAgICAgICAgICAgICAgICAgPHRoIGNsYXNzTmFtZT1cInRleHQtcmlnaHQgcHktMiBweC0yXCI+TUFQRTwvdGg+XG4gICAgICAgICAgICAgICAgICA8dGggY2xhc3NOYW1lPVwidGV4dC1yaWdodCBweS0yIHB4LTJcIj5NQUU8L3RoPlxuICAgICAgICAgICAgICAgICAgPHRoIGNsYXNzTmFtZT1cInRleHQtcmlnaHQgcHktMiBweC0yXCI+cTgwPC90aD5cbiAgICAgICAgICAgICAgICAgIDx0aCBjbGFzc05hbWU9XCJ0ZXh0LXJpZ2h0IHB5LTIgcHgtMlwiPnE5NTwvdGg+XG4gICAgICAgICAgICAgICAgICA8dGggY2xhc3NOYW1lPVwidGV4dC1jZW50ZXIgcHktMiBweC0yXCI+U291cmNlPC90aD5cbiAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgICA8L3RoZWFkPlxuICAgICAgICAgICAgICA8dGJvZHk+XG4gICAgICAgICAgICAgICAge09iamVjdC5lbnRyaWVzKHZhbGlkYXRpb24udmFyaWFibGVzKS5tYXAoKFtrLCBtXSkgPT4gKFxuICAgICAgICAgICAgICAgICAgPHRyIGtleT17a30gY2xhc3NOYW1lPVwiYm9yZGVyLWJcIiBzdHlsZT17eyBib3JkZXJDb2xvcjogJ2hzbCgwLDAlLDk1JSknIH19PlxuICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3NOYW1lPVwicHktMS41IHB4LTIgZm9udC1zZW1pYm9sZFwiPnttLmxhYmVsfTwvdGQ+XG4gICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzc05hbWU9XCJweS0xLjUgcHgtMlwiPjxNb2RlbEJhZGdlIG1vZGVsZT17bS5tb2RlbGV9IC8+PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInB5LTEuNSBweC0yIHRleHQtcmlnaHQgZm9udC1tb25vXCI+e2ZtdFIyKG0ucjJfbWVhbil9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInB5LTEuNSBweC0yIHRleHQtcmlnaHQgZm9udC1tb25vXCI+e20ubWFwZV9tZWFuICE9IG51bGwgPyBmbXRQY3QobS5tYXBlX21lYW4sIDEpIDogJ+KAlCd9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInB5LTEuNSBweC0yIHRleHQtcmlnaHQgZm9udC1tb25vXCI+e2ZtdE51bShtLm1hZSwgMyl9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInB5LTEuNSBweC0yIHRleHQtcmlnaHQgZm9udC1tb25vXCI+e2ZtdE51bShtLnE4MCwgMyl9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInB5LTEuNSBweC0yIHRleHQtcmlnaHQgZm9udC1tb25vXCI+e2ZtdE51bShtLnE5NSwgMyl9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInB5LTEuNSBweC0yIHRleHQtY2VudGVyIHRleHQtWzEwcHhdXCI+XG4gICAgICAgICAgICAgICAgICAgICAge3ZhbGlkYXRpb24uYXhjb19sb2FkZWQgJiYgKGsgPT09ICdnZHBfZ3Jvd3RoJyB8fCBrID09PSAnZ2RwY2FwJylcbiAgICAgICAgICAgICAgICAgICAgICAgID8gPHNwYW4gc3R5bGU9e3sgY29sb3I6IEdSRUVOIH19PuKckyBBeGNvPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgOiA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktNDAwXCI+TUwgcHVyPC9zcGFuPn1cbiAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgIDwvdGJvZHk+XG4gICAgICAgICAgICA8L3RhYmxlPlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0xIG1kOmdyaWQtY29scy0zIGdhcC0zIG10LTJcIj5cbiAgICAgICAgICAgIDxDb2hlcmVuY2VDYXJkXG4gICAgICAgICAgICAgIG9rPXt2YWxpZGF0aW9uLmNvaGVyZW5jZV90ZXN0cy5ib3VuZHNfb2t9XG4gICAgICAgICAgICAgIGxhYmVsPVwiQm9ybmVzIGFic29sdWVzXCJcbiAgICAgICAgICAgICAgZGVzYz17YCR7dmFsaWRhdGlvbi5jb2hlcmVuY2VfdGVzdHMuYWxlcnRzX2NvdW50fSB2aW9sYXRpb24ocylgfVxuICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDxDb2hlcmVuY2VDYXJkXG4gICAgICAgICAgICAgIG9rPXt2YWxpZGF0aW9uLmNvaGVyZW5jZV90ZXN0cy5pY19va31cbiAgICAgICAgICAgICAgbGFiZWw9XCJDb2jDqXJlbmNlIElDXCJcbiAgICAgICAgICAgICAgZGVzYz1cImljX2xvd2VyIOKJpCB2YWxldXIg4omkIGljX3VwcGVyXCJcbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8Q29oZXJlbmNlQ2FyZFxuICAgICAgICAgICAgICBvaz17dmFsaWRhdGlvbi5jb2hlcmVuY2VfdGVzdHMuYXhjb19hbGlnbm1lbnQgIT0gbnVsbH1cbiAgICAgICAgICAgICAgbGFiZWw9XCJBbGlnbmVtZW50IEF4Y29cIlxuICAgICAgICAgICAgICBkZXNjPXt2YWxpZGF0aW9uLmNvaGVyZW5jZV90ZXN0cy5heGNvX2FsaWdubWVudFxuICAgICAgICAgICAgICAgID8gYE1BRSBnZHA9JHtmbXROdW0odmFsaWRhdGlvbi5jb2hlcmVuY2VfdGVzdHMuYXhjb19hbGlnbm1lbnQubWFlX2dkcF9ncm93dGgsIDIpfSDCtyBnZHBjYXA9JHtmbXROdW0odmFsaWRhdGlvbi5jb2hlcmVuY2VfdGVzdHMuYXhjb19hbGlnbm1lbnQubWFlX2dkcGNhcCwgMCl9JGBcbiAgICAgICAgICAgICAgICA6ICdBeGNvIG5vbiBkaXNwb25pYmxlJ31cbiAgICAgICAgICAgICAgd2FybmluZz17IXZhbGlkYXRpb24uYXhjb19sb2FkZWR9XG4gICAgICAgICAgICAvPlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXtvblJlZnJlc2h9IGRpc2FibGVkPXtyZWZyZXNoaW5nfVxuICAgICAgICAgICAgY2xhc3NOYW1lPVwicHgtNCBweS0yIHJvdW5kZWQtbGcgdGV4dC14cyBmb250LXNlbWlib2xkIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHRyYW5zaXRpb24tYWxsXCJcbiAgICAgICAgICAgIHN0eWxlPXt7IGJhY2tncm91bmQ6IE9MSVZFLCBjb2xvcjogJ3doaXRlJywgb3BhY2l0eTogcmVmcmVzaGluZyA/IDAuNiA6IDEgfX0+XG4gICAgICAgICAgICA8UmVmcmVzaEN3IHNpemU9ezE0fSBjbGFzc05hbWU9e3JlZnJlc2hpbmcgPyAnYW5pbWF0ZS1zcGluJyA6ICcnfSAvPlxuICAgICAgICAgICAge3JlZnJlc2hpbmcgPyAnUmVjYWxjdWwgZW4gY291cnPigKYnIDogJ1JlY2FsY3VsZXIgbGUgbW9kw6hsZSd9XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgKX1cbiAgICA8L2Rpdj5cbiAgKVxufVxuXG5mdW5jdGlvbiBDb2hlcmVuY2VDYXJkKHsgb2ssIGxhYmVsLCBkZXNjLCB3YXJuaW5nIH06IHtcbiAgb2s6IGJvb2xlYW47IGxhYmVsOiBzdHJpbmc7IGRlc2M6IHN0cmluZzsgd2FybmluZz86IGJvb2xlYW47XG59KSB7XG4gIGNvbnN0IEljb24gPSB3YXJuaW5nID8gQWxlcnRUcmlhbmdsZSA6IChvayA/IENoZWNrQ2lyY2xlMiA6IEFsZXJ0VHJpYW5nbGUpXG4gIGNvbnN0IGNvbG9yID0gd2FybmluZyA/IE9SQU5HRSA6IChvayA/IEdSRUVOIDogUkVEKVxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwicm91bmRlZC1sZyBwLTIuNVwiIHN0eWxlPXt7IGJhY2tncm91bmQ6IGAke2NvbG9yfTEwYCwgYm9yZGVyOiBgMXB4IHNvbGlkICR7Y29sb3J9MzBgIH19PlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41XCI+XG4gICAgICAgIDxJY29uIHNpemU9ezE0fSBzdHlsZT17eyBjb2xvciB9fSAvPlxuICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtYm9sZFwiIHN0eWxlPXt7IGNvbG9yIH19PntsYWJlbH08L3NwYW4+XG4gICAgICA8L2Rpdj5cbiAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtZ3JheS02MDAgbXQtMVwiPntkZXNjfTwvcD5cbiAgICA8L2Rpdj5cbiAgKVxufVxuXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcbi8vIFRBQiA0IOKAlCBQQVIgVkFSSUFCTEVcbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuXG5pbnRlcmZhY2UgVmFyaWFibGVEYXRhIHtcbiAgdmFyaWFibGU6IHN0cmluZ1xuICBob3Jpem9uOiBudW1iZXJcbiAgbWV0YTogVmFyaWFibGVNZXRhICYgeyByMl93YWxmb3J3YXJkOiBudW1iZXIgfCBudWxsOyBtYXBlOiBudW1iZXIgfCBudWxsOyBxODA6IG51bWJlciB8IG51bGw7IHE5NTogbnVtYmVyIHwgbnVsbCB9XG4gIGNsYXNzZW1lbnQ6IHtcbiAgICBwYXlzOiBzdHJpbmdcbiAgICByZWdpb246IHN0cmluZ1xuICAgIHZhbGV1cl8yMDI0OiBudW1iZXIgfCBudWxsXG4gICAgdmFsZXVyX2hvcml6b246IG51bWJlciB8IG51bGxcbiAgICBpY19sb3dlcjogbnVtYmVyIHwgbnVsbFxuICAgIGljX3VwcGVyOiBudW1iZXIgfCBudWxsXG4gICAgdmFyaWF0aW9uX3BjdDogbnVtYmVyIHwgbnVsbFxuICAgIHJhbmc6IG51bWJlclxuICB9W11cbiAgdG9wX3NlcmllczogUmVjb3JkPHN0cmluZywgeyBoaXN0b3JpcXVlOiBIaXN0UG9pbnRbXTsgcHJlZGljdGlvbnM6IFByZWRQb2ludFtdIH0+XG59XG5cbmZ1bmN0aW9uIFZhcmlhYmxlVGFiKHsgbWV0YWRhdGEgfTogeyBtZXRhZGF0YTogTWV0YWRhdGEgfSkge1xuICBjb25zdCBbdmFyaWFibGUsIHNldFZhcmlhYmxlXSA9IHVzZVN0YXRlPHN0cmluZz4oJ252X3BlbmV0cmF0aW9uJylcbiAgY29uc3QgW2hvcml6b24sIHNldEhvcml6b25dID0gdXNlU3RhdGU8bnVtYmVyPigyMDMwKVxuICBjb25zdCBbZGF0YSwgc2V0RGF0YV0gPSB1c2VTdGF0ZTxWYXJpYWJsZURhdGEgfCBudWxsPihudWxsKVxuICBjb25zdCBbbG9hZGluZywgc2V0TG9hZGluZ10gPSB1c2VTdGF0ZSh0cnVlKVxuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgc2V0TG9hZGluZyh0cnVlKVxuICAgIGFwaS5nZXQ8VmFyaWFibGVEYXRhPihgL3ByZWRpY3Rpb25zL2F4ZTIvdmFyaWFibGUvJHt2YXJpYWJsZX1gLCB7IHBhcmFtczogeyBob3Jpem9uIH0gfSlcbiAgICAgIC50aGVuKHIgPT4gc2V0RGF0YShyLmRhdGEpKS5maW5hbGx5KCgpID0+IHNldExvYWRpbmcoZmFsc2UpKVxuICB9LCBbdmFyaWFibGUsIGhvcml6b25dKVxuXG4gIGNvbnN0IHZhck9wdGlvbnMgPSBtZXRhZGF0YS5hbGxfdmFycy5tYXAodiA9PiAoeyB2YWx1ZTogdiwgbGFiZWw6IG1ldGFkYXRhLnZhcmlhYmxlc1t2XT8ubGFiZWwgPz8gdiB9KSlcblxuICBjb25zdCBjaGFydERhdGEgPSB1c2VNZW1vKCgpID0+IHtcbiAgICBpZiAoIWRhdGEpIHJldHVybiBbXVxuICAgIGNvbnN0IHRvcDUgPSBkYXRhLmNsYXNzZW1lbnQuc2xpY2UoMCwgNSkubWFwKHIgPT4gci5wYXlzKVxuICAgIGNvbnN0IG1hcDogUmVjb3JkPG51bWJlciwgYW55PiA9IHt9XG4gICAgdG9wNS5mb3JFYWNoKHAgPT4ge1xuICAgICAgY29uc3QgcyA9IGRhdGEudG9wX3Nlcmllc1twXVxuICAgICAgaWYgKCFzKSByZXR1cm5cbiAgICAgIHMuaGlzdG9yaXF1ZS5mb3JFYWNoKGggPT4ge1xuICAgICAgICBpZiAoIW1hcFtoLmFubmVlXSkgbWFwW2guYW5uZWVdID0geyBhbm5lZTogaC5hbm5lZSB9XG4gICAgICAgIG1hcFtoLmFubmVlXVtgJHtwfV9oaXN0YF0gPSBoLnZhbGV1clxuICAgICAgfSlcbiAgICAgIHMucHJlZGljdGlvbnMuZm9yRWFjaChwcCA9PiB7XG4gICAgICAgIGlmICghbWFwW3BwLmFubmVlXSkgbWFwW3BwLmFubmVlXSA9IHsgYW5uZWU6IHBwLmFubmVlIH1cbiAgICAgICAgbWFwW3BwLmFubmVlXVtgJHtwfV9wcmVkYF0gPSBwcC52YWxldXJcbiAgICAgIH0pXG4gICAgICBjb25zdCBoMjAyNCA9IHMuaGlzdG9yaXF1ZS5maW5kKGggPT4gaC5hbm5lZSA9PT0gMjAyNClcbiAgICAgIGlmIChoMjAyNCAmJiBtYXBbMjAyNF0pIG1hcFsyMDI0XVtgJHtwfV9wcmVkYF0gPSBoMjAyNC52YWxldXJcbiAgICB9KVxuICAgIHJldHVybiBPYmplY3QudmFsdWVzKG1hcCkuc29ydCgoYTogYW55LCBiOiBhbnkpID0+IGEuYW5uZWUgLSBiLmFubmVlKVxuICB9LCBbZGF0YV0pXG5cbiAgY29uc3QgdG9wNVBheXMgPSBkYXRhPy5jbGFzc2VtZW50LnNsaWNlKDAsIDUpLm1hcChyID0+IHIucGF5cykgPz8gW11cblxuICBpZiAobG9hZGluZyB8fCAhZGF0YSkgcmV0dXJuIDxkaXYgY2xhc3NOYW1lPVwic3BhY2UteS0zXCI+PFNrZWxldG9uQ2hhcnQgLz48U2tlbGV0b25DaGFydCAvPjwvZGl2PlxuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJzcGFjZS15LTRcIj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctd2hpdGUgcm91bmRlZC14bCBwLTMgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgZmxleC13cmFwXCJcbiAgICAgICAgc3R5bGU9e3sgYm9yZGVyOiAnMXB4IHNvbGlkIGhzbCgwLDAlLDkwJSknIH19PlxuICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgdGV4dC1ncmF5LTYwMFwiPlZhcmlhYmxlIDo8L3NwYW4+XG4gICAgICAgIDxkaXYgc3R5bGU9e3sgbWluV2lkdGg6IDIyMCB9fT5cbiAgICAgICAgICA8U2VsZWN0XG4gICAgICAgICAgICB2YWx1ZT17dmFyT3B0aW9ucy5maW5kKG8gPT4gby52YWx1ZSA9PT0gdmFyaWFibGUpfVxuICAgICAgICAgICAgb25DaGFuZ2U9eyhvOiBhbnkpID0+IHNldFZhcmlhYmxlKG8udmFsdWUpfVxuICAgICAgICAgICAgb3B0aW9ucz17dmFyT3B0aW9uc31cbiAgICAgICAgICAgIHN0eWxlcz17c2VsZWN0U3R5bGVzfVxuICAgICAgICAgIC8+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgdGV4dC1ncmF5LTYwMCBtbC0yXCI+SG9yaXpvbiA6PC9zcGFuPlxuICAgICAgICB7WzIwMjUsIDIwMjcsIDIwMzBdLm1hcChoID0+IChcbiAgICAgICAgICA8YnV0dG9uIGtleT17aH0gb25DbGljaz17KCkgPT4gc2V0SG9yaXpvbihoKX1cbiAgICAgICAgICAgIGNsYXNzTmFtZT1cInB4LTMgcHktMSByb3VuZGVkLWZ1bGwgdGV4dC1bMTFweF0gZm9udC1zZW1pYm9sZCB0cmFuc2l0aW9uLWNvbG9yc1wiXG4gICAgICAgICAgICBzdHlsZT17aG9yaXpvbiA9PT0gaCA/IHsgYmFja2dyb3VuZDogT0xJVkUsIGNvbG9yOiAnd2hpdGUnIH0gOiB7IGJhY2tncm91bmQ6ICdoc2woMCwwJSw5MyUpJywgY29sb3I6ICcjNmI3MjgwJyB9fT5cbiAgICAgICAgICAgIHtofVxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICApKX1cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXdoaXRlIHJvdW5kZWQteGwgcC00XCIgc3R5bGU9e3sgYm9yZGVyOiAnMXB4IHNvbGlkIGhzbCgwLDAlLDkwJSknIH19PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBmbGV4LXdyYXAgZ2FwLTIgbWItMlwiPlxuICAgICAgICAgIDxTZWN0aW9uVGl0bGU+e2RhdGEubWV0YS5sYWJlbH0g4oCUIFRvcCA1IHBheXMgwrcge2hvcml6b259PC9TZWN0aW9uVGl0bGU+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICAgPE1vZGVsQmFkZ2UgbW9kZWxlPXtkYXRhLm1ldGEubW9kZWxlfSAvPlxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gZm9udC1tb25vIHRleHQtZ3JheS02MDBcIj5SwrI9e2ZtdFIyKGRhdGEubWV0YS5yMl93YWxmb3J3YXJkKX08L3NwYW4+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8UmVzcG9uc2l2ZUNvbnRhaW5lciB3aWR0aD1cIjEwMCVcIiBoZWlnaHQ9ezM2MH0+XG4gICAgICAgICAgPExpbmVDaGFydCBkYXRhPXtjaGFydERhdGEgYXMgYW55W119IG1hcmdpbj17eyB0b3A6IDEwLCByaWdodDogMjAsIGxlZnQ6IDAsIGJvdHRvbTogMCB9fT5cbiAgICAgICAgICAgIDxDYXJ0ZXNpYW5HcmlkIHN0cm9rZURhc2hhcnJheT1cIjMgM1wiIHN0cm9rZT1cImhzbCgwLDAlLDkzJSlcIiAvPlxuICAgICAgICAgICAgPFhBeGlzIGRhdGFLZXk9XCJhbm5lZVwiIHRpY2s9e3sgZm9udFNpemU6IDEwIH19IC8+XG4gICAgICAgICAgICA8WUF4aXMgdGljaz17eyBmb250U2l6ZTogMTAgfX0gdGlja0Zvcm1hdHRlcj17diA9PiBmb3JtYXRCeVVuaXRlKHYsIGRhdGEubWV0YS51bml0ZSl9IC8+XG4gICAgICAgICAgICA8VG9vbHRpcFxuICAgICAgICAgICAgICBjb250ZW50PXsoeyBwYXlsb2FkLCBsYWJlbCB9KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFwYXlsb2FkIHx8ICFwYXlsb2FkLmxlbmd0aCkgcmV0dXJuIG51bGxcbiAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy13aGl0ZSBweC0zIHB5LTIgcm91bmRlZCBzaGFkb3cgdGV4dC14c1wiXG4gICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IGJvcmRlcjogJzFweCBzb2xpZCBoc2woMCwwJSw4NSUpJyB9fT5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmb250LWJvbGQgdGV4dC1ncmF5LTgwMCBtYi0xXCI+e2xhYmVsfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICB7dG9wNVBheXMubWFwKChwLCBpKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgZDogYW55ID0gcGF5bG9hZFswXS5wYXlsb2FkXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgdiA9IGRbYCR7cH1fcHJlZGBdID8/IGRbYCR7cH1faGlzdGBdXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHYgPT0gbnVsbCkgcmV0dXJuIG51bGxcbiAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBrZXk9e3B9IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiaW5saW5lLWJsb2NrIHctMiBoLTIgcm91bmRlZC1mdWxsXCIgc3R5bGU9e3sgYmFja2dyb3VuZDogVE9QX0NPTE9SU1tpXSB9fSAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Bhbj57cH0gOiA8c3Ryb25nPntmb3JtYXRCeVVuaXRlKHYsIGRhdGEubWV0YS51bml0ZSl9PC9zdHJvbmc+PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8UmVmZXJlbmNlTGluZSB4PXsyMDI0fSBzdHJva2U9XCJoc2woMCwwJSw2MCUpXCIgc3Ryb2tlRGFzaGFycmF5PVwiNCAzXCIgLz5cbiAgICAgICAgICAgIDxMZWdlbmQgd3JhcHBlclN0eWxlPXt7IGZvbnRTaXplOiAxMSB9fSAvPlxuICAgICAgICAgICAge3RvcDVQYXlzLm1hcCgocCwgaSkgPT4gKFxuICAgICAgICAgICAgICA8TGluZSBrZXk9e2Ake3B9X2hpc3RgfSB0eXBlPVwibW9ub3RvbmVcIiBkYXRhS2V5PXtgJHtwfV9oaXN0YH0gc3Ryb2tlPXtUT1BfQ09MT1JTW2ldfVxuICAgICAgICAgICAgICAgIHN0cm9rZVdpZHRoPXsyfSBkb3Q9e3sgcjogMiB9fSBsZWdlbmRUeXBlPVwibm9uZVwiIC8+XG4gICAgICAgICAgICApKX1cbiAgICAgICAgICAgIHt0b3A1UGF5cy5tYXAoKHAsIGkpID0+IChcbiAgICAgICAgICAgICAgPExpbmUga2V5PXtgJHtwfV9wcmVkYH0gdHlwZT1cIm1vbm90b25lXCIgZGF0YUtleT17YCR7cH1fcHJlZGB9IHN0cm9rZT17VE9QX0NPTE9SU1tpXX1cbiAgICAgICAgICAgICAgICBzdHJva2VXaWR0aD17Mn0gc3Ryb2tlRGFzaGFycmF5PVwiNiAzXCIgZG90PXt7IHI6IDIgfX0gbmFtZT17cH0gLz5cbiAgICAgICAgICAgICkpfVxuICAgICAgICAgIDwvTGluZUNoYXJ0PlxuICAgICAgICA8L1Jlc3BvbnNpdmVDb250YWluZXI+XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy13aGl0ZSByb3VuZGVkLXhsIHAtNFwiIHN0eWxlPXt7IGJvcmRlcjogJzFweCBzb2xpZCBoc2woMCwwJSw5MCUpJyB9fT5cbiAgICAgICAgPFNlY3Rpb25UaXRsZT5DbGFzc2VtZW50IHtkYXRhLmNsYXNzZW1lbnQubGVuZ3RofSBwYXlzIOKAlCB7ZGF0YS5tZXRhLmxhYmVsfSB7aG9yaXpvbn08L1NlY3Rpb25UaXRsZT5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJvdmVyZmxvdy14LWF1dG8gbXQtM1wiPlxuICAgICAgICAgIDx0YWJsZSBjbGFzc05hbWU9XCJ3LWZ1bGwgdGV4dC14c1wiPlxuICAgICAgICAgICAgPHRoZWFkPlxuICAgICAgICAgICAgICA8dHIgY2xhc3NOYW1lPVwiYm9yZGVyLWItMlwiIHN0eWxlPXt7IGJvcmRlckNvbG9yOiBPTElWRV8xNSB9fT5cbiAgICAgICAgICAgICAgICA8dGggY2xhc3NOYW1lPVwidGV4dC1sZWZ0IHB5LTIgcHgtMiB3LThcIj4jPC90aD5cbiAgICAgICAgICAgICAgICA8dGggY2xhc3NOYW1lPVwidGV4dC1sZWZ0IHB5LTIgcHgtMlwiPlBheXM8L3RoPlxuICAgICAgICAgICAgICAgIDx0aCBjbGFzc05hbWU9XCJ0ZXh0LWxlZnQgcHktMiBweC0yXCI+UsOpZ2lvbjwvdGg+XG4gICAgICAgICAgICAgICAgPHRoIGNsYXNzTmFtZT1cInRleHQtcmlnaHQgcHktMiBweC0yXCI+MjAyNDwvdGg+XG4gICAgICAgICAgICAgICAgPHRoIGNsYXNzTmFtZT1cInRleHQtcmlnaHQgcHktMiBweC0yXCI+e2hvcml6b259PC90aD5cbiAgICAgICAgICAgICAgICA8dGggY2xhc3NOYW1lPVwidGV4dC1yaWdodCBweS0yIHB4LTJcIj5WYXJpYXRpb248L3RoPlxuICAgICAgICAgICAgICAgIDx0aCBjbGFzc05hbWU9XCJ0ZXh0LXJpZ2h0IHB5LTIgcHgtMlwiPklDIDk1JTwvdGg+XG4gICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICA8L3RoZWFkPlxuICAgICAgICAgICAgPHRib2R5PlxuICAgICAgICAgICAgICB7ZGF0YS5jbGFzc2VtZW50Lm1hcChyID0+IChcbiAgICAgICAgICAgICAgICA8dHIga2V5PXtyLnBheXN9IGNsYXNzTmFtZT1cImJvcmRlci1iIGhvdmVyOmJnLWdyYXktNTBcIiBzdHlsZT17eyBib3JkZXJDb2xvcjogJ2hzbCgwLDAlLDk1JSknIH19PlxuICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInB5LTEuNSBweC0yIGZvbnQtbW9ubyB0ZXh0LWdyYXktNTAwXCI+e3IucmFuZ308L3RkPlxuICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInB5LTEuNSBweC0yIGZvbnQtc2VtaWJvbGRcIj57ci5wYXlzfTwvdGQ+XG4gICAgICAgICAgICAgICAgICA8dGQgY2xhc3NOYW1lPVwicHktMS41IHB4LTJcIj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiaW5saW5lLWJsb2NrIHctMiBoLTIgcm91bmRlZC1mdWxsIG1yLTEuNVwiXG4gICAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgYmFja2dyb3VuZDogUkVHSU9OX0NPTE9SU1tyLnJlZ2lvbl0gPz8gR1JBWSB9fSAvPlxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LWdyYXktNjAwXCI+e3IucmVnaW9ufTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgICA8dGQgY2xhc3NOYW1lPVwicHktMS41IHB4LTIgdGV4dC1yaWdodCBmb250LW1vbm9cIj57Zm9ybWF0QnlVbml0ZShyLnZhbGV1cl8yMDI0LCBkYXRhLm1ldGEudW5pdGUpfTwvdGQ+XG4gICAgICAgICAgICAgICAgICA8dGQgY2xhc3NOYW1lPVwicHktMS41IHB4LTIgdGV4dC1yaWdodCBmb250LW1vbm8gZm9udC1zZW1pYm9sZFwiPntmb3JtYXRCeVVuaXRlKHIudmFsZXVyX2hvcml6b24sIGRhdGEubWV0YS51bml0ZSl9PC90ZD5cbiAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzc05hbWU9XCJweS0xLjUgcHgtMiB0ZXh0LXJpZ2h0XCI+XG4gICAgICAgICAgICAgICAgICAgIDxEZWx0YUJhZGdlIHY9e3IudmFyaWF0aW9uX3BjdH0gc2Vuc0Zhdm9yYWJsZT17ZGF0YS5tZXRhLnNlbnNfZmF2b3JhYmxlfSAvPlxuICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzc05hbWU9XCJweS0xLjUgcHgtMiB0ZXh0LXJpZ2h0IGZvbnQtbW9ubyB0ZXh0LVsxMHB4XSB0ZXh0LWdyYXktNjAwXCI+XG4gICAgICAgICAgICAgICAgICAgIFt7Zm9ybWF0QnlVbml0ZShyLmljX2xvd2VyLCBkYXRhLm1ldGEudW5pdGUpfSA7IHtmb3JtYXRCeVVuaXRlKHIuaWNfdXBwZXIsIGRhdGEubWV0YS51bml0ZSl9XVxuICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgIDwvdGJvZHk+XG4gICAgICAgICAgPC90YWJsZT5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKVxufVxuXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcbi8vIFRBQiA1IOKAlCBDT01QQVJBSVNPTlxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG5cbmludGVyZmFjZSBDb21wYXJhaXNvbkRhdGEge1xuICB2YXJpYWJsZTogc3RyaW5nXG4gIG1ldGE6IFZhcmlhYmxlTWV0YVxuICBwYXlzX2E6IHsgcGF5czogc3RyaW5nOyByZWdpb246IHN0cmluZzsgZGF0YTogVmFyRGF0YSB9XG4gIHBheXNfYjogeyBwYXlzOiBzdHJpbmc7IHJlZ2lvbjogc3RyaW5nOyBkYXRhOiBWYXJEYXRhIH1cbiAgdGFibGVhdToge1xuICAgIHZhcmlhYmxlOiBzdHJpbmdcbiAgICBsYWJlbDogc3RyaW5nXG4gICAgdW5pdGU6IHN0cmluZ1xuICAgIHNlbnNfZmF2b3JhYmxlOiAnaGF1c3NlJyB8ICdiYWlzc2UnXG4gICAgYV8yMDI0OiBudW1iZXIgfCBudWxsXG4gICAgYV8yMDMwOiBudW1iZXIgfCBudWxsXG4gICAgYV9kZWx0YV9wY3Q6IG51bWJlciB8IG51bGxcbiAgICBiXzIwMjQ6IG51bWJlciB8IG51bGxcbiAgICBiXzIwMzA6IG51bWJlciB8IG51bGxcbiAgICBiX2RlbHRhX3BjdDogbnVtYmVyIHwgbnVsbFxuICAgIGdhZ25hbnQ6IHN0cmluZyB8IG51bGxcbiAgfVtdXG59XG5cbmZ1bmN0aW9uIENvbXBhcmFpc29uVGFiKHsgbWV0YWRhdGEgfTogeyBtZXRhZGF0YTogTWV0YWRhdGEgfSkge1xuICBjb25zdCBbcGF5c0EsIHNldFBheXNBXSA9IHVzZVN0YXRlPHN0cmluZz4obWV0YWRhdGEucGF5cy5pbmNsdWRlcygnTWFyb2MnKSA/ICdNYXJvYycgOiBtZXRhZGF0YS5wYXlzWzBdKVxuICBjb25zdCBbcGF5c0IsIHNldFBheXNCXSA9IHVzZVN0YXRlPHN0cmluZz4obWV0YWRhdGEucGF5cy5pbmNsdWRlcygnw4lneXB0ZScpID8gJ8OJZ3lwdGUnIDogbWV0YWRhdGEucGF5c1sxXSlcbiAgY29uc3QgW3ZhcmlhYmxlLCBzZXRWYXJpYWJsZV0gPSB1c2VTdGF0ZTxzdHJpbmc+KCdudl9wcmltZXMnKVxuICBjb25zdCBbZGF0YSwgc2V0RGF0YV0gPSB1c2VTdGF0ZTxDb21wYXJhaXNvbkRhdGEgfCBudWxsPihudWxsKVxuICBjb25zdCBbbG9hZGluZywgc2V0TG9hZGluZ10gPSB1c2VTdGF0ZSh0cnVlKVxuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKHBheXNBID09PSBwYXlzQikgcmV0dXJuXG4gICAgc2V0TG9hZGluZyh0cnVlKVxuICAgIGFwaS5nZXQ8Q29tcGFyYWlzb25EYXRhPignL3ByZWRpY3Rpb25zL2F4ZTIvY29tcGFyYWlzb24nLCB7XG4gICAgICBwYXJhbXM6IHsgcGF5c19hOiBwYXlzQSwgcGF5c19iOiBwYXlzQiwgdmFyaWFibGUgfVxuICAgIH0pLnRoZW4ociA9PiBzZXREYXRhKHIuZGF0YSkpLmZpbmFsbHkoKCkgPT4gc2V0TG9hZGluZyhmYWxzZSkpXG4gIH0sIFtwYXlzQSwgcGF5c0IsIHZhcmlhYmxlXSlcblxuICBjb25zdCBwYXlzT3B0aW9ucyA9IG1ldGFkYXRhLnBheXNfd2l0aF9yZWdpb24ubWFwKHAgPT4gKHsgdmFsdWU6IHAucGF5cywgbGFiZWw6IHAucGF5cywgcmVnaW9uOiBwLnJlZ2lvbiB9KSlcbiAgY29uc3QgdmFyT3B0aW9ucyA9IG1ldGFkYXRhLmFsbF92YXJzLm1hcCh2ID0+ICh7IHZhbHVlOiB2LCBsYWJlbDogbWV0YWRhdGEudmFyaWFibGVzW3ZdPy5sYWJlbCA/PyB2IH0pKVxuXG4gIGNvbnN0IGNoYXJ0RGF0YSA9IHVzZU1lbW8oKCkgPT4ge1xuICAgIGlmICghZGF0YSkgcmV0dXJuIFtdXG4gICAgY29uc3QgbWFwOiBSZWNvcmQ8bnVtYmVyLCBhbnk+ID0ge31cbiAgICBjb25zdCBzYSA9IGRhdGEucGF5c19hLmRhdGFcbiAgICBjb25zdCBzYiA9IGRhdGEucGF5c19iLmRhdGFcbiAgICBzYS5oaXN0b3JpcXVlLmZvckVhY2goaCA9PiB7IG1hcFtoLmFubmVlXSA9IHsgLi4uKG1hcFtoLmFubmVlXSA/PyB7IGFubmVlOiBoLmFubmVlIH0pLCBhX2hpc3Q6IGgudmFsZXVyIH0gfSlcbiAgICBzYS5wcmVkaWN0aW9ucy5mb3JFYWNoKHAgPT4geyBtYXBbcC5hbm5lZV0gPSB7IC4uLihtYXBbcC5hbm5lZV0gPz8geyBhbm5lZTogcC5hbm5lZSB9KSwgYV9wcmVkOiBwLnZhbGV1ciwgYV9sbzogcC5pY19sb3dlciwgYV9oaTogcC5pY191cHBlciB9IH0pXG4gICAgc2IuaGlzdG9yaXF1ZS5mb3JFYWNoKGggPT4geyBtYXBbaC5hbm5lZV0gPSB7IC4uLihtYXBbaC5hbm5lZV0gPz8geyBhbm5lZTogaC5hbm5lZSB9KSwgYl9oaXN0OiBoLnZhbGV1ciB9IH0pXG4gICAgc2IucHJlZGljdGlvbnMuZm9yRWFjaChwID0+IHsgbWFwW3AuYW5uZWVdID0geyAuLi4obWFwW3AuYW5uZWVdID8/IHsgYW5uZWU6IHAuYW5uZWUgfSksIGJfcHJlZDogcC52YWxldXIsIGJfbG86IHAuaWNfbG93ZXIsIGJfaGk6IHAuaWNfdXBwZXIgfSB9KVxuICAgIGlmIChtYXBbMjAyNF0pIHtcbiAgICAgIG1hcFsyMDI0XS5hX3ByZWQgPSBtYXBbMjAyNF0uYV9oaXN0XG4gICAgICBtYXBbMjAyNF0uYl9wcmVkID0gbWFwWzIwMjRdLmJfaGlzdFxuICAgIH1cbiAgICByZXR1cm4gT2JqZWN0LnZhbHVlcyhtYXApLnNvcnQoKGE6IGFueSwgYjogYW55KSA9PiBhLmFubmVlIC0gYi5hbm5lZSlcbiAgfSwgW2RhdGFdKVxuXG4gIGlmIChsb2FkaW5nIHx8ICFkYXRhKSByZXR1cm4gPGRpdiBjbGFzc05hbWU9XCJzcGFjZS15LTNcIj48U2tlbGV0b25DaGFydCAvPjxTa2VsZXRvbkNoYXJ0IC8+PC9kaXY+XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cInNwYWNlLXktNFwiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy13aGl0ZSByb3VuZGVkLXhsIHAtMyBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyBmbGV4LXdyYXBcIlxuICAgICAgICBzdHlsZT17eyBib3JkZXI6ICcxcHggc29saWQgaHNsKDAsMCUsOTAlKScgfX0+XG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteHMgZm9udC1zZW1pYm9sZCB0ZXh0LWdyYXktNjAwXCI+UGF5cyBBIDo8L3NwYW4+XG4gICAgICAgIDxkaXYgc3R5bGU9e3sgbWluV2lkdGg6IDIwMCB9fT5cbiAgICAgICAgICA8U2VsZWN0XG4gICAgICAgICAgICB2YWx1ZT17cGF5c09wdGlvbnMuZmluZChvID0+IG8udmFsdWUgPT09IHBheXNBKX1cbiAgICAgICAgICAgIG9uQ2hhbmdlPXsobzogYW55KSA9PiBzZXRQYXlzQShvLnZhbHVlKX1cbiAgICAgICAgICAgIG9wdGlvbnM9e3BheXNPcHRpb25zLmZpbHRlcihvID0+IG8udmFsdWUgIT09IHBheXNCKX1cbiAgICAgICAgICAgIHN0eWxlcz17c2VsZWN0U3R5bGVzfVxuICAgICAgICAgIC8+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgdGV4dC1ncmF5LTYwMCBtbC0yXCI+UGF5cyBCIDo8L3NwYW4+XG4gICAgICAgIDxkaXYgc3R5bGU9e3sgbWluV2lkdGg6IDIwMCB9fT5cbiAgICAgICAgICA8U2VsZWN0XG4gICAgICAgICAgICB2YWx1ZT17cGF5c09wdGlvbnMuZmluZChvID0+IG8udmFsdWUgPT09IHBheXNCKX1cbiAgICAgICAgICAgIG9uQ2hhbmdlPXsobzogYW55KSA9PiBzZXRQYXlzQihvLnZhbHVlKX1cbiAgICAgICAgICAgIG9wdGlvbnM9e3BheXNPcHRpb25zLmZpbHRlcihvID0+IG8udmFsdWUgIT09IHBheXNBKX1cbiAgICAgICAgICAgIHN0eWxlcz17c2VsZWN0U3R5bGVzfVxuICAgICAgICAgIC8+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgdGV4dC1ncmF5LTYwMCBtbC0yXCI+VmFyaWFibGUgOjwvc3Bhbj5cbiAgICAgICAgPGRpdiBzdHlsZT17eyBtaW5XaWR0aDogMjIwIH19PlxuICAgICAgICAgIDxTZWxlY3RcbiAgICAgICAgICAgIHZhbHVlPXt2YXJPcHRpb25zLmZpbmQobyA9PiBvLnZhbHVlID09PSB2YXJpYWJsZSl9XG4gICAgICAgICAgICBvbkNoYW5nZT17KG86IGFueSkgPT4gc2V0VmFyaWFibGUoby52YWx1ZSl9XG4gICAgICAgICAgICBvcHRpb25zPXt2YXJPcHRpb25zfVxuICAgICAgICAgICAgc3R5bGVzPXtzZWxlY3RTdHlsZXN9XG4gICAgICAgICAgLz5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy13aGl0ZSByb3VuZGVkLXhsIHAtNFwiIHN0eWxlPXt7IGJvcmRlcjogJzFweCBzb2xpZCBoc2woMCwwJSw5MCUpJyB9fT5cbiAgICAgICAgPFNlY3Rpb25UaXRsZT57ZGF0YS5tZXRhLmxhYmVsfSDigJQge3BheXNBfSB2cyB7cGF5c0J9PC9TZWN0aW9uVGl0bGU+XG4gICAgICAgIDxSZXNwb25zaXZlQ29udGFpbmVyIHdpZHRoPVwiMTAwJVwiIGhlaWdodD17MzYwfT5cbiAgICAgICAgICA8Q29tcG9zZWRDaGFydCBkYXRhPXtjaGFydERhdGEgYXMgYW55W119IG1hcmdpbj17eyB0b3A6IDEwLCByaWdodDogMjAsIGxlZnQ6IDAsIGJvdHRvbTogMCB9fT5cbiAgICAgICAgICAgIDxDYXJ0ZXNpYW5HcmlkIHN0cm9rZURhc2hhcnJheT1cIjMgM1wiIHN0cm9rZT1cImhzbCgwLDAlLDkzJSlcIiAvPlxuICAgICAgICAgICAgPFhBeGlzIGRhdGFLZXk9XCJhbm5lZVwiIHRpY2s9e3sgZm9udFNpemU6IDEwIH19IC8+XG4gICAgICAgICAgICA8WUF4aXMgdGljaz17eyBmb250U2l6ZTogMTAgfX0gdGlja0Zvcm1hdHRlcj17diA9PiBmb3JtYXRCeVVuaXRlKHYsIGRhdGEubWV0YS51bml0ZSl9IC8+XG4gICAgICAgICAgICA8VG9vbHRpcFxuICAgICAgICAgICAgICBjb250ZW50PXsoeyBwYXlsb2FkLCBsYWJlbCB9KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFwYXlsb2FkIHx8ICFwYXlsb2FkLmxlbmd0aCkgcmV0dXJuIG51bGxcbiAgICAgICAgICAgICAgICBjb25zdCBkOiBhbnkgPSBwYXlsb2FkWzBdLnBheWxvYWRcbiAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy13aGl0ZSBweC0zIHB5LTIgcm91bmRlZCBzaGFkb3cgdGV4dC14c1wiXG4gICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IGJvcmRlcjogJzFweCBzb2xpZCBoc2woMCwwJSw4NSUpJyB9fT5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmb250LWJvbGQgdGV4dC1ncmF5LTgwMCBtYi0xXCI+e2xhYmVsfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IHN0eWxlPXt7IGNvbG9yOiBPTElWRSB9fT57cGF5c0F9IDogPHN0cm9uZz57Zm9ybWF0QnlVbml0ZShkLmFfcHJlZCA/PyBkLmFfaGlzdCwgZGF0YS5tZXRhLnVuaXRlKX08L3N0cm9uZz48L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBzdHlsZT17eyBjb2xvcjogTkFWWSB9fT57cGF5c0J9IDogPHN0cm9uZz57Zm9ybWF0QnlVbml0ZShkLmJfcHJlZCA/PyBkLmJfaGlzdCwgZGF0YS5tZXRhLnVuaXRlKX08L3N0cm9uZz48L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8QXJlYSB0eXBlPVwibW9ub3RvbmVcIiBkYXRhS2V5PVwiYV9oaVwiIHN0cm9rZT1cIm5vbmVcIiBmaWxsPXtPTElWRX0gZmlsbE9wYWNpdHk9ezAuMDh9IC8+XG4gICAgICAgICAgICA8QXJlYSB0eXBlPVwibW9ub3RvbmVcIiBkYXRhS2V5PVwiYV9sb1wiIHN0cm9rZT1cIm5vbmVcIiBmaWxsPVwiI2ZmZlwiIGZpbGxPcGFjaXR5PXsxfSAvPlxuICAgICAgICAgICAgPEFyZWEgdHlwZT1cIm1vbm90b25lXCIgZGF0YUtleT1cImJfaGlcIiBzdHJva2U9XCJub25lXCIgZmlsbD17TkFWWX0gZmlsbE9wYWNpdHk9ezAuMDh9IC8+XG4gICAgICAgICAgICA8QXJlYSB0eXBlPVwibW9ub3RvbmVcIiBkYXRhS2V5PVwiYl9sb1wiIHN0cm9rZT1cIm5vbmVcIiBmaWxsPVwiI2ZmZlwiIGZpbGxPcGFjaXR5PXsxfSAvPlxuICAgICAgICAgICAgPFJlZmVyZW5jZUxpbmUgeD17MjAyNH0gc3Ryb2tlPVwiaHNsKDAsMCUsNjAlKVwiIHN0cm9rZURhc2hhcnJheT1cIjQgM1wiIC8+XG4gICAgICAgICAgICA8TGVnZW5kIHdyYXBwZXJTdHlsZT17eyBmb250U2l6ZTogMTEgfX0gLz5cbiAgICAgICAgICAgIDxMaW5lIHR5cGU9XCJtb25vdG9uZVwiIGRhdGFLZXk9XCJhX2hpc3RcIiBzdHJva2U9e09MSVZFfSBzdHJva2VXaWR0aD17Mn0gZG90PXt7IHI6IDIgfX0gbGVnZW5kVHlwZT1cIm5vbmVcIiAvPlxuICAgICAgICAgICAgPExpbmUgdHlwZT1cIm1vbm90b25lXCIgZGF0YUtleT1cImFfcHJlZFwiIHN0cm9rZT17T0xJVkV9IHN0cm9rZVdpZHRoPXsyfSBzdHJva2VEYXNoYXJyYXk9XCI2IDNcIiBkb3Q9e3sgcjogMiB9fSBuYW1lPXtwYXlzQX0gLz5cbiAgICAgICAgICAgIDxMaW5lIHR5cGU9XCJtb25vdG9uZVwiIGRhdGFLZXk9XCJiX2hpc3RcIiBzdHJva2U9e05BVll9IHN0cm9rZVdpZHRoPXsyfSBkb3Q9e3sgcjogMiB9fSBsZWdlbmRUeXBlPVwibm9uZVwiIC8+XG4gICAgICAgICAgICA8TGluZSB0eXBlPVwibW9ub3RvbmVcIiBkYXRhS2V5PVwiYl9wcmVkXCIgc3Ryb2tlPXtOQVZZfSBzdHJva2VXaWR0aD17Mn0gc3Ryb2tlRGFzaGFycmF5PVwiNiAzXCIgZG90PXt7IHI6IDIgfX0gbmFtZT17cGF5c0J9IC8+XG4gICAgICAgICAgPC9Db21wb3NlZENoYXJ0PlxuICAgICAgICA8L1Jlc3BvbnNpdmVDb250YWluZXI+XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy13aGl0ZSByb3VuZGVkLXhsIHAtNFwiIHN0eWxlPXt7IGJvcmRlcjogJzFweCBzb2xpZCBoc2woMCwwJSw5MCUpJyB9fT5cbiAgICAgICAgPFNlY3Rpb25UaXRsZT5UYWJsZWF1IGNvbXBhcmF0aWYg4oCUIERpbWVuc2lvbiB7ZGF0YS5tZXRhLmRpbWVuc2lvbn08L1NlY3Rpb25UaXRsZT5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJvdmVyZmxvdy14LWF1dG8gbXQtMlwiPlxuICAgICAgICAgIDx0YWJsZSBjbGFzc05hbWU9XCJ3LWZ1bGwgdGV4dC14c1wiPlxuICAgICAgICAgICAgPHRoZWFkPlxuICAgICAgICAgICAgICA8dHIgY2xhc3NOYW1lPVwiYm9yZGVyLWItMlwiIHN0eWxlPXt7IGJvcmRlckNvbG9yOiBPTElWRV8xNSB9fT5cbiAgICAgICAgICAgICAgICA8dGggY2xhc3NOYW1lPVwidGV4dC1sZWZ0IHB5LTIgcHgtMlwiPlZhcmlhYmxlPC90aD5cbiAgICAgICAgICAgICAgICA8dGggY2xhc3NOYW1lPVwidGV4dC1yaWdodCBweS0yIHB4LTJcIiBzdHlsZT17eyBjb2xvcjogT0xJVkUgfX0+e3BheXNBfSAyMDI0PC90aD5cbiAgICAgICAgICAgICAgICA8dGggY2xhc3NOYW1lPVwidGV4dC1yaWdodCBweS0yIHB4LTJcIiBzdHlsZT17eyBjb2xvcjogT0xJVkUgfX0+e3BheXNBfSAyMDMwPC90aD5cbiAgICAgICAgICAgICAgICA8dGggY2xhc3NOYW1lPVwidGV4dC1yaWdodCBweS0yIHB4LTJcIj7OlCBBPC90aD5cbiAgICAgICAgICAgICAgICA8dGggY2xhc3NOYW1lPVwidGV4dC1yaWdodCBweS0yIHB4LTJcIiBzdHlsZT17eyBjb2xvcjogTkFWWSB9fT57cGF5c0J9IDIwMjQ8L3RoPlxuICAgICAgICAgICAgICAgIDx0aCBjbGFzc05hbWU9XCJ0ZXh0LXJpZ2h0IHB5LTIgcHgtMlwiIHN0eWxlPXt7IGNvbG9yOiBOQVZZIH19PntwYXlzQn0gMjAzMDwvdGg+XG4gICAgICAgICAgICAgICAgPHRoIGNsYXNzTmFtZT1cInRleHQtcmlnaHQgcHktMiBweC0yXCI+zpQgQjwvdGg+XG4gICAgICAgICAgICAgICAgPHRoIGNsYXNzTmFtZT1cInRleHQtY2VudGVyIHB5LTIgcHgtMlwiPkdhZ25hbnQg4pyTPC90aD5cbiAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgIDwvdGhlYWQ+XG4gICAgICAgICAgICA8dGJvZHk+XG4gICAgICAgICAgICAgIHtkYXRhLnRhYmxlYXUubWFwKHIgPT4gKFxuICAgICAgICAgICAgICAgIDx0ciBrZXk9e3IudmFyaWFibGV9IGNsYXNzTmFtZT1cImJvcmRlci1iXCIgc3R5bGU9e3sgYm9yZGVyQ29sb3I6ICdoc2woMCwwJSw5NSUpJyB9fT5cbiAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzc05hbWU9XCJweS0xLjUgcHgtMiBmb250LXNlbWlib2xkXCI+e3IubGFiZWx9PC90ZD5cbiAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzc05hbWU9XCJweS0xLjUgcHgtMiB0ZXh0LXJpZ2h0IGZvbnQtbW9ub1wiPntmb3JtYXRCeVVuaXRlKHIuYV8yMDI0LCByLnVuaXRlKX08L3RkPlxuICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInB5LTEuNSBweC0yIHRleHQtcmlnaHQgZm9udC1tb25vIGZvbnQtc2VtaWJvbGRcIj57Zm9ybWF0QnlVbml0ZShyLmFfMjAzMCwgci51bml0ZSl9PC90ZD5cbiAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzc05hbWU9XCJweS0xLjUgcHgtMiB0ZXh0LXJpZ2h0XCI+PERlbHRhQmFkZ2Ugdj17ci5hX2RlbHRhX3BjdH0gc2Vuc0Zhdm9yYWJsZT17ci5zZW5zX2Zhdm9yYWJsZX0gLz48L3RkPlxuICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInB5LTEuNSBweC0yIHRleHQtcmlnaHQgZm9udC1tb25vXCI+e2Zvcm1hdEJ5VW5pdGUoci5iXzIwMjQsIHIudW5pdGUpfTwvdGQ+XG4gICAgICAgICAgICAgICAgICA8dGQgY2xhc3NOYW1lPVwicHktMS41IHB4LTIgdGV4dC1yaWdodCBmb250LW1vbm8gZm9udC1zZW1pYm9sZFwiPntmb3JtYXRCeVVuaXRlKHIuYl8yMDMwLCByLnVuaXRlKX08L3RkPlxuICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInB5LTEuNSBweC0yIHRleHQtcmlnaHRcIj48RGVsdGFCYWRnZSB2PXtyLmJfZGVsdGFfcGN0fSBzZW5zRmF2b3JhYmxlPXtyLnNlbnNfZmF2b3JhYmxlfSAvPjwvdGQ+XG4gICAgICAgICAgICAgICAgICA8dGQgY2xhc3NOYW1lPVwicHktMS41IHB4LTIgdGV4dC1jZW50ZXIgdGV4dC1bMTBweF0gZm9udC1ib2xkXCJcbiAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgY29sb3I6IHIuZ2FnbmFudCA9PT0gcGF5c0EgPyBPTElWRSA6IChyLmdhZ25hbnQgPT09IHBheXNCID8gTkFWWSA6ICcjOTk5JykgfX0+XG4gICAgICAgICAgICAgICAgICAgIHtyLmdhZ25hbnQgPz8gJ+KAlCd9XG4gICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgPC90Ym9keT5cbiAgICAgICAgICA8L3RhYmxlPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApXG59XG5cbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuLy8gVEFCIDYg4oCUIENBUlRFIDIwMzBcbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuXG5mdW5jdGlvbiBDYXJ0ZVRhYih7IG1ldGFkYXRhIH06IHsgbWV0YWRhdGE6IE1ldGFkYXRhIH0pIHtcbiAgY29uc3QgW3ZhcmlhYmxlLCBzZXRWYXJpYWJsZV0gPSB1c2VTdGF0ZTxzdHJpbmc+KCdudl9wcmltZXMnKVxuICBjb25zdCBbaG9yaXpvbiwgc2V0SG9yaXpvbl0gPSB1c2VTdGF0ZTxudW1iZXI+KDIwMzApXG4gIGNvbnN0IFtjbGFzc2VtZW50LCBzZXRDbGFzc2VtZW50XSA9IHVzZVN0YXRlPFZhcmlhYmxlRGF0YVsnY2xhc3NlbWVudCddPihbXSlcbiAgY29uc3QgW21ldGEsIHNldE1ldGFdID0gdXNlU3RhdGU8VmFyaWFibGVNZXRhIHwgbnVsbD4obnVsbClcbiAgY29uc3QgW2xvYWRpbmcsIHNldExvYWRpbmddID0gdXNlU3RhdGUodHJ1ZSlcbiAgY29uc3QgW3pvb20sIHNldFpvb21dID0gdXNlU3RhdGUoMS4yKVxuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgc2V0TG9hZGluZyh0cnVlKVxuICAgIGFwaS5nZXQ8VmFyaWFibGVEYXRhPihgL3ByZWRpY3Rpb25zL2F4ZTIvdmFyaWFibGUvJHt2YXJpYWJsZX1gLCB7IHBhcmFtczogeyBob3Jpem9uIH0gfSlcbiAgICAgIC50aGVuKHIgPT4ge1xuICAgICAgICBzZXRDbGFzc2VtZW50KHIuZGF0YS5jbGFzc2VtZW50KVxuICAgICAgICBzZXRNZXRhKHIuZGF0YS5tZXRhKVxuICAgICAgfSkuZmluYWxseSgoKSA9PiBzZXRMb2FkaW5nKGZhbHNlKSlcbiAgfSwgW3ZhcmlhYmxlLCBob3Jpem9uXSlcblxuICBjb25zdCB2YWx1ZUJ5UGF5cyA9IHVzZU1lbW8oKCkgPT4ge1xuICAgIGNvbnN0IG06IFJlY29yZDxzdHJpbmcsIG51bWJlciB8IG51bGw+ID0ge31cbiAgICBjbGFzc2VtZW50LmZvckVhY2gociA9PiB7IG1bci5wYXlzXSA9IHIudmFsZXVyX2hvcml6b24gfSlcbiAgICByZXR1cm4gbVxuICB9LCBbY2xhc3NlbWVudF0pXG5cbiAgY29uc3QgbWluTWF4ID0gdXNlTWVtbygoKSA9PiB7XG4gICAgY29uc3QgdmFscyA9IE9iamVjdC52YWx1ZXModmFsdWVCeVBheXMpLmZpbHRlcigodik6IHYgaXMgbnVtYmVyID0+IHYgIT0gbnVsbCAmJiAhaXNOYU4odikpXG4gICAgaWYgKCF2YWxzLmxlbmd0aCkgcmV0dXJuIHsgbWluOiAwLCBtYXg6IDEgfVxuICAgIHJldHVybiB7IG1pbjogTWF0aC5taW4oLi4udmFscyksIG1heDogTWF0aC5tYXgoLi4udmFscykgfVxuICB9LCBbdmFsdWVCeVBheXNdKVxuXG4gIGNvbnN0IEZSX1RPX0lTTzM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB1c2VNZW1vKCgpID0+IHtcbiAgICBjb25zdCBtOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge31cbiAgICBPYmplY3QuZW50cmllcyhJU08zX05BTUVTKS5mb3JFYWNoKChbaXNvLCBmcl0pID0+IHsgbVtmcl0gPSBpc28gfSlcbiAgICBtWydOaWdlcmlhJ10gPSAnTkdBJ1xuICAgIG1bJ1JEQyddID0gJ0NPRCdcbiAgICByZXR1cm4gbVxuICB9LCBbXSlcblxuICBjb25zdCBJU08zX1RPX1ZBTFVFID0gdXNlTWVtbygoKSA9PiB7XG4gICAgY29uc3QgbTogUmVjb3JkPHN0cmluZywgbnVtYmVyIHwgbnVsbD4gPSB7fVxuICAgIE9iamVjdC5lbnRyaWVzKHZhbHVlQnlQYXlzKS5mb3JFYWNoKChbZnIsIHZdKSA9PiB7XG4gICAgICBjb25zdCBpc28gPSBGUl9UT19JU08zW2ZyXVxuICAgICAgaWYgKGlzbykgbVtpc29dID0gdlxuICAgIH0pXG4gICAgcmV0dXJuIG1cbiAgfSwgW3ZhbHVlQnlQYXlzLCBGUl9UT19JU08zXSlcblxuICBjb25zdCBjb2xvclNjYWxlID0gdXNlTWVtbygoKSA9PiB7XG4gICAgaWYgKHZhcmlhYmxlID09PSAnbnZfcHJpbWVzJyB8fCB2YXJpYWJsZSA9PT0gJ3ZpZV9wcmltZXMnIHx8IHZhcmlhYmxlID09PSAnZ2RwJykgcmV0dXJuIENPTE9SX1NDQUxFU19QT1NJVElPTkVELnByaW1lc1xuICAgIGlmICh2YXJpYWJsZSA9PT0gJ252X3NwJykgcmV0dXJuIENPTE9SX1NDQUxFU19QT1NJVElPTkVELnNwXG4gICAgaWYgKHZhcmlhYmxlID09PSAnbnZfcGVuZXRyYXRpb24nIHx8IHZhcmlhYmxlID09PSAndmllX3BlbmV0cmF0aW9uJykgcmV0dXJuIENPTE9SX1NDQUxFU19QT1NJVElPTkVELnBlbmV0cmF0aW9uXG4gICAgaWYgKHZhcmlhYmxlID09PSAnbnZfZGVuc2l0ZScgfHwgdmFyaWFibGUgPT09ICd2aWVfZGVuc2l0ZScpIHJldHVybiBDT0xPUl9TQ0FMRVNfUE9TSVRJT05FRC5kZW5zaXRlXG4gICAgaWYgKHZhcmlhYmxlID09PSAnZ2RwY2FwJykgcmV0dXJuIENPTE9SX1NDQUxFU19QT1NJVElPTkVELmdkcENhcFxuICAgIGlmICh2YXJpYWJsZSA9PT0gJ2dkcF9ncm93dGgnKSByZXR1cm4gQ09MT1JfU0NBTEVTX1BPU0lUSU9ORUQuY3JvaXNzYW5jZVxuICAgIGlmICh2YXJpYWJsZSA9PT0gJ3BvbHN0YWInIHx8IHZhcmlhYmxlID09PSAncmVncXVhbCcpIHJldHVybiBDT0xPUl9TQ0FMRVNfUE9TSVRJT05FRC53Z2lcbiAgICByZXR1cm4gQ09MT1JfU0NBTEVTX1BPU0lUSU9ORUQucHJpbWVzXG4gIH0sIFt2YXJpYWJsZV0pXG5cbiAgY29uc3QgdmFyT3B0aW9ucyA9IG1ldGFkYXRhLmFsbF92YXJzLm1hcCh2ID0+ICh7IHZhbHVlOiB2LCBsYWJlbDogbWV0YWRhdGEudmFyaWFibGVzW3ZdPy5sYWJlbCA/PyB2IH0pKVxuXG4gIGZ1bmN0aW9uIGNvbG9yRm9yKGlzbzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCB2ID0gSVNPM19UT19WQUxVRVtpc29dXG4gICAgaWYgKHYgPT0gbnVsbCB8fCBpc05hTih2KSkgcmV0dXJuICcjZDBkMGQwJ1xuICAgIGNvbnN0IHQgPSAodiAtIG1pbk1heC5taW4pIC8gTWF0aC5tYXgobWluTWF4Lm1heCAtIG1pbk1heC5taW4sIDFlLTkpXG4gICAgcmV0dXJuIGludGVycG9sYXRlUG9zaXRpb25lZCh0LCBjb2xvclNjYWxlKVxuICB9XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cInNwYWNlLXktNFwiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy13aGl0ZSByb3VuZGVkLXhsIHAtMyBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyBmbGV4LXdyYXBcIlxuICAgICAgICBzdHlsZT17eyBib3JkZXI6ICcxcHggc29saWQgaHNsKDAsMCUsOTAlKScgfX0+XG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteHMgZm9udC1zZW1pYm9sZCB0ZXh0LWdyYXktNjAwXCI+VmFyaWFibGUgOjwvc3Bhbj5cbiAgICAgICAgPGRpdiBzdHlsZT17eyBtaW5XaWR0aDogMjIwIH19PlxuICAgICAgICAgIDxTZWxlY3RcbiAgICAgICAgICAgIHZhbHVlPXt2YXJPcHRpb25zLmZpbmQobyA9PiBvLnZhbHVlID09PSB2YXJpYWJsZSl9XG4gICAgICAgICAgICBvbkNoYW5nZT17KG86IGFueSkgPT4gc2V0VmFyaWFibGUoby52YWx1ZSl9XG4gICAgICAgICAgICBvcHRpb25zPXt2YXJPcHRpb25zfVxuICAgICAgICAgICAgc3R5bGVzPXtzZWxlY3RTdHlsZXN9XG4gICAgICAgICAgLz5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteHMgZm9udC1zZW1pYm9sZCB0ZXh0LWdyYXktNjAwIG1sLTJcIj5Ib3Jpem9uIDo8L3NwYW4+XG4gICAgICAgIHtbMjAyNSwgMjAyNywgMjAzMF0ubWFwKGggPT4gKFxuICAgICAgICAgIDxidXR0b24ga2V5PXtofSBvbkNsaWNrPXsoKSA9PiBzZXRIb3Jpem9uKGgpfVxuICAgICAgICAgICAgY2xhc3NOYW1lPVwicHgtMyBweS0xIHJvdW5kZWQtZnVsbCB0ZXh0LVsxMXB4XSBmb250LXNlbWlib2xkIHRyYW5zaXRpb24tY29sb3JzXCJcbiAgICAgICAgICAgIHN0eWxlPXtob3Jpem9uID09PSBoID8geyBiYWNrZ3JvdW5kOiBPTElWRSwgY29sb3I6ICd3aGl0ZScgfSA6IHsgYmFja2dyb3VuZDogJ2hzbCgwLDAlLDkzJSknLCBjb2xvcjogJyM2YjcyODAnIH19PlxuICAgICAgICAgICAge2h9XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICkpfVxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1sLWF1dG8gZmxleCBnYXAtMVwiPlxuICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gc2V0Wm9vbShNYXRoLm1heCgwLjYsIHpvb20gLSAwLjIpKX1cbiAgICAgICAgICAgIGNsYXNzTmFtZT1cInctOCBoLTggcm91bmRlZCBib3JkZXIgdGV4dC1zbSBmb250LWJvbGRcIj7iiJI8L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IHNldFpvb20oTWF0aC5taW4oMi41LCB6b29tICsgMC4yKSl9XG4gICAgICAgICAgICBjbGFzc05hbWU9XCJ3LTggaC04IHJvdW5kZWQgYm9yZGVyIHRleHQtc20gZm9udC1ib2xkXCI+KzwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXdoaXRlIHJvdW5kZWQteGwgcC0zXCIgc3R5bGU9e3sgYm9yZGVyOiAnMXB4IHNvbGlkIGhzbCgwLDAlLDkwJSknIH19PlxuICAgICAgICB7bWV0YSAmJiAoXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gZmxleC13cmFwIGdhcC0yIG1iLTJcIj5cbiAgICAgICAgICAgIDxTZWN0aW9uVGl0bGU+e21ldGEubGFiZWx9IHtob3Jpem9ufSDigJQge2NsYXNzZW1lbnQubGVuZ3RofSBwYXlzPC9TZWN0aW9uVGl0bGU+XG4gICAgICAgICAgICA8TW9kZWxCYWRnZSBtb2RlbGU9e21ldGEubW9kZWxlfSAvPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICApfVxuICAgICAgICB7bG9hZGluZyA/IDxTa2VsZXRvbkNoYXJ0IC8+IDogKFxuICAgICAgICAgIDxkaXYgc3R5bGU9e3sgaGVpZ2h0OiA1NjAsIHBvc2l0aW9uOiAncmVsYXRpdmUnIH19PlxuICAgICAgICAgICAgPENvbXBvc2FibGVNYXAgcHJvamVjdGlvbj1cImdlb01lcmNhdG9yXCIgcHJvamVjdGlvbkNvbmZpZz17eyBzY2FsZTogMzgwICogem9vbSwgY2VudGVyOiBbMTgsIDRdIH19PlxuICAgICAgICAgICAgICA8Wm9vbWFibGVHcm91cCB6b29tPXsxfSBjZW50ZXI9e1sxOCwgNF19PlxuICAgICAgICAgICAgICAgIDxHZW9ncmFwaGllcyBnZW9ncmFwaHk9e0dFT19VUkx9PlxuICAgICAgICAgICAgICAgICAgeyh7IGdlb2dyYXBoaWVzIH0pID0+XG4gICAgICAgICAgICAgICAgICAgIGdlb2dyYXBoaWVzXG4gICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcigoZ2VvOiBhbnkpID0+IEFGUklDQV9OVU1FUklDLmhhcyhOdW1iZXIoZ2VvLmlkKSkpXG4gICAgICAgICAgICAgICAgICAgICAgLm1hcCgoZ2VvOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzbyA9IE5VTUVSSUNfVE9fSVNPM1tOdW1iZXIoZ2VvLmlkKV1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGwgPSBpc28gPyBjb2xvckZvcihpc28pIDogJyNkMGQwZDAnXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuYW1lID0gaXNvID8gSVNPM19OQU1FU1tpc29dIDogJ0luY29ubnUnXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2ID0gaXNvID8gSVNPM19UT19WQUxVRVtpc29dIDogbnVsbFxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgPEdlb2dyYXBoeSBrZXk9e2dlby5yc21LZXl9IGdlb2dyYXBoeT17Z2VvfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGw9e2ZpbGx9IHN0cm9rZT1cIiNmZmZcIiBzdHJva2VXaWR0aD17MC41fVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiB7IG91dGxpbmU6ICdub25lJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaG92ZXI6IHsgb3V0bGluZTogJ25vbmUnLCBmaWx0ZXI6ICdicmlnaHRuZXNzKDEuMSknLCBjdXJzb3I6ICdwb2ludGVyJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJlc3NlZDogeyBvdXRsaW5lOiAnbm9uZScgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9fT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dGl0bGU+e25hbWV9e3YgIT0gbnVsbCA/IGA6ICR7Zm9ybWF0QnlVbml0ZSh2LCBtZXRhPy51bml0ZSA/PyAnJyl9YCA6ICcgKGhvcnMgcGFuZWwpJ308L3RpdGxlPlxuICAgICAgICAgICAgICAgICAgICAgICAgICA8L0dlb2dyYXBoeT5cbiAgICAgICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIDwvR2VvZ3JhcGhpZXM+XG4gICAgICAgICAgICAgIDwvWm9vbWFibGVHcm91cD5cbiAgICAgICAgICAgIDwvQ29tcG9zYWJsZU1hcD5cblxuICAgICAgICAgICAge21ldGEgJiYgKFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIGJvdHRvbS0zIGxlZnQtMyBiZy13aGl0ZSByb3VuZGVkLWxnIHAtMyB0ZXh0LXhzIHNoYWRvd1wiXG4gICAgICAgICAgICAgICAgc3R5bGU9e3sgYm9yZGVyOiAnMXB4IHNvbGlkIGhzbCgwLDAlLDg1JSknIH19PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZm9udC1ib2xkIHRleHQtZ3JheS03MDAgbWItMVwiPnttZXRhLmxhYmVsfTwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtbW9ubyB0ZXh0LVsxMHB4XVwiPntmb3JtYXRCeVVuaXRlKG1pbk1heC5taW4sIG1ldGEudW5pdGUpfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiaC0zIHctMzIgcm91bmRlZFwiXG4gICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7XG4gICAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogYGxpbmVhci1ncmFkaWVudCh0byByaWdodCwgJHtjb2xvclNjYWxlLm1hcChzID0+IHNbMV0pLmpvaW4oJywnKX0pYCxcbiAgICAgICAgICAgICAgICAgICAgfX0gLz5cbiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtbW9ubyB0ZXh0LVsxMHB4XVwiPntmb3JtYXRCeVVuaXRlKG1pbk1heC5tYXgsIG1ldGEudW5pdGUpfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtZ3JheS01MDAgbXQtMVwiPkhvcnMgQWZyaXF1ZSBkdSBTdWQgKGJpYWlzIGQnw6ljaGVsbGUpPC9kaXY+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKX1cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgKX1cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApXG59XG5cbi8vIOKUgOKUgCBTdHlsZXMgcmVhY3Qtc2VsZWN0IOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuY29uc3Qgc2VsZWN0U3R5bGVzID0ge1xuICBjb250cm9sOiAoYjogYW55KSA9PiAoeyAuLi5iLCBtaW5IZWlnaHQ6IDMyLCBmb250U2l6ZTogMTIsIGJvcmRlckNvbG9yOiAnaHNsKDAsMCUsODUlKScgfSksXG4gIG1lbnU6IChiOiBhbnkpID0+ICh7IC4uLmIsIGZvbnRTaXplOiAxMiwgekluZGV4OiAxMDAgfSksXG4gIG9wdGlvbjogKGI6IGFueSwgczogYW55KSA9PiAoe1xuICAgIC4uLmIsXG4gICAgYmFja2dyb3VuZDogcy5pc1NlbGVjdGVkID8gT0xJVkUgOiAocy5pc0ZvY3VzZWQgPyBPTElWRV84IDogJ3doaXRlJyksXG4gICAgY29sb3I6IHMuaXNTZWxlY3RlZCA/ICd3aGl0ZScgOiAnIzM3NDE1MScsXG4gIH0pLFxufVxuIl0sImZpbGUiOiJDOi9Vc2Vycy9TTUFJS0kvQXRsYW50aWNSZS9mcm9udGVuZC9zcmMvcGFnZXMvUHJlZGljdGlvbnNBeGUyLnRzeCJ9