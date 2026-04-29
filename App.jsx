import { useState, useEffect, useMemo, useRef } from "react";
import { Search, X, ExternalLink, Phone, Mail, Calendar, MapPin, Package, ChevronDown, ChevronUp, Save, Download, Filter as FilterIcon, RotateCcw, CircleAlert, Archive, Clock, Cloud, CloudOff, Copy, Check } from "lucide-react";

// ============================================================
// CATÁLOGO DE OPÇÕES — espelha os dropdowns da Lari
// ============================================================
const NIVEIS = [
  "Creator Blessy",
  "Bestie Blessy",
  "Top Creator Blessy",
  "Gestora Blessy",
];

const STATUS_LIST = ["Ativa", "Em análise", "Curadoria", "Pausada"];

const CATEGORIAS = [
  { value: "SEM POTE",                 bg: "#FEF3C7", fg: "#92400E", border: "#FCD34D" },
  { value: "POSTOU S/VENDA",           bg: "#DBEAFE", fg: "#1E40AF", border: "#93C5FD" },
  { value: "POSTOU C/VENDA",           bg: "#D1FAE5", fg: "#065F46", border: "#6EE7B7" },
  { value: "NÃO POSTOU",               bg: "#FECACA", fg: "#991B1B", border: "#FCA5A5" },
  { value: "CREATOR NOVA/TESTANDO",    bg: "#FED7AA", fg: "#9A3412", border: "#FDBA74" },
];

const FOLLOWUPS = [
  { value: "enviado",              bg: "#DBEAFE", fg: "#1E40AF", border: "#93C5FD" },
  { value: "em andamento",         bg: "#C7D2FE", fg: "#3730A3", border: "#A5B4FC" },
  { value: "sem retorno",          bg: "#FCE7F3", fg: "#9D174D", border: "#F9A8D4" },
  { value: "encerrado",            bg: "#D1FAE5", fg: "#065F46", border: "#6EE7B7" },
  { value: "remover Creator",      bg: "#E5E7EB", fg: "#4B5563", border: "#D1D5DB" },
  { value: "conferindo rastreio",  bg: "#E9D5FF", fg: "#6B21A8", border: "#C4B5FD" },
];

const CATEGORIA_MAP = Object.fromEntries(CATEGORIAS.map(c => [c.value, c]));
const FOLLOWUP_MAP = Object.fromEntries(FOLLOWUPS.map(f => [f.value, f]));

// Sugestão de próxima ação por categoria
const SUGESTAO_ACAO = {
  "POSTOU C/VENDA":         "Manter cadência. Identificar conteúdo top e pedir réplica.",
  "POSTOU S/VENDA":         "Diagnóstico: gancho 3s, cupom visível, CTA, sabor mencionado.",
  "SEM POTE":               "Conferir rastreio com logística. Avisar Creator no privado.",
  "NÃO POSTOU":             "Contato individual. Entender bloqueio (rotina, conteúdo, motivação).",
  "CREATOR NOVA/TESTANDO":  "Onboarding: confirmar app, cupom, grupo e BCA acessada.",
};

// ============================================================
// PALETA BLESSY (alinhada ao manual)
// ============================================================
const COLORS = {
  // Tons base — off-white sutil pra reduzir fadiga visual
  ink:          "#1B2920",  // verde quase preto - texto principal
  paper:        "#FAF8F2",  // off-white com toque levíssimo de warmth
  paperDeep:    "#F2EFE6",  // off-white um pouco mais saturado
  paperDark:    "#E5E0D2",  // bege escuro sutil

  // Verde Blessy
  green:        "#1B3324",
  greenDeep:    "#13241A",
  greenLight:   "#4F7942",
  greenPale:    "#DDE8D4",

  // Pink saturado (não pastel)
  pink:         "#B95576",
  pinkDeep:     "#9D3F5C",
  pinkSoft:     "#F0C9D5",
  pinkPale:     "#FAE3EA",

  // Amarelo manteiga
  yellow:       "#F2E380",
  yellowSoft:   "#F7EEB0",
  yellowPale:   "#FCF7DC",

  // Borda e neutros
  border:       "#E0DAC9",
  borderStrong: "#C5BCA4",
  muted:        "#7A6F5A",

  // Vermelho (alertas)
  red:          "#9D2F2F",
  redPale:      "#F5D3D3",
};
// ============================================================
// HELPERS
// ============================================================
function formatPhone(p) {
  if (!p) return "";
  const digits = String(p).replace(/\D/g, "");
  if (digits.length === 11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
  return p;
}

function whatsappLink(p) {
  if (!p) return null;
  const digits = String(p).replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `https://wa.me/55${digits}`;
}

function formatDate(s) {
  if (!s) return "—";
  const d = new Date(s + "T00:00:00");
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatBRL(n) {
  if (n == null || n === undefined) return "R$ 0,00";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function shortDate(s) {
  if (!s) return "";
  const d = new Date(s + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatTempoNoTime(dias) {
  if (dias == null) return "—";
  if (dias < 60) return `${dias}d`;
  const meses = Math.floor(dias / 30);
  if (meses < 24) return `${meses}m`;
  const anos = Math.floor(meses / 12);
  const restoMeses = meses % 12;
  return restoMeses > 0 ? `${anos}a ${restoMeses}m` : `${anos}a`;
}

const MES_NOMES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function todayMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthKey(key) {
  if (!key) return "";
  const [y, m] = key.split("-");
  const idx = parseInt(m, 10) - 1;
  if (idx < 0 || idx > 11) return key;
  return `${MES_NOMES[idx]}/${y}`;
}

function nextMonthKey(key) {
  const [y, m] = key.split("-").map(Number);
  const next = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
  return `${next.y}-${String(next.m).padStart(2, "0")}`;
}

// ============================================================
// COMPONENTES BÁSICOS
// ============================================================
function Pill({ option, dim = false }) {
  if (!option) {
    return (
      <span
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
        style={{ background: COLORS.paperDeep, color: COLORS.muted, border: `1px solid ${COLORS.border}` }}
      >
        — não definido —
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide"
      style={{
        background: option.bg,
        color: option.fg,
        border: `1px solid ${option.border}`,
        opacity: dim ? 0.7 : 1,
      }}
    >
      {option.value}
    </span>
  );
}

function PillSelect({ value, options, onChange, placeholder = "—" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const opt = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide transition hover:opacity-80"
        style={
          opt
            ? { background: opt.bg, color: opt.fg, border: `1px solid ${opt.border}` }
            : { background: COLORS.paper, color: COLORS.muted, border: `1px dashed ${COLORS.borderStrong}` }
        }
      >
        {opt ? opt.value : placeholder}
        <ChevronDown size={12} />
      </button>
      {open && (
        <div
          className="absolute z-30 mt-1 left-0 min-w-[200px] rounded-lg shadow-lg border overflow-hidden"
          style={{ background: "#fff", borderColor: COLORS.border }}
        >
          <button
            onClick={() => { onChange(null); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-xs hover:bg-stone-50 border-b"
            style={{ color: COLORS.muted, borderColor: COLORS.border }}
          >
            limpar seleção
          </button>
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 hover:bg-stone-50 flex items-center"
            >
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ background: o.bg, color: o.fg, border: `1px solid ${o.border}` }}
              >
                {o.value}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PlainSelect({ value, options, onChange, placeholder = "Selecionar" }) {
  return (
    <select
      value={value || ""}
      onChange={e => onChange(e.target.value || null)}
      className="text-xs rounded-md border px-2 py-1 outline-none focus:ring-2"
      style={{
        background: "#fff",
        borderColor: COLORS.border,
        color: COLORS.ink,
      }}
    >
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function Stat({ label, value, accent, variant }) {
  const variantStyles = {
    green:  { bg: COLORS.greenPale, border: COLORS.greenLight, fg: COLORS.green },
    pink:   { bg: COLORS.pinkSoft,  border: COLORS.pink,       fg: COLORS.pinkDeep },
    yellow: { bg: COLORS.yellowSoft, border: "#D4B941",        fg: "#7A5C0B" },
    plain:  { bg: "#fff", border: COLORS.border, fg: accent || COLORS.green },
  };
  const v = variantStyles[variant] || variantStyles.plain;

  return (
    <div
      className="flex flex-col gap-0.5 px-4 py-2.5 rounded-lg transition-shadow hover:shadow-sm"
      style={{ background: v.bg, border: `1px solid ${v.border}` }}
    >
      <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: COLORS.muted }}>{label}</span>
      <span className="text-2xl font-display font-semibold leading-tight" style={{ color: v.fg }}>
        {value}
      </span>
    </div>
  );
}

// ============================================================
// TAG INPUT — tags livres editáveis
// ============================================================
function TagInput({ tags, onChange }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (adding && inputRef.current) inputRef.current.focus();
  }, [adding]);

  function commit() {
    const v = draft.trim();
    if (v && !tags.includes(v)) {
      onChange([...tags, v]);
    }
    setDraft("");
    setAdding(false);
  }

  function remove(t) {
    onChange(tags.filter(x => x !== t));
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: COLORS.muted }}>
        Tags:
      </span>
      {tags.map(t => (
        <span
          key={t}
          className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium"
          style={{
            background: COLORS.greenPale,
            color: COLORS.green,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          {t}
          <button
            onClick={() => remove(t)}
            className="opacity-50 hover:opacity-100 transition"
            title="remover tag"
            type="button"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      {adding ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setDraft(""); setAdding(false); }
          }}
          onBlur={commit}
          placeholder="nova tag…"
          className="text-[11px] px-2 py-0.5 rounded-md border outline-none focus:ring-1"
          style={{ background: "#fff", borderColor: COLORS.borderStrong, color: COLORS.ink, minWidth: "100px" }}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          type="button"
          className="text-[11px] px-2 py-0.5 rounded-md border border-dashed hover:bg-stone-50 transition"
          style={{ borderColor: COLORS.borderStrong, color: COLORS.muted }}
        >
          + tag
        </button>
      )}
    </div>
  );
}

// ============================================================
// DATE INLINE — campo de data em formato pílula clicável
// ============================================================
function DateInline({ label, value, onChange, iconColor }) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current.showPicker) {
        try { inputRef.current.showPicker(); } catch (_) {}
      }
    }
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="date"
        value={value || ""}
        onChange={e => { onChange(e.target.value || null); setEditing(false); }}
        onBlur={() => setEditing(false)}
        className="text-[11px] px-2 py-1 rounded-md border outline-none"
        style={{ background: "#fff", borderColor: COLORS.border, color: COLORS.ink }}
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      type="button"
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border hover:bg-stone-50 transition text-[11px]"
      style={{
        borderColor: value ? COLORS.border : COLORS.borderStrong,
        borderStyle: value ? "solid" : "dashed",
        color: value ? iconColor || COLORS.ink : COLORS.muted,
        background: value ? COLORS.greenPale : "transparent",
      }}
    >
      <Calendar size={11} />
      {value ? `${label}: ${formatDate(value)}` : label}
      {value && (
        <span
          onClick={e => { e.stopPropagation(); onChange(null); }}
          className="ml-1 opacity-50 hover:opacity-100"
          role="button"
          tabIndex={0}
        >
          <X size={10} />
        </span>
      )}
    </button>
  );
}
// ============================================================
// CREATOR CARD — modo compacto (default) + expandido inline
// ============================================================
function CreatorCard({ creator, edits, onEdit, onMarkActed }) {
  const [expanded, setExpanded] = useState(false);

  const nivel              = edits.nivel        ?? creator.nivel;
  const categoria          = edits.categoria    ?? creator.categoria_mes ?? null;
  const followup           = edits.followup     ?? creator.followup ?? null;
  const proximaAcao        = edits.proxima_acao ?? (categoria ? SUGESTAO_ACAO[categoria] : "") ?? "";
  const obs                = edits.obs          ?? creator.obs ?? "";
  const ultimaAcao         = edits.data_ultima_acao || null;
  const ultimaResposta     = edits.data_ultima_resposta || null;
  const tags               = Array.isArray(edits.tags) ? edits.tags : [];
  const motivo             = edits.motivo_nao_engajamento ?? "";
  const vendasMesManual    = edits.vendas_mes_manual ?? "";

  const semRespostaDepoisDoContato =
    ultimaAcao && ultimaResposta && new Date(ultimaResposta) < new Date(ultimaAcao);

  const wapp = whatsappLink(creator.telefone);

  const sideBorderColor =
    categoria === "POSTOU C/VENDA" ? COLORS.green :
    categoria === "POSTOU S/VENDA" ? "#1E40AF" :
    categoria === "SEM POTE"       ? "#92400E" :
    categoria === "NÃO POSTOU"     ? COLORS.red :
    categoria === "CREATOR NOVA/TESTANDO" ? "#9A3412" :
    COLORS.borderStrong;

  const flagPendente = ultimaAcao
    ? Math.floor((Date.now() - new Date(ultimaAcao).getTime()) / 86400000) > 7
    : (followup === "em andamento" || followup === "sem retorno" || followup === "conferindo rastreio");

  return (
    <div
      className="relative rounded-xl flex flex-col transition-all"
      style={{
        background: "#fff",
        border: `1px solid ${COLORS.border}`,
        borderLeft: `3px solid ${sideBorderColor}`,
        boxShadow: expanded
          ? "0 8px 24px -10px rgba(27, 51, 36, 0.15)"
          : "0 1px 2px rgba(0,0,0,0.02)",
      }}
    >
      {/* CABEÇALHO COMPACTO */}
      <div className="px-3 py-2.5 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <h3 className="font-display text-base font-semibold leading-tight truncate" style={{ color: COLORS.ink }} title={creator.nome}>
                {creator.nome}
              </h3>
              {creator.is_nova_safra && (
                <span
                  className="text-[8px] font-bold uppercase tracking-widest px-1 py-0.5 rounded shrink-0"
                  style={{ background: COLORS.pinkSoft, color: COLORS.pinkDeep }}
                >
                  Nova
                </span>
              )}
              {flagPendente && (
                <CircleAlert size={11} style={{ color: COLORS.red }} />
              )}
            </div>
            <div className="flex items-center gap-1 mt-0.5 text-[11px] truncate" style={{ color: COLORS.muted }}>
              {creator.instagram && (
                <a
                  href={`https://instagram.com/${creator.instagram}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline truncate"
                  onClick={e => e.stopPropagation()}
                >
                  @{creator.instagram}
                </a>
              )}
              {creator.cupom && (
                <>
                  <span>·</span>
                  <span className="font-mono uppercase tracking-wider text-[10px] shrink-0">{creator.cupom}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] flex-wrap" style={{ color: COLORS.muted }}>
          {creator.cidade && (
            <span className="flex items-center gap-0.5 truncate">
              <MapPin size={9} /> {creator.cidade}/{creator.estado}
            </span>
          )}
          <span>·</span>
          <span>
            <span style={{ color: COLORS.green }} className="font-semibold">{creator.vendas || 0}</span> vendas
          </span>
          {creator.dias_no_time != null && (
            <>
              <span>·</span>
              <span>{formatTempoNoTime(creator.dias_no_time)} no time</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <PillSelect
            value={categoria}
            options={CATEGORIAS}
            onChange={v => onEdit({ categoria: v, ...(v && !edits.proxima_acao ? { proxima_acao: SUGESTAO_ACAO[v] } : {}) })}
            placeholder="categoria"
          />
          <PillSelect
            value={followup}
            options={FOLLOWUPS}
            onChange={v => onEdit({ followup: v })}
            placeholder="follow-up"
          />
        </div>

        <select
          value={nivel || ""}
          onChange={e => onEdit({ nivel: e.target.value })}
          className="text-[10px] font-medium rounded-md px-1.5 py-0.5 border self-start mt-0.5"
          style={{
            background: nivel === "Top Creator Blessy" ? COLORS.green : nivel === "Bestie Blessy" ? COLORS.yellowPale : "#fff",
            color: nivel === "Top Creator Blessy" ? "#fff" : COLORS.muted,
            borderColor: COLORS.border,
          }}
        >
          {NIVEIS.map(n => <option key={n} value={n}>{n}</option>)}
        </select>

        {categoria === "POSTOU C/VENDA" && (
          <div
            className="flex items-center gap-1.5 mt-1 px-2 py-1 rounded-md"
            style={{ background: COLORS.greenPale, border: `1px solid ${COLORS.greenLight}` }}
          >
            <span className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: COLORS.green }}>
              Vendas do mês:
            </span>
            <input
              type="number"
              min="0"
              step="1"
              value={vendasMesManual}
              onChange={e => onEdit({ vendas_mes_manual: e.target.value })}
              placeholder={String(creator.vendas || 0)}
              className="text-xs px-1.5 py-0.5 rounded border outline-none focus:ring-1 w-16"
              style={{
                background: "#fff",
                borderColor: COLORS.greenLight,
                color: COLORS.ink,
              }}
            />
          </div>
        )}

        {(tags.length > 0 || expanded) && (
          <div className="mt-1">
            <TagInput tags={tags} onChange={newTags => onEdit({ tags: newTags })} />
          </div>
        )}

        <div className="flex items-center gap-1.5 mt-1.5 text-[10px]">
          {wapp && (
            <a
              href={wapp}
              target="_blank"
              rel="noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-stone-50 transition"
              style={{ color: COLORS.green, border: `1px solid ${COLORS.border}` }}
              title="WhatsApp"
            >
              <Phone size={10} />
            </a>
          )}
          <button
            onClick={onMarkActed}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-stone-50 transition"
            style={{ color: COLORS.ink, border: `1px solid ${COLORS.border}` }}
            title="Registra que falei com ela hoje"
          >
            <Save size={10} /> falei
          </button>
          {ultimaAcao && (
            <span style={{ color: COLORS.muted }}>
              {shortDate(ultimaAcao)}
            </span>
          )}
          {semRespostaDepoisDoContato && (
            <CircleAlert size={11} style={{ color: COLORS.red }} />
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className="ml-auto inline-flex items-center gap-0.5 hover:underline"
            style={{ color: COLORS.muted }}
          >
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </div>
      </div>

      {/* SEÇÃO EXPANDIDA */}
      {expanded && (
        <div
          className="px-3 py-2.5 border-t"
          style={{ borderColor: COLORS.border, background: COLORS.paper }}
        >
          <div className="mb-2.5">
            <label className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: COLORS.muted }}>
              Próxima ação
            </label>
            <textarea
              value={proximaAcao}
              onChange={e => onEdit({ proxima_acao: e.target.value })}
              rows={2}
              className="w-full mt-0.5 text-xs px-2 py-1.5 rounded-md border outline-none focus:ring-1 resize-none"
              style={{
                background: "#fff",
                borderColor: COLORS.border,
                color: COLORS.ink,
                fontFamily: "Manrope, system-ui, sans-serif",
              }}
              placeholder="O que vou fazer com essa Creator?"
            />
          </div>

          <div className="mb-2.5">
            <DateInline
              label="ela respondeu em"
              value={ultimaResposta}
              onChange={v => onEdit({ data_ultima_resposta: v })}
              iconColor={COLORS.green}
            />
          </div>

          <div className="mb-2.5">
            <label className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: COLORS.muted }}>
              Motivo do não-engajamento
            </label>
            <textarea
              value={motivo}
              onChange={e => onEdit({ motivo_nao_engajamento: e.target.value })}
              rows={2}
              className="w-full mt-0.5 text-xs px-2 py-1.5 rounded-md border outline-none focus:ring-1 resize-none"
              style={{
                background: "#fff",
                borderColor: COLORS.border,
                color: COLORS.ink,
                fontFamily: "Manrope, system-ui, sans-serif",
              }}
              placeholder="O que tá segurando essa Creator?"
            />
          </div>

          <div className="mb-2.5">
            <label className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: COLORS.muted }}>
              OBS
            </label>
            <textarea
              value={obs}
              onChange={e => onEdit({ obs: e.target.value })}
              rows={2}
              className="w-full mt-0.5 text-xs px-2 py-1.5 rounded-md border outline-none focus:ring-1 resize-none"
              style={{
                background: "#fff",
                borderColor: COLORS.border,
                color: COLORS.ink,
                fontFamily: "Manrope, system-ui, sans-serif",
              }}
              placeholder="Observações livres."
            />
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] pt-2 border-t" style={{ borderColor: COLORS.border }}>
            <DetailMini label="Status" value={creator.status} />
            <DetailMini label="Comissão" value={creator.comissao_pct ? `${creator.comissao_pct}%` : "—"} />
            <DetailMini label="Saldo" value={formatBRL(creator.saldo)} />
            <DetailMini label="Última comissão" value={creator.last_comission ? formatBRL(creator.last_comission) : "—"} />
            <DetailMini label="Entrou em" value={formatDate(creator.data_entrada)} />
            <DetailMini label="Último pedido" value={formatDate(creator.data_ultimo_pedido)} />
            <DetailMini label="Reposição" value={creator.recebe_reposicao || "—"} />
            <DetailMini label="BCA" value={creator.bca_enviado || "—"} />
            <DetailMini label="Email" value={creator.email || "—"} />
            <DetailMini label="Rede principal" value={creator.rede_principal || "—"} />
          </div>
        </div>
      )}
    </div>
  );
}

function DetailMini({ label, value }) {
  return (
    <div className="flex items-center gap-1 min-w-0">
      <span className="uppercase tracking-wider shrink-0" style={{ color: COLORS.muted }}>{label}:</span>
      <span className="truncate" style={{ color: COLORS.ink }} title={value}>{value}</span>
    </div>
  );
}

const CREATORS_DATA = [{"id":"1731452975526x107045787994685440","nome":"Beatriz Bortolassi","cupom":"BIAB","instagram":"bbortolassidaily","telefone":"6599077755","email":"bortolassibeatriz@gmail.com","nivel":"Top Creator Blessy","status":"Em análise","cidade":"Porto Velho","estado":"RO","vendas":165,"saldo":0,"last_comission":15.0,"comissao_pct":20.0,"data_entrada":"2024-05-22","data_ultimo_pedido":null,"dias_no_time":707,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1761842405223x548321024836955200","nome":"Beatriz Isa Fiorotto","cupom":"BEATRIZ","instagram":"beatrizfiorotto","telefone":"19991458435","email":"biafiorotto@gmail.com","nivel":"Top Creator Blessy","status":"Ativa","cidade":"Americana","estado":"SP","vendas":27,"saldo":0,"last_comission":0,"comissao_pct":20.0,"data_entrada":"2025-10-30","data_ultimo_pedido":null,"dias_no_time":180,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1731358797260x360955739331887100","nome":"Gisele Arins Beckhäuser","cupom":"GIARINS","instagram":"giselearinss","telefone":"47989003248","email":"contatogiselearins@gmail.com","nivel":"Top Creator Blessy","status":"Ativa","cidade":"Joinville","estado":"SC","vendas":451,"saldo":0,"last_comission":20.0,"comissao_pct":25.0,"data_entrada":"2024-05-21","data_ultimo_pedido":null,"dias_no_time":708,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Tiktok","categoria_mes":null,"followup":null,"obs":null},{"id":"1731456359014x423389714313379840","nome":"Julia Pandolfo Fernandes","cupom":"JUPANDOLFO","instagram":"juupandolfo","telefone":"19996571198","email":"contato.juliapandolfo@gmail.com","nivel":"Top Creator Blessy","status":"Ativa","cidade":"Saltinho","estado":"SP","vendas":102,"saldo":0,"last_comission":15.0,"comissao_pct":20.0,"data_entrada":"2024-08-12","data_ultimo_pedido":null,"dias_no_time":625,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1760539459365x669262836329055400","nome":"Karla Bianca Macedo de Paiva","cupom":"KARLAPAIVA","instagram":"karlapaiva.bari","telefone":"62986251009","email":"advkarlapaiva@gmail.com","nivel":"Top Creator Blessy","status":"Ativa","cidade":"Aparecida De Goiânia","estado":"GO","vendas":106,"saldo":0,"last_comission":0,"comissao_pct":20.0,"data_entrada":"2025-11-16","data_ultimo_pedido":null,"dias_no_time":163,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1735365285033x127552938271834110","nome":"Keizy Santana","cupom":"KEIZY","instagram":"keizy_santana","telefone":"15997394018","email":"Keizysantana@icloud.com","nivel":"Top Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":35,"saldo":0,"last_comission":20.0,"comissao_pct":25.0,"data_entrada":"2025-12-18","data_ultimo_pedido":null,"dias_no_time":132,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1743450476777x204406402184904700","nome":"Laura Brassanini","cupom":"LAURA5","instagram":"laubrassanini","telefone":"11973070799","email":"laubrassanini@hotmail.com","nivel":"Top Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":175,"saldo":0,"last_comission":0,"comissao_pct":20.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1731455200518x160724579873456130","nome":"Maria Celia","cupom":"MARIACELIA","instagram":"mariacelianeiva","telefone":"31986587247","email":"mariaceliatorres16@hotmail.com","nivel":"Top Creator Blessy","status":"Ativa","cidade":"Coronel Fabriciano","estado":"MG","vendas":188,"saldo":0,"last_comission":15.0,"comissao_pct":20.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1756236336132x952271081312763900","nome":"Maria Eduarda Massia","cupom":"DUDADAILY","instagram":"dudamassiadaily","telefone":"47996725163","email":"eduarda.massia@gmail.com","nivel":"Top Creator Blessy","status":"Ativa","cidade":"Balneário Camboriú","estado":"SC","vendas":50,"saldo":0,"last_comission":0,"comissao_pct":20.0,"data_entrada":"2025-08-26","data_ultimo_pedido":null,"dias_no_time":245,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Pendente","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1746582651320x520275313814929400","nome":"Natália Lima","cupom":"NATLIMA","instagram":"natalialimavlog","telefone":"21987557775","email":"natalialimapublic@gmail.com","nivel":"Top Creator Blessy","status":"Ativa","cidade":"Rio de Janeiro","estado":"RJ","vendas":101,"saldo":0,"last_comission":0,"comissao_pct":20.0,"data_entrada":"2025-11-05","data_ultimo_pedido":null,"dias_no_time":175,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1731197339878x389003370462969860","nome":"Nicole Barroso Jandre","cupom":"BYNI","instagram":"daily.byni","telefone":"22998912915","email":"nicolejandre123@gmail.com","nivel":"Top Creator Blessy","status":"Ativa","cidade":"Nova Friburgo","estado":"RJ","vendas":108,"saldo":0,"last_comission":20.0,"comissao_pct":20.0,"data_entrada":"2024-05-23","data_ultimo_pedido":null,"dias_no_time":706,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1731452131805x477239765203943400","nome":"Rafaela Mansur Silveira","cupom":"MANSUR","instagram":"raafamansur","telefone":"53981200600","email":"raafaelamsilveira@gmail.com","nivel":"Top Creator Blessy","status":"Ativa","cidade":"Porto Alegre","estado":"RS","vendas":172,"saldo":0,"last_comission":15.0,"comissao_pct":20.0,"data_entrada":"2024-05-22","data_ultimo_pedido":null,"dias_no_time":707,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1731550222306x793077575429652500","nome":"Rebeca Boaventura Falcão","cupom":"REBI","instagram":"rebidaily","telefone":"61999211049","email":"Rebi.parcerias@gmail.com","nivel":"Top Creator Blessy","status":"Ativa","cidade":"Brasília","estado":"DF","vendas":170,"saldo":0,"last_comission":0,"comissao_pct":20.0,"data_entrada":"101-01-01","data_ultimo_pedido":null,"dias_no_time":703210,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1731197182561x818176329246048300","nome":"Saíra Fernandes Yamachi","cupom":"SAIRA","instagram":"saira_fe","telefone":"11964424670","email":"sairafy2000@gmail.com","nivel":"Top Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":131,"saldo":0,"last_comission":15.0,"comissao_pct":20.0,"data_entrada":"2024-02-05","data_ultimo_pedido":null,"dias_no_time":814,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1731557271339x915672216761794600","nome":"Taynara Batista","cupom":"AMIGADATAY","instagram":"tay_batista","telefone":"11978027217","email":"taynara.s.batista@outlook.com","nivel":"Top Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":47,"saldo":0,"last_comission":0,"comissao_pct":20.0,"data_entrada":"2024-10-28","data_ultimo_pedido":null,"dias_no_time":548,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1731455043038x958505319353811000","nome":"Amanda Vitória Paulino Moreira","cupom":"AMANDAV","instagram":"amandavmpersonal","telefone":"31992708046","email":"amandavmpersonal@gmail.com","nivel":"Bestie Blessy","status":"Ativa","cidade":"Aracruz","estado":"ES","vendas":19,"saldo":0,"last_comission":15.0,"comissao_pct":15.0,"data_entrada":"2024-05-23","data_ultimo_pedido":null,"dias_no_time":706,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1742652060565x984867551419039700","nome":"Bárbara da Silva Santos Melo","cupom":"BABIMELO","instagram":"babisantosmelo","telefone":"85996365325","email":"contato.barbaramelo@outlook.com","nivel":"Bestie Blessy","status":"Ativa","cidade":"Eusébio","estado":"CE","vendas":45,"saldo":0,"last_comission":0,"comissao_pct":15.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1731544354253x152320444456239100","nome":"Carla Ludimila de Paula Lopes","cupom":"CARLA","instagram":"carlaludimila","telefone":"65992408305","email":"carla.ludimila@hotmail.com","nivel":"Bestie Blessy","status":"Ativa","cidade":"Cuiabá","estado":"MT","vendas":45,"saldo":0,"last_comission":0,"comissao_pct":15.0,"data_entrada":"2024-10-17","data_ultimo_pedido":null,"dias_no_time":559,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1731458137529x676717866037280800","nome":"Giovanna Davóglio","cupom":"GIO5","instagram":"giodavoglio","telefone":"(61) 99610-9094","email":"gigidavoglio@gmail.com","nivel":"Bestie Blessy","status":"Em análise","cidade":"Brasília","estado":"DF","vendas":13,"saldo":0.0,"last_comission":15.0,"comissao_pct":15.0,"data_entrada":"2026-03-01","data_ultimo_pedido":null,"dias_no_time":59,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1739124659301x736714109977624600","nome":"Laura Farias","cupom":"LAURA","instagram":"llaurafariias","telefone":"85988084195","email":"laurafariascontato@gmail.com","nivel":"Bestie Blessy","status":"Ativa","cidade":"Fortaleza","estado":"CE","vendas":24,"saldo":0,"last_comission":0,"comissao_pct":15.0,"data_entrada":"2025-02-09","data_ultimo_pedido":null,"dias_no_time":444,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1746561087091x727066871574036500","nome":"Luísa Tonhá Silva","cupom":"LTBLESSY","instagram":"luisa.tonha","telefone":"71992426498","email":"luisatonha12@gmail.com","nivel":"Bestie Blessy","status":"Ativa","cidade":"Salvador","estado":"BA","vendas":45,"saldo":0,"last_comission":0,"comissao_pct":15.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1742656327528x782314821895848000","nome":"Maria Beatris Paes","cupom":"TRIS","instagram":"trispaes","telefone":"16994341717","email":"mbeatrispaes@gmail.com","nivel":"Bestie Blessy","status":"Ativa","cidade":"Ribeirão Preto","estado":"SP","vendas":33,"saldo":0,"last_comission":0,"comissao_pct":15.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1739147044311x811494481523638300","nome":"Maria Julia Durães Camargo","cupom":"MAJU5","instagram":"maju.crmg","telefone":"(61) 99252-8297","email":"medicinamariajulia@gmail.com","nivel":"Bestie Blessy","status":"Curadoria","cidade":"Brasília","estado":"DF","vendas":134,"saldo":0,"last_comission":0,"comissao_pct":20.0,"data_entrada":"2025-02-09","data_ultimo_pedido":null,"dias_no_time":444,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1742597657700x515896103360790500","nome":"Mariana Reguini Ferreira","cupom":"MARIR","instagram":"marianareguini","telefone":"32988177436","email":"marianareguini@outlook.com","nivel":"Bestie Blessy","status":"Ativa","cidade":"Santo Antônio do Aventureiro","estado":"MG","vendas":55,"saldo":0,"last_comission":0,"comissao_pct":20.0,"data_entrada":"2025-02-03","data_ultimo_pedido":null,"dias_no_time":450,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1760144798146x752565145993988000","nome":"Nicole Zancanella","cupom":"NICOLEZ","instagram":"nicolezancanella","telefone":"47997187788","email":"contatonizancanella@gmail.com","nivel":"Bestie Blessy","status":"Ativa","cidade":"Itajaí","estado":"SC","vendas":165,"saldo":0,"last_comission":0,"comissao_pct":20.0,"data_entrada":"2025-10-10","data_ultimo_pedido":null,"dias_no_time":200,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1731556421862x364107650892038140","nome":"Priscila Gurgel","cupom":"PRIGURGEL","instagram":"_priscilagurgel","telefone":"21988086595","email":"priscilagurgel.contato@gmail.com","nivel":"Bestie Blessy","status":"Ativa","cidade":"Rio de Janeiro","estado":"RJ","vendas":23,"saldo":0,"last_comission":0,"comissao_pct":15.0,"data_entrada":"2024-10-22","data_ultimo_pedido":null,"dias_no_time":554,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1742599654451x632127818545233900","nome":"Sabrina Iris de Camargo Mendes","cupom":"SABRINA","instagram":"sabriina.mendees","telefone":"11934513250","email":"sabrinammendes0311@gmail.com","nivel":"Bestie Blessy","status":"Ativa","cidade":"Bragança Paulista","estado":"SP","vendas":33,"saldo":0,"last_comission":0,"comissao_pct":15.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Não recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1737848138451x948630419764674600","nome":"Ludimila Ferreira de Jesus Souza","cupom":"LUDIMILANUTRI","instagram":"Ludimilanutricionista","telefone":"7582874875","email":"ludimila.nutri16@gmail.com","nivel":"Partner da Saúde","status":"Ativa","cidade":"Retirolândia","estado":"BA","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":15.0,"data_entrada":"2025-01-25","data_ultimo_pedido":null,"dias_no_time":459,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":null,"agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776066614366x591233514291549200","nome":"Adrielly Ladeira de Marco","cupom":"ADRIELLY","instagram":"adriellyladeira","telefone":"21974709424","email":"ladeiraadrielly@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Petrópolis","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-13","data_ultimo_pedido":null,"dias_no_time":15,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1770659107811x819901955015223600","nome":"Alana Troian Humenhuk","cupom":"ALANATROIAN","instagram":"alanatroian","telefone":"51992875659","email":"alanathumenhuk@outlook.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Leopoldo","estado":"RS","vendas":1,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-10","data_ultimo_pedido":null,"dias_no_time":77,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1739122459759x628606847645122600","nome":"Alanna Alcântara","cupom":"ALANNA","instagram":"alanna.alcn","telefone":"7193592123","email":"alannaalcn.collabs@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Lauro de Freitas","estado":"BA","vendas":5,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-02-09","data_ultimo_pedido":null,"dias_no_time":444,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Não recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1770370781953x317332514530751300","nome":"Alesca Larissa Calazans de Souza","cupom":"ALESCA","instagram":"alescalarissa","telefone":"82999460444","email":"contato.alescalarissa@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Arapiraca","estado":"AL","vendas":1,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-10","data_ultimo_pedido":null,"dias_no_time":77,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Tiktok","categoria_mes":null,"followup":null,"obs":null},{"id":"1767636799357x540989456613276900","nome":"Alexia Lais Azevedo","cupom":"BYLEXIE","instagram":"bylexiazevedo","telefone":"81989943993","email":"hellobylexie@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Natal","estado":"RN","vendas":10,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-01-14","data_ultimo_pedido":null,"dias_no_time":104,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1754322766062x167177857709637630","nome":"Alice Cristina da Silva Severo","cupom":"SEVERO","instagram":"alice.svro","telefone":"51997817664","email":"contato.alicesevero@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Leopoldo","estado":"RS","vendas":2,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-10-30","data_ultimo_pedido":null,"dias_no_time":180,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1770835820581x421739769414622340","nome":"Alice D’carla","cupom":"ALICED","instagram":"alicedcarla","telefone":"84996143888","email":"contatoalicedcarla@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Parnamirim","estado":"RN","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-11","data_ultimo_pedido":null,"dias_no_time":76,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1775744216569x549819302734700700","nome":"Alice Sebold","cupom":"ALICE","instagram":"alice_sbld","telefone":"46999370345","email":"contato.alicesebold@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Salto Do Lontra","estado":"PR","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769401046929x234185588771994800","nome":"Aline Costa","cupom":"LINECOSTA","instagram":"bylinecosta","telefone":"64992687090","email":"alinevcosta2004@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Itumbiara","estado":"GO","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1775067875504x644927350196741000","nome":"Aline Leão","cupom":"ALINE","instagram":"alineleaao","telefone":"81998681731","email":"alineleaao@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Recife","estado":"PE","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1761671601289x738649264886156300","nome":"Alline Miranda da Costa","cupom":"ALLINE","instagram":"allinenutri","telefone":"11932724204","email":"allinemirandact@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":4,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-10-30","data_ultimo_pedido":null,"dias_no_time":180,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773312165248x849975445478721800","nome":"Amanda Agassi Geronimo","cupom":"AMANDAAGASSI","instagram":"amandaagassi","telefone":"48996320609","email":"amanda.geronimo@vanelise.com.br","nivel":"Creator Blessy","status":"Ativa","cidade":"Criciúma","estado":"SC","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-11","data_ultimo_pedido":null,"dias_no_time":17,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773967083557x984872745487659400","nome":"Amanda Barbosa","cupom":"ABMAND","instagram":"abmand","telefone":"13997461252","email":"amandabarbosaolisilva@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Peruíbe","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1760279635687x975194413944004500","nome":"Amanda Cabral Chaves","cupom":"AMANDACABRAL","instagram":"amandacabraal_","telefone":"62998332283","email":"contatoamandaccabral@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Nova Xavantina","estado":"MT","vendas":7,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-16","data_ultimo_pedido":null,"dias_no_time":163,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1752949507617x746527839168757800","nome":"Amanda Camilo Ribeiro","cupom":"AMANDACAMILO","instagram":"amandacamilo","telefone":"62985065208","email":"contatoamandacamilo@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Inhumas","estado":"GO","vendas":8,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-07-22","data_ultimo_pedido":null,"dias_no_time":280,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773343325492x869084864446516100","nome":"Amanda Matzembacher","cupom":"AMANDAMACALLI","instagram":"amandamacalli","telefone":"51997932242","email":"soaressr200@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Porto Alegre","estado":"RS","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-11","data_ultimo_pedido":null,"dias_no_time":17,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1770155667987x494512952665616450","nome":"Amanda Paschoalino","cupom":"AMANDABARI","instagram":"aamandapass","telefone":"16997713024","email":"amaandapas.18@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Ribeirão Preto","estado":"SP","vendas":1,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-10","data_ultimo_pedido":null,"dias_no_time":77,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1753114329905x932051324193734700","nome":"Amay Spolaore Barbosa de Freitas","cupom":"AMAY","instagram":"amayfreitas","telefone":"11999922924","email":"mahfreitas17@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":54,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-07-21","data_ultimo_pedido":null,"dias_no_time":281,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1762591454243x378872936555426600","nome":"Ana Carolina Alvarez Sena","cupom":"ANALLOGIAS","instagram":"anallogias","telefone":"51981983455","email":"anallogiascontato@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Porto Alegre","estado":"RS","vendas":15,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-16","data_ultimo_pedido":null,"dias_no_time":163,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773175028424x750053617585233500","nome":"Ana Carolina Stamato Dias","cupom":"ANASTAMATTO","instagram":"anastamatto","telefone":"71993066810","email":"anacarolina@agencia206.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Salvador","estado":"BA","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-11","data_ultimo_pedido":null,"dias_no_time":17,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1763066416484x324914320608229250","nome":"Ana Caroline Magalhaes","cupom":"CMAGALHÃES","instagram":"cmagalhaess_","telefone":"19994700150","email":"anacarolinasilvamagalhaes@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-15","data_ultimo_pedido":null,"dias_no_time":164,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1747518630211x626830357931229200","nome":"Ana Flávia Veríssimo Santos","cupom":"ANAVERISSIMO","instagram":"anaverissimooo","telefone":"11997965282","email":"contatoanaverissimooo@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":8,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Pendente","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1775833720744x549909707507331600","nome":"Ana Gabriele da Silva Sousa","cupom":"ANAGAB","instagram":"anagabrriele","telefone":"88999974481","email":"gabrieleban.anaz@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Fortaleza","estado":"CE","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769805516377x435585899888548700","nome":"Ana Gonçalves","cupom":"ANAGON","instagram":"aana.gon","telefone":"21985985221","email":"anacarolfg01@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Rio de Janeiro","estado":"RJ","vendas":1,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-01-30","data_ultimo_pedido":null,"dias_no_time":88,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768603831543x169188250414296080","nome":"Ana Julia Thomé","cupom":"ANATHOME","instagram":"ana.thome","telefone":"17981430971","email":"contatoanathome@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Barretos","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1754677990526x815702399405785100","nome":"Ana Julia Vilas Boas Gomory","cupom":"ANAGOMORY","instagram":"anagomory","telefone":"19971509700","email":"anagomory21@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Campinas","estado":"SP","vendas":5,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-08-11","data_ultimo_pedido":null,"dias_no_time":260,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":null,"agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1762736969700x637405560453312400","nome":"Ana Júlia Vargas","cupom":"ANAVARGAS","instagram":"anajuliavsg","telefone":"51989718981","email":"anajuliavargas.sm@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Gravataí","estado":"RS","vendas":3,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-16","data_ultimo_pedido":null,"dias_no_time":163,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1767634232177x342946156905741500","nome":"Ana Kelly Mota","cupom":"ANAKELLY","instagram":"anakellymota","telefone":"47991268829","email":"aptobnujobs@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Blumenau","estado":"SC","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769741702786x735965526363307600","nome":"Ana Klara Peneda","cupom":"ANAKLARA","instagram":"anaklaragpp","telefone":"27992416335","email":"anaklarapeneda@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Santa Teresa","estado":"ES","vendas":6,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-11","data_ultimo_pedido":null,"dias_no_time":76,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1757688096942x151492167986053120","nome":"Ana Laura Baldin","cupom":"ANALAURA","instagram":"analaurabaldin","telefone":"19999240769","email":"analaura.baldin@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Araçatuba","estado":"SP","vendas":6,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-09-13","data_ultimo_pedido":null,"dias_no_time":227,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Não recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769436401124x350353301385794400","nome":"Ana Luisa Oliveira de Figueiredo","cupom":"LUISAFIGUEIREDO","instagram":"_luisafigueiredo","telefone":"74999542494","email":"luisafigueiredocontato@outlook.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Irecê","estado":"BA","vendas":2,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1771551364913x380698473069784200","nome":"Ana Luíza Antonino Valim Maia","cupom":"ANAMAIA","instagram":"analuizamaia.p","telefone":"61999472907","email":"studymaiacontato@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Brasília","estado":"DF","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769529412316x278082713538248860","nome":"Ana Paula Nobre","cupom":"ANAPNOBRE","instagram":"anapaula.nobres","telefone":"45999594291","email":"contato.anapaulanobre@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Catanduva","estado":"SP","vendas":2,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-12","data_ultimo_pedido":null,"dias_no_time":75,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1765306731197x842810292675899600","nome":"Ana Paula Pulga","cupom":"ANAPPULGA","instagram":"anappulga","telefone":"14996764669","email":"anappulga@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Bauru","estado":"SP","vendas":1,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776886610275x859801949178505200","nome":"Ana Paula Spiering","cupom":null,"instagram":"nutrianapaulaspiering","telefone":"53991371132","email":"anapaulaspiering@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Pelotas","estado":"RS","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":0,"data_entrada":"2026-04-27","data_ultimo_pedido":null,"dias_no_time":1,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Não recebe","bca_enviado":null,"agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776205449556x779103247889763500","nome":"Ana Victoria Alves Ferreira","cupom":"VICTORIAALVES","instagram":"victoriaalvss","telefone":"85988326791","email":"victoriaalvss12@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Fortaleza","estado":"CE","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-14","data_ultimo_pedido":null,"dias_no_time":14,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1775484507723x874539772873732500","nome":"Ana Vitoria Fraga Quintão da Gama","cupom":"ANAVQUINTAO","instagram":"anav_quintao","telefone":"31996919050","email":"anaqdagama@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Nova Lima","estado":"MG","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773665555076x139045163148664880","nome":"Ana Vitoria Soares de Souza","cupom":"VISOAREZ","instagram":"vvisoarez","telefone":"51997937780","email":"influvisoarez@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Gravataí","estado":"RS","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Tiktok","categoria_mes":null,"followup":null,"obs":null},{"id":"1761852758371x221131834224044260","nome":"Ananda Pinto Albuquerque","cupom":"ANANDA","instagram":"nanndadaily_","telefone":"75999273478","email":"nanndadaily_@outlook.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Salvador","estado":"BA","vendas":3,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-10-30","data_ultimo_pedido":null,"dias_no_time":180,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1770383323550x635932959694605300","nome":"Anaue Sousa de Faria","cupom":"ANAUE","instagram":"anaueeee","telefone":"12996202023","email":"contato.anauefaria@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Pindamonhangaba","estado":"SP","vendas":1,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-02","data_ultimo_pedido":null,"dias_no_time":86,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Tiktok","categoria_mes":null,"followup":null,"obs":null},{"id":"1764968368909x344228574683621760","nome":"Andressa Furst","cupom":"ANDI","instagram":"andifurst","telefone":"19994150812","email":"contato@afurst.com.br","nivel":"Creator Blessy","status":"Ativa","cidade":"Campinas","estado":"SP","vendas":7,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-12-16","data_ultimo_pedido":null,"dias_no_time":133,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1759925651422x640745050335767700","nome":"Andressa Lorente","cupom":"DESSA","instagram":"dessalorente","telefone":"11958305585","email":"fisio.andressalorente@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":19,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-10-30","data_ultimo_pedido":null,"dias_no_time":180,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1756127892344x264641407817875460","nome":"Andressa Wittke Duarte","cupom":"ANDRESSAW","instagram":"nutriandressawittke","telefone":"16991414114","email":"nutriandressawittke@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Pradópolis","estado":"SP","vendas":56,"saldo":0,"last_comission":0,"comissao_pct":15.0,"data_entrada":"2025-08-27","data_ultimo_pedido":null,"dias_no_time":244,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776016625410x263072447687965570","nome":"Andressa Wittke Duarte","cupom":"NUTRIANDRESSA","instagram":"nutriandressawittke","telefone":"16991414114","email":"andressawittkeduarte@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":null,"estado":null,"vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":15.0,"data_entrada":"2026-04-12","data_ultimo_pedido":null,"dias_no_time":16,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Não recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1770770109432x774733247641081300","nome":"Anna Clara Andrade Neves","cupom":"ANNANDRADE","instagram":"annandraade","telefone":"11945420050","email":"anna_andradeneves@hotmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-11","data_ultimo_pedido":null,"dias_no_time":76,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1765366288298x988631958937247200","nome":"Anna Leticya","cupom":"ANNALET","instagram":"leticyamarq","telefone":"85982284213","email":"anna.leticyam@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Caucaia","estado":"CE","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769186291967x104487659092798340","nome":"Anna Paula Camilo","cupom":"ANNACAMILO","instagram":"annacamilom","telefone":"13981954947","email":"annapaulacamendes@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Peruíbe","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768781742254x912000884513942400","nome":"Anne Caroline Marques Barreto","cupom":"ANNEMARQUES","instagram":"annemarrques","telefone":"71981329487","email":"contatoannemarques@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Luís","estado":"MA","vendas":1,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-10","data_ultimo_pedido":null,"dias_no_time":77,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768650823925x463491219570350460","nome":"Any Karolliny Dias","cupom":"ANYKAROL","instagram":"anykarollinydias","telefone":"27998002775","email":"karoldias80@outlook.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Santa Maria De Jetibá","estado":"ES","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1765072555671x901734254835091500","nome":"Ariane Espírito Santo Rosa","cupom":"ARIANEROSA","instagram":"arianerosapersonal","telefone":"32999248925","email":"arianeesrosa@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Barbacena","estado":"MG","vendas":8,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-12-16","data_ultimo_pedido":null,"dias_no_time":133,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769627267547x418544390963079740","nome":"Ariádny Luiz","cupom":"ARIADNY","instagram":"ariadnyluiz","telefone":"48998532216","email":"ariluiz28@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio De Janeiro","estado":"RJ","vendas":3,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-01-30","data_ultimo_pedido":null,"dias_no_time":88,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1770713172519x855103902291989300","nome":"Barbarha Miranda","cupom":"BARBARHA","instagram":"barbarhamiranda","telefone":"11985585925","email":"barbarhamiranda@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Guarulhos","estado":"SP","vendas":2,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-10","data_ultimo_pedido":null,"dias_no_time":77,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1765278656265x922550242680562100","nome":"Beatriz Doria","cupom":"BEATRIZDORIA","instagram":"beatrizdoriam","telefone":"24981405424","email":"doriabeatriz@outlook.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio De Janeiro","estado":"RJ","vendas":1,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1771525750344x886915884926798600","nome":"Beatriz Macedo","cupom":"BIAMACEDO","instagram":"biamacedodailyy","telefone":"37998340712","email":"beatrizssmacedo@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Uberlândia","estado":"MG","vendas":9,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-19","data_ultimo_pedido":null,"dias_no_time":68,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1746586123720x726857865586278400","nome":"Beatriz Mariano da Silva","cupom":"BEMARIANO","instagram":"_bemariano","telefone":"11964434089","email":"beatriz.mariano25@live.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":20,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1764521739402x976914468062948200","nome":"Beatriz Matos Campos de Oliveira","cupom":"BIAMATOS","instagram":"beatrizmatosc","telefone":"11989117998","email":"beatrizmatos.co@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":1,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-12-18","data_ultimo_pedido":null,"dias_no_time":131,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Não recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776380147691x316131779789023940","nome":"Beatriz Melo Calixto","cupom":null,"instagram":"nutri_biamelo","telefone":"11975079922","email":"nutri.biameloo@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":0,"data_entrada":"2026-04-24","data_ultimo_pedido":null,"dias_no_time":4,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Não recebe","bca_enviado":null,"agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1766225473943x231202273342464130","nome":"Beatriz Moreira Coelho","cupom":"BIAMOREIRANUTRI","instagram":"biamoreiranutri","telefone":"21995445650","email":"nutribiamoreira@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio De Janeiro","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1746583779961x575658542257930240","nome":"Beatriz Sá","cupom":"BEADAILY","instagram":"aabeadaily","telefone":"47997753990","email":"beatriz.guerreirodesa@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Itajaí","estado":"SC","vendas":9,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768610374854x127086213959559440","nome":"Bianca Lima","cupom":"BIANCALIMA","instagram":"biancalimss","telefone":"11940722952","email":"biancalimanascimentto@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Barueri","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773845896577x735325059081293400","nome":"Bianca Moraes da Costa","cupom":"BIAALMEIDA","instagram":"biancaalmeidaglobal","telefone":"12996149352","email":"biancamoraescosta@icloud.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Itu","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-08","data_ultimo_pedido":null,"dias_no_time":20,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776104969755x168797970340064830","nome":"Bianca Rodrigues Neto","cupom":"BINETO","instagram":"bi.rneto","telefone":"11964383466","email":"biancarneto.med@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Barueri","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-14","data_ultimo_pedido":null,"dias_no_time":14,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1746578358517x327803296934264800","nome":"Bibiana Lobato","cupom":"BIBIANA","instagram":"bllobato","telefone":"54999958532","email":"assessoria.bllobato@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Florianópolis","estado":"SC","vendas":5,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1774479957561x876615649627013600","nome":"Brenda Abreu","cupom":"BRENDAABREU","instagram":"brendapabreu","telefone":"21965481593","email":"contatobrendapabreu@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio De Janeiro","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1757465064289x513642484173635600","nome":"Brenda Ferreira Almeida Gomes","cupom":"BRENDAFERREIRA","instagram":"brendaferreira.ag","telefone":"61984480112","email":"brenda.ferreiraa@hotmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Brasília","estado":"DF","vendas":9,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-09-13","data_ultimo_pedido":null,"dias_no_time":227,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Não recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1764428479363x516971952964050000","nome":"Brenda Ribeiro Borges","cupom":"BEFIT","instagram":"be.daily.fit","telefone":"47996506051","email":"be.contatoparcerias@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Balneário Camboriú","estado":"SC","vendas":2,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-12-02","data_ultimo_pedido":null,"dias_no_time":147,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Não recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773348478786x264897119607669900","nome":"Bruna Fontanella Dal Forno","cupom":"BRUFONTANELLA","instagram":"brunafontanella","telefone":"48996129934","email":"brunadfontanella@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Balneário Camboriú","estado":"SC","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-11","data_ultimo_pedido":null,"dias_no_time":17,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776043845065x191357023393199400","nome":"Bruna Gesser","cupom":"BRUNAGESSER","instagram":"psicologa.brunagesser","telefone":"47992302828","email":"brunagclemente@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Joinville","estado":"SC","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-13","data_ultimo_pedido":null,"dias_no_time":15,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776876534084x817182792421051100","nome":"Bruna Lima dos Santos","cupom":null,"instagram":"brunalimagz_","telefone":"11975030509","email":"brunalima.ad@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":0,"data_entrada":"2026-04-24","data_ultimo_pedido":null,"dias_no_time":4,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Não recebe","bca_enviado":null,"agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769296822877x538336526371020500","nome":"Bruna Medeiros","cupom":"BRUMEDEIROS","instagram":"brumedeirosh","telefone":"61999015466","email":"contatobrumedeiros@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Urubici","estado":"SC","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1774403033700x472687054588164100","nome":"Bruna Monteiro","cupom":"BRUNAMONTEIRO","instagram":"brunamonteiro._","telefone":"22998373642","email":"comercial@brunamonteiro.com.br","nivel":"Creator Blessy","status":"Ativa","cidade":"São José Dos Campos","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-03-26","data_ultimo_pedido":null,"dias_no_time":33,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1770908069699x281381757299415500","nome":"Bruna Oliveira Corrêa","cupom":"BRUCORREA","instagram":"brucorreea","telefone":"13997321115","email":"brunaocorreaa@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Santos","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-12","data_ultimo_pedido":null,"dias_no_time":75,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1742693852528x410630145644429300","nome":"Bruna Silene dos Santos","cupom":"BRUNARUIZ","instagram":"abrunaruiz","telefone":"11994983495","email":"contato.bruruiz@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":17,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1765110354334x154749957917302850","nome":"Bruna Werneck Dos Santos","cupom":"BRUNAWERNECK","instagram":"brunaweerneck","telefone":"(21) 99792-6763","email":"brunaweerneck@yahoo.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio De Janeiro","estado":"RJ","vendas":1,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-12-18","data_ultimo_pedido":null,"dias_no_time":131,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769185809584x347254087420628030","nome":"Bárbara Dudecki","cupom":"BDUDECKI","instagram":"bdudecki","telefone":"27996933522","email":"babidudecki@icloud.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Gramado","estado":"RS","vendas":2,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776084488732x964456615378212600","nome":"Bárbara Heuser","cupom":"BARBARAHEUSER","instagram":"barbaraheuser","telefone":"51997065245","email":"barbaraheuser5@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Bauru","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-13","data_ultimo_pedido":null,"dias_no_time":15,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1774870398096x797379461408548700","nome":"Bárbara Mikaelly da Fonseca","cupom":"BARBARAFONSECA","instagram":"barbarafonsecanutri","telefone":"81996831659","email":"barbaramikaelly@icloud.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Recife","estado":"PE","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1760046293876x166957442853452830","nome":"Camila Aderito Abrunhosa","cupom":"CAMIADERITO","instagram":"camiaderito","telefone":"11947180708","email":"camilaabrunhosa10@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":4,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-10-14","data_ultimo_pedido":null,"dias_no_time":196,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773068900368x814810744066057100","nome":"Camila Araujo Salgado","cupom":"CAMILAARAUJO","instagram":"camilaaraujou_","telefone":"28999121656","email":"camilaaraujou718@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Mimoso Do Sul","estado":"ES","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-11","data_ultimo_pedido":null,"dias_no_time":17,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768336565639x445233825239362200","nome":"Camila Segat Heusner","cupom":"CUIDADOSDACAMI","instagram":"cuidadosdacami","telefone":"55999667905","email":"cuidadosdacami@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Panambi","estado":"RS","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773763843483x374489876163329100","nome":"Camila Toigo Regner","cupom":"CAMILAREGNER","instagram":"camilaregnerr","telefone":"48984541297","email":"camilatoigo@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Florianópolis","estado":"SC","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-11","data_ultimo_pedido":null,"dias_no_time":17,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773912825798x746080803707520900","nome":"Camila dos Santos Ferreira","cupom":"CAMILAFERREIRA","instagram":"camilaferreirac","telefone":"71992396905","email":"contatocamilaferreiraa@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Salvador","estado":"BA","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1743094609449x837600760686968800","nome":"Camilla Castro Souza","cupom":"CAMILLA","instagram":"businesscamis","telefone":"21996769517","email":"businesscamisz@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Gonçalo","estado":"RJ","vendas":5,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1771421043002x739650521104443500","nome":"Camilla Macedo","cupom":"CAMILLAM","instagram":"camillamacedoc","telefone":"85982101111","email":"camillamacedobr@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Fortaleza","estado":"CE","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-19","data_ultimo_pedido":null,"dias_no_time":68,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1770993912108x699672415911705000","nome":"Camilly Monteiro","cupom":"CAMILLYM","instagram":"camillymm","telefone":"87988632290","email":"camillymontec26@yahoo.com.br","nivel":"Creator Blessy","status":"Ativa","cidade":"Petrolina","estado":"PE","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1760968270296x527162729467888900","nome":"Carina Cordeiro Silva","cupom":"CARINA","instagram":"caarinacs","telefone":"11967212419","email":"assessoria_carina@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":2,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-10-30","data_ultimo_pedido":null,"dias_no_time":180,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1775854509420x736508483676443800","nome":"Carla Jann","cupom":"CARLAJANN","instagram":"carla_jann","telefone":"27995190606","email":"carlajannschereder@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Colatina","estado":"ES","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776196320218x519603878815068540","nome":"Carla Simonelli","cupom":"CSNUTRI","instagram":"carlab.simonelli","telefone":"21999810808","email":"carlab.simonelli@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio De Janeiro","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-14","data_ultimo_pedido":null,"dias_no_time":14,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769998445950x630287990964096000","nome":"Carla de Marchi","cupom":"CARLADMARCHI","instagram":"carladmarchi","telefone":"43998653169","email":"contatocarlademarchi@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Arapongas","estado":"PR","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-10","data_ultimo_pedido":null,"dias_no_time":77,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769776619819x181229937305845700","nome":"Carolina Arjonas","cupom":"CAROLINANUTRI","instagram":"carolina.nutri","telefone":"11989917672","email":"carolinaarjonas@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Itatiba","estado":"SP","vendas":8,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-11","data_ultimo_pedido":null,"dias_no_time":76,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1764001082536x153094286485183420","nome":"Carolina Lapenda","cupom":"CAROLLAPENDA","instagram":"carollapenda","telefone":"81992830880","email":"carolzinha.lapenda@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Jaboatão Dos Guararapes","estado":"PE","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1775428851751x153291858782072640","nome":"Carolina Mardegan Pinto Campos Rocha","cupom":"CAROLFIT","instagram":"fitbycarolmardegan","telefone":"21998362730","email":"nutricarolmardegan@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio De Janeiro","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Sim, eu sou.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1764969745652x792569820047785700","nome":"Carolina de Menezes Leites","cupom":"CAROLPILTZ","instagram":"carolinapiltz","telefone":"54999344384","email":"carolmenezesleites@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Passo Fundo","estado":"RS","vendas":1,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-12-16","data_ultimo_pedido":null,"dias_no_time":133,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Sim, eu sou.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1761057881788x420589403385909250","nome":"Caroline Lobo","cupom":"CAROLLOBO","instagram":"carolinelobods","telefone":"11996722309","email":"carolinelobo.02@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Mogi Das Cruzes","estado":"SP","vendas":4,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-10-30","data_ultimo_pedido":null,"dias_no_time":180,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776943071654x629325772807067100","nome":"Caroline Ricart","cupom":null,"instagram":"carolricart","telefone":"21995352504","email":"carolricartpessoal@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Niterói","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":0,"data_entrada":"2026-04-27","data_ultimo_pedido":null,"dias_no_time":1,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Não recebe","bca_enviado":null,"agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773949449534x117079305262159920","nome":"Caroline da Silva Monteiro","cupom":"CAHMONTEYRO","instagram":"cahmonteyro","telefone":"51999332515","email":"contato.carolmonteiro02@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Estrela","estado":"RS","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1770322157839x895799855002352500","nome":"Carollina Zappe Buzatti","cupom":"CAROLLINA","instagram":"carollinazappe","telefone":"55996701101","email":"blogcarollinazappe@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Torres","estado":"RS","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-10","data_ultimo_pedido":null,"dias_no_time":77,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768314529589x944591545041904000","nome":"Cecilia Sousa Mendonca","cupom":"CECILIASOUSA","instagram":"ceciliasousam","telefone":"64984411952","email":"contatoceciliasousam@icloud.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Goiatuba","estado":"GO","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768756864611x651430779535769900","nome":"Cecilia Taets Ribeiro Salla","cupom":"CECILIATAETS","instagram":"ceciliataetsnutri","telefone":"11980665261","email":"cecilia.taets@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-10","data_ultimo_pedido":null,"dias_no_time":77,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1774954833447x889535304130328800","nome":"Clara Barrigosse","cupom":"CLARABNUTRI","instagram":"clarabnutri","telefone":"22997409046","email":"clarabnutri@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Laje Do Muriaé","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Tiktok","categoria_mes":null,"followup":null,"obs":null},{"id":"1743096054083x742268240845340700","nome":"Clara Marcílio Caram","cupom":"CLARACARAM","instagram":"claracaram","telefone":"31994728454","email":"claracaramcontato@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Belo Horizonte","estado":"MG","vendas":13,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1760561373961x543779486816167600","nome":"Claudia Martinelli","cupom":"CLAUDIA","instagram":"claudiarmartinelli","telefone":"66996982618","email":"contatoclaudiamartinelli@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Sinop","estado":"MT","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-16","data_ultimo_pedido":null,"dias_no_time":163,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1762347820172x637291345398078200","nome":"Constance Barbosa","cupom":"CONSTANCE","instagram":"constancebarbosa","telefone":"85991899130","email":"contato.constancebs@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Fortaleza","estado":"CE","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-16","data_ultimo_pedido":null,"dias_no_time":163,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1753210350857x960196094426087400","nome":"Daniela Ary Mota Sanford","cupom":"FITBYDANI","instagram":"fitbydani._","telefone":"85981681800","email":"danisanford19@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Fortaleza","estado":"CE","vendas":8,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-07-22","data_ultimo_pedido":null,"dias_no_time":280,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1766226502524x333922614813360700","nome":"Daniela Machado Castahma","cupom":"DANIELACASTAGNA","instagram":"danielacastagna_","telefone":"51980257440","email":"danielamcastagna@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio De Janeiro","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773075169616x556388743657265660","nome":"Danieli Segatto","cupom":"DANISEGATTO","instagram":"danisegattodaily","telefone":"67996737996","email":"contato.danisegatto@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Nova Alvorada Do Sul","estado":"MS","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1770927173304x447805377300159360","nome":"Danielle Domingues","cupom":"DANIDOMINGS","instagram":"danidomings","telefone":"14997009305","email":"contatodanidomings@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Bauru","estado":"SP","vendas":1,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1765932350870x684945777403275400","nome":"Dayane Cardoso","cupom":"DAYTELEVA","instagram":"dayteleva","telefone":"11975279452","email":"dayteleva@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":4,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-12-16","data_ultimo_pedido":null,"dias_no_time":133,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776093517657x967113907348136600","nome":"Dulcelina Mendes Santos Silva","cupom":"DULCELINANUTRI","instagram":"dulcelinanutri","telefone":"34999731363","email":"dulcelinams@yahoo.com.br","nivel":"Creator Blessy","status":"Ativa","cidade":"Capinópolis","estado":"MG","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-14","data_ultimo_pedido":null,"dias_no_time":14,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1750210466514x910696507429617700","nome":"Dyovanna Rezende Monteiro","cupom":"NUTRIDYREZENDE","instagram":"nutri.dyrezende","telefone":"11995556252","email":"dyovannarez@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Jundiaí","estado":"SP","vendas":7,"saldo":0,"last_comission":0,"comissao_pct":15.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Não recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1749005368514x983772563736625200","nome":"Edilania Harllia Dos Santos Oliveira","cupom":"EDILANIA","instagram":"edilaniasantose","telefone":"82991886413","email":"blogedilaniasantos@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Maceió","estado":"AL","vendas":34,"saldo":0,"last_comission":0,"comissao_pct":15.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Não recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1771529557276x989185476033554800","nome":"Edione Cosme","cupom":"EDIONE","instagram":"_edionecosme","telefone":"83986197427","email":"edionecosme2021@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Ponta Porã","estado":"MS","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-19","data_ultimo_pedido":null,"dias_no_time":68,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768753579946x479683376307853200","nome":"Eduarda Grime","cupom":"DUDAGRIME","instagram":"treinadoradudagrime","telefone":"47984220897","email":"dudaagrime@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Joinville","estado":"SC","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-10","data_ultimo_pedido":null,"dias_no_time":77,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1747250782526x308821766524895200","nome":"Eduarda Mota de Almeida","cupom":"DUDAMOTA","instagram":"dudamotafit","telefone":"75992365721","email":"almdsduda@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio de Janeiro","estado":"RJ","vendas":9,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-07-29","data_ultimo_pedido":null,"dias_no_time":274,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":null,"agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1737758045879x961936799487230000","nome":"Emanuelle Silva Moreira de Oliveira","cupom":"MANU5","instagram":"manuoliveiraofcc","telefone":"11961564370","email":"comercialmanuoliveira@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":9,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-01-24","data_ultimo_pedido":null,"dias_no_time":460,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1772115819842x714881589906639000","nome":"Emile Agostini Bragança","cupom":"EMILE","instagram":"emileagostini","telefone":"21986211865","email":"contatoemiagostini@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Duque De Caxias","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773424714714x758282123749985500","nome":"Emilly Lopes dos Santos","cupom":"EMILLYLOPES","instagram":"emillylopes.s","telefone":"12991668383","email":"emillylopes.lisbon1@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São José Dos Campos","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-03-31","data_ultimo_pedido":null,"dias_no_time":28,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773547325084x722368425711033200","nome":"Emilly Santana Barud de Castro","cupom":"EMIBARUD","instagram":"emillybarud","telefone":"24992111123","email":"contatoemillybarud@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Volta Redonda","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-11","data_ultimo_pedido":null,"dias_no_time":17,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769525085075x113989331221369780","nome":"Emily Costa Martins Pereira","cupom":"EMILYCOSTA","instagram":"emilycostamp","telefone":"98984456690","email":"contatemilycosta@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Fortaleza","estado":"CE","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1772399623844x240202335406106900","nome":"Erica Viera Da Motta","cupom":"ERICA","instagram":"ericavieraa","telefone":"55999114655","email":"ericaviera6@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Indaiatuba","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1746649601577x270796008060878850","nome":"Evelyn Mylena Bezerra e Silva","cupom":"EVYS","instagram":"evys.fit","telefone":"81991767897","email":"evelyn.mylena@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Jaboatão dos Guararapes","estado":"PE","vendas":11,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Pendente","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1771451327700x346049338488319900","nome":"Evelyn Teodoro Maciel Miranda","cupom":"EVETEODORO","instagram":"evelyn_teodoro","telefone":"11984334414","email":"evelynteodoro99@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Bernardo Do Campo","estado":"SP","vendas":1,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-19","data_ultimo_pedido":null,"dias_no_time":68,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773857879118x476706946009199900","nome":"Evelyn da S Rodrigues","cupom":"EVE","instagram":"evelynrodriguesi","telefone":"22992488845","email":"contatoeverodrigues@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Macaé","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773534647158x776857582715806500","nome":"Fernanda Cassaro Martin","cupom":"CASSARO","instagram":"fernanda_cassaro_","telefone":"27997423398","email":"fernandamartincassaro@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Colatina","estado":"ES","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-11","data_ultimo_pedido":null,"dias_no_time":17,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776187060672x657902320602582500","nome":"Fernanda Lisboa","cupom":"PSIFERNANDA","instagram":"psicologafernandalisboa","telefone":"21980024783","email":"flisboa2014@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio De Janeiro","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-14","data_ultimo_pedido":null,"dias_no_time":14,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1758578696288x981778282241589200","nome":"Fernanda Mota","cupom":"FERNANDAMOTA","instagram":"fernandaa.mota","telefone":"34991025213","email":"contatofernandamota1@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Patos de Minas","estado":"MG","vendas":5,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-10-31","data_ultimo_pedido":null,"dias_no_time":179,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1771383331198x549257428648188160","nome":"Fernanda Márcia Amazildes Guedes","cupom":"FEFEGUEDES","instagram":"fefehguedess","telefone":"31989224893","email":"guedesfernandamarcia@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Sabará","estado":"MG","vendas":5,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-19","data_ultimo_pedido":null,"dias_no_time":68,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1767960189297x168647074428574400","nome":"Fernanda Pejon","cupom":"FEPEJON","instagram":"fernandapejon","telefone":"11940593767","email":"fernandapejon@outlook.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1760114297076x205640929398225300","nome":"Fernanda Rebeca Ielpo","cupom":"FE","instagram":"fernanda.ielpo","telefone":"83982257488","email":"contatofernandaielpo@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio de Janeiro","estado":"RJ","vendas":4,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-10-10","data_ultimo_pedido":null,"dias_no_time":200,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Pendente","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1760229329456x693787349891005400","nome":"Fernanda Santa Rita de Carvalho","cupom":"EUFERNANDA","instagram":"eufernanda.src","telefone":"21985301306","email":"eufernanda.trab@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio De Janeiro","estado":"RJ","vendas":4,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-10-30","data_ultimo_pedido":null,"dias_no_time":180,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1754054173384x383001830298222600","nome":"Flavielly Gomes Ferraz","cupom":"FLAVIELLY","instagram":"euflaviellyferraz","telefone":"41998849998","email":"flaviellygomes18@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Campina Grande do Sul","estado":"PR","vendas":2,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-09-19","data_ultimo_pedido":null,"dias_no_time":221,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Não recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1762898968173x919321427039159000","nome":"Franciele Borges","cupom":"FRANCIELEBORGES","instagram":"fran.atriz","telefone":"35998983630","email":"franborges.digital@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Campanha","estado":"MG","vendas":1,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-24","data_ultimo_pedido":null,"dias_no_time":155,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1774047721735x616556184289110000","nome":"Gabriela Baja Wzorek","cupom":"GABIBAJANUTRI","instagram":"gabibajanutri","telefone":"41999047543","email":"bajagabriela@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Araucária","estado":"PR","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1739368714952x819329496850366500","nome":"Gabriela Brito","cupom":"GABIBRITO","instagram":"gabidebritos","telefone":"3191433442","email":"contato@gabidebrito.com.br","nivel":"Creator Blessy","status":"Em análise","cidade":"Serra","estado":"ES","vendas":0,"saldo":0.0,"last_comission":20.0,"comissao_pct":10.0,"data_entrada":"2025-02-12","data_ultimo_pedido":null,"dias_no_time":441,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1771008888830x760229096992246300","nome":"Gabriela Caprini","cupom":"CAPRI","instagram":"keepingupwithcapri","telefone":"67992999229","email":"gabicapri@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Campo Grande","estado":"MS","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1775494143295x324951275921243650","nome":"Gabriela Castelo Branco","cupom":"GABIBRANCO","instagram":"gabibranco._","telefone":"61985643607","email":"gabrielabranco.contato@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Brasília","estado":"DF","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-06","data_ultimo_pedido":null,"dias_no_time":22,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1772763156020x803323357031325400","nome":"Gabriela Darossi","cupom":"GABIDAROSSI","instagram":"gabidarossi","telefone":"47996954227","email":"gabrieladarossi@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Blumenau","estado":"SC","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-11","data_ultimo_pedido":null,"dias_no_time":17,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1771280852748x801803069159934300","nome":"Gabriela Donato","cupom":"GABIDONATO","instagram":"donatogabi","telefone":"11954057784","email":"contato@gabidonato.com.br","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1772476189736x992791068464922000","nome":"Gabriela Fernandes","cupom":"GABZFF","instagram":"gabzff","telefone":"21975605175","email":"gabzff99@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio De Janeiro","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1742654742142x594154105744916500","nome":"Gabriela Gomes","cupom":"GABIGOMES","instagram":"gabixxgomes","telefone":"35998693967","email":"gabrielam.gomes05@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Itajubá","estado":"MG","vendas":28,"saldo":0,"last_comission":0,"comissao_pct":15.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1774963499224x275267839471817540","nome":"Gabriela Kratz","cupom":"GABRIELAKRATZ","instagram":"gabrielakratz","telefone":"47996172550","email":"contato.gabrielakratz@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"BALNEÁRIO CAMBORIÚ","estado":"SC","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-03-31","data_ultimo_pedido":null,"dias_no_time":28,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773389820739x371983217084432600","nome":"Gabriela Mariana Antonio","cupom":"GABIMARIANA","instagram":"gabimarianatr","telefone":"41984994518","email":"gabrielaloirosa@icloud.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Araucária","estado":"PR","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-11","data_ultimo_pedido":null,"dias_no_time":17,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769203293493x155529841914621820","nome":"Gabriela Mazutti","cupom":"GABRIELAMAZUTTI","instagram":"gabrielamazutti","telefone":"67996368144","email":"gabimazuttiribeiro@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Dourados","estado":"MS","vendas":1,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1761283635508x757208930018905100","nome":"Gabriela Medina","cupom":"AMEDINA","instagram":"amedinacabiluda","telefone":"12988242019","email":"gabriela_medina96@outlook.com","nivel":"Creator Blessy","status":"Em análise","cidade":"São José Dos Campos","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-10-30","data_ultimo_pedido":null,"dias_no_time":180,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1755212298678x990938173774495700","nome":"Gabriela Michalouski Malanski","cupom":"GABIMFIT","instagram":"gabi.m.fit","telefone":"42999142928","email":"gabrielamalanski645@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Prudentópolis","estado":"PR","vendas":7,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-08-14","data_ultimo_pedido":null,"dias_no_time":257,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1762279646435x926988283585128000","nome":"Gabriela Milani","cupom":"GABRIELAMILANIS","instagram":"gabrielamilanis","telefone":"11958021389","email":"gabrielamilanis141219@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":1,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-15","data_ultimo_pedido":null,"dias_no_time":164,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1751375548817x219559382382454880","nome":"Gabriela Oliveira","cupom":"GABIOLIVEIRA","instagram":"gabsoliveira26","telefone":"11982797355","email":"Gabriela.oliveira26@live.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":17,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1772202018900x458533128852108160","nome":"Gabriela Ribeiro Camargos","cupom":"GABIRIBEIRO","instagram":"gbrielaribeirofitdaily","telefone":"34999823383","email":"gabrielaribeiro.arquiteta@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Uberaba","estado":"MG","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-27","data_ultimo_pedido":null,"dias_no_time":60,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769098455255x238741524945048640","nome":"Gabriela Rodrigues","cupom":"GABRIELARGS","instagram":"gabrielargs","telefone":"83999293504","email":"gabrielargs@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"João Pessoa","estado":"PB","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-10","data_ultimo_pedido":null,"dias_no_time":77,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1771624684940x521827260335234940","nome":"Gabriela Rosa de Jesus Amorim","cupom":"GABSAMOORIM","instagram":"gabsamoorim","telefone":"74991442044","email":"contato@gabsamorim.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Salvador","estado":"BA","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773371848571x234202886947353570","nome":"Gabriela Soares Borges","cupom":"GABIBMED","instagram":"gabibmed","telefone":"62993319956","email":"acessoriagabibmed@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Anápolis","estado":"GO","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-11","data_ultimo_pedido":null,"dias_no_time":17,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1756569534636x378879276993740800","nome":"Gabriela Venancio Esteves de Azevedo","cupom":"GABIESTEVES","instagram":"gabiestevesdaily","telefone":"62992332838","email":"venanciogabriela12@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Brasília","estado":"DF","vendas":19,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-09-14","data_ultimo_pedido":null,"dias_no_time":226,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1767297388396x239264278576651000","nome":"Gabriela Zenni Estevao Porto","cupom":"GABIPORTO","instagram":"gabrielazporto","telefone":"51995816779","email":"contato.gabrielazporto@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Porto Alegre","estado":"RS","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773943808545x419547857683266050","nome":"Gabriela Zwierzinski","cupom":"GABRIELAGZW","instagram":"gabrielagzw","telefone":"53981279717","email":"gabrielagzw@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio De Janeiro","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-03-31","data_ultimo_pedido":null,"dias_no_time":28,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1766699417929x563712937204268160","nome":"Gabriele Malmagro","cupom":"GABIMALMAGRO","instagram":"gabimalmagro_","telefone":"11976527420","email":"gabrielemalmagro@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":1,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Pendente","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768928835901x705348404405755400","nome":"Gabriele Molina Garcia","cupom":"GABIMOLINA","instagram":"gabiii.molina","telefone":"11976779429","email":"gabrielemgarcia@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-10","data_ultimo_pedido":null,"dias_no_time":77,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1767633885453x673198611593180300","nome":"Gabriella Alves Henriques","cupom":"HEYGABI","instagram":"heygabi","telefone":"34999437474","email":"contatoheygabi@outlook.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Ituiutaba","estado":"MG","vendas":7,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1765392034366x337724849535820900","nome":"Gabriella Tavares de Freitas Benevides","cupom":"GABRIELLATAVARES","instagram":"gabriellatavaresf","telefone":"84988436142","email":"gabriellatfreitas@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Fortaleza","estado":"CE","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Sim, eu sou.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773586454043x649743055867544800","nome":"Gabrielle Paiva Dias","cupom":"GABRIELLEPAIVA","instagram":"paivagabriellee","telefone":"21990726171","email":"contatogabriellepaiva@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio De Janeiro","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-11","data_ultimo_pedido":null,"dias_no_time":17,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1762374467666x631604349964876000","nome":"Georgia Bortoluzzi","cupom":"MINDNESSCLUB","instagram":"mindnessclub","telefone":"11989866494","email":"georgia.bortoluzzi@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-15","data_ultimo_pedido":null,"dias_no_time":164,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1751289475361x174153435386941380","nome":"Geovanna Mattos","cupom":"GEO","instagram":"me_geooh","telefone":"21980173296","email":"Geovannacontatojob@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Gonçalo","estado":"RJ","vendas":1,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1760382362445x421720511046494340","nome":"Giovana Aguilera De Macedo Soares","cupom":"AGUILERA","instagram":"giaguileraa","telefone":"22992275624","email":"gioaguilera.contato@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio de Janeiro","estado":"RJ","vendas":18,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-10-13","data_ultimo_pedido":null,"dias_no_time":197,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":null,"agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1738022133495x981099417052119000","nome":"Giovana Cardoso Deprê","cupom":"GIDEPRE","instagram":"gidepre","telefone":"12996614445","email":"gidepre.mkt@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São José dos Campos","estado":"SP","vendas":30,"saldo":0,"last_comission":20.0,"comissao_pct":20.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1775512795358x854953754984452400","nome":"Giovana Foliveira","cupom":"FOLIVEIRA","instagram":"itsfoliveira","telefone":"19997996515","email":"contatoghfernandes@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Campinas","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1775415232394x148634140041751680","nome":"Giovana Manilli Toccoli","cupom":"GITOCCOLI","instagram":"gitoccoli","telefone":"11968627150","email":"giovana.toccoli@unifesp.br","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1757344402747x439962843822424060","nome":"Giovana Ávila Canuto","cupom":"GIOAVILA","instagram":"giovanaavilac","telefone":"31971702411","email":"gioavilacanuto@outlook.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Conselheiro Lafaiete","estado":"MG","vendas":21,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-09-19","data_ultimo_pedido":null,"dias_no_time":221,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1771509296377x830688809844747100","nome":"Giovanna Da Silva Melo","cupom":"GIOVANNAMELO","instagram":"nutrigiovannamelo","telefone":"11934410202","email":"smgiovannamelo@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Santo André","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-19","data_ultimo_pedido":null,"dias_no_time":68,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1747516441767x913672584770879500","nome":"Giovanna Lanigra Husni","cupom":"GIHUSNI","instagram":"giovannahusni","telefone":"13997144610","email":"gihusni@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Santos","estado":"SP","vendas":31,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Pendente","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1731552655555x282590442026172400","nome":"Giovanna Lara de Freitas","cupom":"GIHLARA","instagram":"Gihlara_","telefone":"13996163822","email":"giovanna.laraf@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Santos","estado":"SP","vendas":47,"saldo":0,"last_comission":0,"comissao_pct":15.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1767040907063x804186222600887200","nome":"Giovanna Mariotti","cupom":"GI","instagram":"giovannacomdoisn","telefone":"11965973333","email":"contatogiovannacomdoisn@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":1,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1767651809806x616357715419878500","nome":"Giovanna Teodoro Marques","cupom":"GIGITHEO","instagram":"gigitheo","telefone":"11992939533","email":"giovanna-teodoro2013@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Barueri","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773506786576x231803431994853860","nome":"Giovanna de Paula Muller","cupom":"GIMULLER","instagram":"mullergiih","telefone":"11988189555","email":"contato.giovannamuller@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Bernardo Do Campo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1764773492621x429720584894623900","nome":"Gisele Ferreira Morgem","cupom":"GIMORGEM","instagram":"gisellemorgem","telefone":"47996891035","email":"contatogisellemorgem@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Garuva","estado":"SC","vendas":1,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1755047033348x979504372934246400","nome":"Giulia Conte","cupom":"GIUCONTE","instagram":"giuliafconte.nutri","telefone":"11979954274","email":"giu_conte@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Santana de Parnaíba","estado":"SP","vendas":54,"saldo":0,"last_comission":0,"comissao_pct":15.0,"data_entrada":"2025-08-13","data_ultimo_pedido":null,"dias_no_time":258,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1775497912668x845300264775350500","nome":"Giulia Menezes Cavoto","cupom":"GIULIACAVOTO","instagram":"giulia.cavoto","telefone":"19981246995","email":"giuliacavotto@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Paulínia","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1774371521511x541410951059648800","nome":"Giulia Ricarte","cupom":"GIURICARTE","instagram":"giu.ricarte","telefone":"11940533973","email":"giuliaricart@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-03-31","data_ultimo_pedido":null,"dias_no_time":28,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1772935793144x982125973561262200","nome":"Giulia Thalia Nunes Gregorio","cupom":"GIULIATHALIA","instagram":"giuliathalia","telefone":"79991064000","email":"giuliathalian@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Aracaju","estado":"SE","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-11","data_ultimo_pedido":null,"dias_no_time":17,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768754892161x534220480962552800","nome":"Graziela Bersan","cupom":"GRAZIBERSAN","instagram":"grazibersan","telefone":"19996055721","email":"grazielacbersan@outlook.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Valinhos","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1774202307715x465292346317545340","nome":"Graziela Noyma","cupom":"GRAZIELANOYMA","instagram":"grazielanoyma.nutri","telefone":"21992057403","email":"grazielanoyma.nutri@outlook.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Duque De Caxias","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1748968468960x112371043497148420","nome":"Greda Macieirinha","cupom":"GREDAMA","instagram":"greda_ma","telefone":"19992663470","email":"greda1103@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":12,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1761226835928x267689856662968860","nome":"Gyovanna Machado do Amaral","cupom":"GYOVANNAMA","instagram":"gyovannama","telefone":"5193721277","email":"contatogymachado@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Fortaleza","estado":"CE","vendas":64,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-12-01","data_ultimo_pedido":null,"dias_no_time":148,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1760736448964x802277045604481700","nome":"Gyovanna Vieira","cupom":"GYOVANNA","instagram":"gyovannadaily","telefone":"21967291103","email":"contatogyovannasvieira@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio De Janeiro","estado":"RJ","vendas":3,"saldo":0,"last_comission":10.0,"comissao_pct":10.0,"data_entrada":"2025-10-30","data_ultimo_pedido":null,"dias_no_time":180,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1762896230442x827929982681011600","nome":"Helena Chempceke de Oliveira","cupom":"NUTRIHELENA","instagram":"nutri.helenachempceke","telefone":"42999375589","email":"hchempceke@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Ponta Grossa","estado":"PR","vendas":7,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-16","data_ultimo_pedido":null,"dias_no_time":163,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776167982954x985451159881081700","nome":"Helena Misse","cupom":"HELENAMISSE","instagram":"helenamisse","telefone":"28999332691","email":"helenamisse.med@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Cachoeiro De Itapemirim","estado":"ES","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-14","data_ultimo_pedido":null,"dias_no_time":14,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773421673690x238284925882494180","nome":"Heloisa Freitas","cupom":"HELOISAFREITAS","instagram":"heloisafreitas_c","telefone":"48996139504","email":"heloisafreitas@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Criciúma","estado":"SC","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-11","data_ultimo_pedido":null,"dias_no_time":17,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1764168860286x172385453800786080","nome":"Heloisa Vasconcelos","cupom":"HELOV","instagram":"helovascon","telefone":"19978274214","email":"contatohelovascon@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Paulínia","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1762995370652x853361573712808800","nome":"Isabel Moreira de Paulo","cupom":"ISABELM","instagram":"isabellmmoreira","telefone":"32998476763","email":"isammoreirap@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Muriaé","estado":"MG","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-15","data_ultimo_pedido":null,"dias_no_time":164,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1760746320325x783685807506723500","nome":"Isabel Moura Vigas","cupom":"BVIGAS","instagram":"bvigasfit","telefone":"92988080084","email":"belmvigas@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Balneário Camboriú","estado":"SC","vendas":1,"saldo":0,"last_comission":10.0,"comissao_pct":10.0,"data_entrada":"2025-10-30","data_ultimo_pedido":null,"dias_no_time":180,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1759436460509x159027166695158820","nome":"Isabela Gaudard Pinheiro Cavalcanti","cupom":"BELAGAUDARD","instagram":"belagaudard","telefone":"21980654424","email":"belagaudardjobs@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio de Janeiro","estado":"RJ","vendas":1,"saldo":0,"last_comission":10.0,"comissao_pct":10.0,"data_entrada":"2025-10-30","data_ultimo_pedido":null,"dias_no_time":180,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1764070957886x215860283067274020","nome":"Isabela Marquetto Zappe","cupom":"ISABELAZAPPE","instagram":"isabelazappe","telefone":"51995143200","email":"belazappe@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Lajeado","estado":"RS","vendas":4,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1762348682957x310706533978795100","nome":"Isabela Matos","cupom":"ISABELAMATOS","instagram":"isabelamatos___","telefone":"43998378701","email":"isabelamatosugc@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Curitiba","estado":"PR","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-16","data_ultimo_pedido":null,"dias_no_time":163,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1761698384436x496589198765755140","nome":"Isabela Schott Ceolin","cupom":"ISABELASCHOTT","instagram":"isabelaschott","telefone":"61999672370","email":"Isabelaschott@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Brasília","estado":"DF","vendas":2,"saldo":0,"last_comission":10.0,"comissao_pct":10.0,"data_entrada":"2025-10-30","data_ultimo_pedido":null,"dias_no_time":180,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1764875954066x432518879999016500","nome":"Isabele Soron Malta","cupom":"BELEMALTA","instagram":"isabeleemalta","telefone":"21998688578","email":"isabele.malta@icloud.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio De Janeiro","estado":"RJ","vendas":3,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768357534432x150571288687598720","nome":"Isabella Della Rocca","cupom":"ISADELLAROCCA","instagram":"isadellarocca","telefone":"47997792861","email":"iisabelladellarocca@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Bombinhas","estado":"SC","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-01-20","data_ultimo_pedido":null,"dias_no_time":98,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776358356307x956581147300231700","nome":"Isabella Ferreira Assis","cupom":"ASSIS","instagram":"isabellaassiis","telefone":"11950350708","email":"isabellaassiis@icloud.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Mauá","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-16","data_ultimo_pedido":null,"dias_no_time":12,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769906431630x695824612798435100","nome":"Isabella Gumiero de Araujo","cupom":"BELLA","instagram":"umabellavida.flex","telefone":"13981516234","email":"umabellavidaflex@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Santos","estado":"SP","vendas":1,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-11","data_ultimo_pedido":null,"dias_no_time":76,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776706186118x306629960349475100","nome":"Isabella Torloni","cupom":null,"instagram":"bellatorlonidaily","telefone":"11975675858","email":"isabellaf.torloni@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":0,"data_entrada":"2026-04-24","data_ultimo_pedido":null,"dias_no_time":4,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Não recebe","bca_enviado":null,"agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1770209623578x655325750252218100","nome":"Isabelle Santos da Silva","cupom":"ISAMACEDO","instagram":"isamacedobr","telefone":"11982956801","email":"isamacedobr@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-11","data_ultimo_pedido":null,"dias_no_time":76,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773616982342x242687932736558530","nome":"Isabelly Cristina da Silva","cupom":"ISABELLY","instagram":"_isabellycristinaa","telefone":"48984477292","email":"isabelly1004.peres@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Antônio Carlos","estado":"SC","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-11","data_ultimo_pedido":null,"dias_no_time":17,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1772133347520x358013678856743600","nome":"Isabelly Rezende da Rosa","cupom":"ISAREZENDE","instagram":"isirezende","telefone":"21981242915","email":"isirezende@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Niterói","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-27","data_ultimo_pedido":null,"dias_no_time":60,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1757726978885x748154713836617700","nome":"Isadora Alves de Oliveira","cupom":"ISAOLIVEIRA","instagram":"isaoliveiral","telefone":"19998604939","email":"contatoisaaoliveira@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Paulínia","estado":"SP","vendas":28,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-09-14","data_ultimo_pedido":null,"dias_no_time":226,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773066888887x544180956775495200","nome":"Isadora Barbosa","cupom":"BARBOSA","instagram":"isadoraa_barbosa","telefone":"62981887775","email":"isabarbosa2727@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773097164079x920400111748286700","nome":"Isadora Varela Pinto","cupom":"ISADORAVARELA","instagram":"isadoravareladaily","telefone":"84999469877","email":"isadoravarelamkt@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Mossoró","estado":"RN","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-11","data_ultimo_pedido":null,"dias_no_time":17,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1770383902384x503214927641744100","nome":"Isadora Vicente","cupom":"ISAVICENTE","instagram":"isadoravicente","telefone":"51992720081","email":"isadora.fvicente@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Porto Alegre","estado":"RS","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-10","data_ultimo_pedido":null,"dias_no_time":77,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776358724560x396148750835980400","nome":"Isadora Wildmann","cupom":"ISADORA","instagram":"isadorawildmann","telefone":"11912120840","email":"isadorawildmann@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Caetano Do Sul","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-16","data_ultimo_pedido":null,"dias_no_time":12,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1772201720047x192387732800879170","nome":"Isis Sami De Paula Alves","cupom":"ABARIDAISIS","instagram":"abaridaisis","telefone":"11945448970","email":"isissamip42@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":8,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-27","data_ultimo_pedido":null,"dias_no_time":60,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1761056813606x714498109051779900","nome":"Isis Xavier Franco","cupom":"ISIS","instagram":"isis.fco","telefone":"62986500363","email":"contatoisisfranco@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Aparecida De Goiânia","estado":"GO","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-16","data_ultimo_pedido":null,"dias_no_time":163,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Tiktok","categoria_mes":null,"followup":null,"obs":null},{"id":"1774524415485x617071499890363600","nome":"Itauana Vitória Queiroz de Lima","cupom":"ITAUANAVIT","instagram":"itauanavit","telefone":"84991146795","email":"contatoitauanavitoria@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Miguel","estado":"RN","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1761506113937x766052043011847200","nome":"Jade Leao","cupom":"JADELEAO","instagram":"jadeleaonutri","telefone":"87992034889","email":"jadegleao@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Petrolina","estado":"PE","vendas":1,"saldo":0,"last_comission":10.0,"comissao_pct":10.0,"data_entrada":"2025-10-30","data_ultimo_pedido":null,"dias_no_time":180,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773405429203x619493609039676200","nome":"Janaine Pandolfo","cupom":"JANAPANDOLFO","instagram":"janapandolfo","telefone":"67999964800","email":"janainepandolfo123@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Itaporã","estado":"MS","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-11","data_ultimo_pedido":null,"dias_no_time":17,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768266502640x592246536368953500","nome":"Janaína Dos Santos Rodrigues","cupom":"JSANTOS5","instagram":"jana_rsantos","telefone":"27999720454","email":"janars8356@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Vila Velha","estado":"ES","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-01-12","data_ultimo_pedido":null,"dias_no_time":106,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1748987015939x275681763140042750","nome":"Jeciara da Silva Rodrigues","cupom":"JECIRODRIGUES","instagram":"jecirodriguess","telefone":"77981102730","email":"jecirodrigues.ugc@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Guanambi","estado":"BA","vendas":11,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1755275913854x216205253376213000","nome":"Jessica Ellen Araújo da Silva","cupom":"JESSIELLEN","instagram":"jessi_ellen","telefone":"81986533065","email":"jessica.ellenas@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio Branco","estado":"AC","vendas":144,"saldo":0,"last_comission":0,"comissao_pct":20.0,"data_entrada":"2025-08-15","data_ultimo_pedido":null,"dias_no_time":256,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1754657165101x992563983867707400","nome":"Jessica Emanuele Les","cupom":"JESSIELES","instagram":"jessie_les","telefone":"42998369542","email":"contatojessie.les@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Garopaba","estado":"SC","vendas":4,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-08-13","data_ultimo_pedido":null,"dias_no_time":258,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769962751034x512162033785721360","nome":"Joana Brizola","cupom":"JOANABRIZOLA","instagram":"joanabrizola","telefone":"24998287438","email":"joana97brizola@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Volta Redonda","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-11","data_ultimo_pedido":null,"dias_no_time":76,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1761873039057x302123779221028100","nome":"Joana Maria Fernandes de Paula","cupom":"NUTRIJOANAFERNANDES","instagram":"nutrijoanafernandes","telefone":"32999258725","email":"joanaferdepaula@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Juiz De Fora","estado":"MG","vendas":0,"saldo":0.0,"last_comission":10.0,"comissao_pct":10.0,"data_entrada":"2025-10-30","data_ultimo_pedido":null,"dias_no_time":180,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1761418778838x841146009269695000","nome":"Jocimara Oliveira","cupom":"JOCY","instagram":"jocyoliveiraa","telefone":"62998741667","email":"jocimaraoliveiraa00@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Goiânia","estado":"GO","vendas":3,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-10-30","data_ultimo_pedido":null,"dias_no_time":180,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1757423635478x849451285667643400","nome":"Joyce Mirela Araújo Costa","cupom":"JOYCEMIRELA","instagram":"joycemirela","telefone":"11954141505","email":"joycecoostt@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Diadema","estado":"SP","vendas":8,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-09-18","data_ultimo_pedido":null,"dias_no_time":222,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1758212372173x145282098714378240","nome":"Julia Cristina Nader","cupom":"JUNADER","instagram":"julnader","telefone":"6299078374","email":"contato@linneemkt.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-09-18","data_ultimo_pedido":null,"dias_no_time":222,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Sim, eu sou.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1762522132551x853232545436321700","nome":"Julia Ew Frohlich","cupom":"JULIAEWF","instagram":"nutri.juliaewf","telefone":"51993743920","email":"nutricionistajuliaef@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Bento Gonçalves","estado":"RS","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-16","data_ultimo_pedido":null,"dias_no_time":163,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773848826404x608054648564968300","nome":"Julia Resgalla","cupom":"JURESGALLA","instagram":"juresgalla","telefone":"31992174800","email":"juliaresgallaadv@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Vazante","estado":"MG","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776522410593x836190468078996000","nome":"Julia Ribeiro Vieira","cupom":null,"instagram":"jujuribeirovieira","telefone":"61999039992","email":"contatojujuribeiro@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Brasília","estado":"DF","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":0,"data_entrada":"2026-04-24","data_ultimo_pedido":null,"dias_no_time":4,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Não recebe","bca_enviado":null,"agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1765362352888x635269448410604300","nome":"Julia Rodrigues da Costa","cupom":"JULIARODRIGUES","instagram":"j.roodriguees","telefone":"19971088162","email":"j.roodriguees9788@icloud.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Araras","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1760964350894x360018223430068860","nome":"Julia Scheffler Neutzling","cupom":"JU","instagram":"juneutzling","telefone":"53991397100","email":"contato.juliantz@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":2,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-15","data_ultimo_pedido":null,"dias_no_time":164,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773779477729x997062478874661400","nome":"Julia de Carvalho Papa","cupom":"JULIACARVALHO","instagram":"byjuliacarvalhop","telefone":"11975519817","email":"contatolajuh@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Caieiras","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773860590332x985174700660735800","nome":"Julia dos Santos Menezes","cupom":"JULIAPEROL","instagram":"juperol","telefone":"21996099005","email":"juliapperol@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Porto Seguro","estado":"BA","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Tiktok","categoria_mes":null,"followup":null,"obs":null},{"id":"1758918106667x955750583409620200","nome":"Juliana Alcantara","cupom":"JUALCANTARA","instagram":"aalcantarajuliana","telefone":"(87) 98814-6499","email":"contatojulianaalcantara@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Petrolina","estado":"PE","vendas":4,"saldo":0,"last_comission":10.0,"comissao_pct":10.0,"data_entrada":"2025-10-31","data_ultimo_pedido":null,"dias_no_time":179,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1742841696107x478964073491333100","nome":"Juliana Daniele da Silva","cupom":"JUJU","instagram":"inventandoju","telefone":"51997316357","email":"judaniele22@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"São Leopoldo","estado":"RS","vendas":18,"saldo":0,"last_comission":0,"comissao_pct":15.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768071463715x777521620864796500","nome":"Juliana Delavalle","cupom":"JUHDELAVALLE","instagram":"juhdelavalle","telefone":"11975030464","email":"julianadelavalle@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Santana De Parnaíba","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1775966197752x156990762073604400","nome":"Juliana Ferreira Baleia","cupom":"JULIANABALEIA","instagram":"julianabaleia","telefone":"16997061602","email":"assessoriajulianabaleia@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Ribeirão Preto","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-12","data_ultimo_pedido":null,"dias_no_time":16,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1767363057386x496453807573231700","nome":"Juliana Palma","cupom":"JUPALMA","instagram":"jupalma_","telefone":"11975301117","email":"assessoriajupalma@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1758559355610x132319799781359620","nome":"Juliana Rafacho Ramos Terra","cupom":"JURAFACHO","instagram":"jrafacho","telefone":"11940007955","email":"julianarafachoterra@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":14,"saldo":0,"last_comission":10.0,"comissao_pct":10.0,"data_entrada":"2025-10-30","data_ultimo_pedido":null,"dias_no_time":180,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1765299589400x782742863911742600","nome":"Juliana Rodrigues","cupom":"JULIANARGES","instagram":"julianarges","telefone":"12981521324","email":"julianardges@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"São José Dos Campos","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1758725320151x884896927492866000","nome":"Juliana Vilar","cupom":"JUJUVILAR","instagram":"jujuvilar_","telefone":"61996356766","email":"julilanavilar.b.c@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Uruguaiana","estado":"RS","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1762615448640x714799497130176300","nome":"Julie Silveira Porto","cupom":"JULIESIL","instagram":"juuliesilveira","telefone":"53981154477","email":"juuliesilveira@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Pelotas","estado":"RS","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-16","data_ultimo_pedido":null,"dias_no_time":163,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1765328359315x639723535035653600","nome":"Julya Bourbon","cupom":"JULYA","instagram":"julyabourbon","telefone":"75981198181","email":"julyaveri@icloud.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Cruz Das Almas","estado":"BA","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1760028422495x211976131269084640","nome":"Júlia Alcoforado Neves","cupom":"JULIAALCOFORADO","instagram":"juliaalcoforado","telefone":"75991915452","email":"contato@juliaalcoforado.com.br","nivel":"Creator Blessy","status":"Ativa","cidade":"Salvador","estado":"BA","vendas":69,"saldo":0,"last_comission":0,"comissao_pct":20.0,"data_entrada":"2025-10-09","data_ultimo_pedido":null,"dias_no_time":201,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":null,"agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1751909696255x175817512287443900","nome":"Júlia Basílio Goveia","cupom":"GOVEIA","instagram":"Jugoveiab","telefone":"11999809046","email":"jugoveiab@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Guarulhos","estado":"SP","vendas":2,"saldo":0,"last_comission":0,"comissao_pct":20.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1759418521584x862515736568057900","nome":"Júlia Bárbara de Carvalho","cupom":"JULIAB","instagram":"juliabbarbara","telefone":"47996964869","email":"julia.leide@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Joinville","estado":"SC","vendas":3,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-10-29","data_ultimo_pedido":null,"dias_no_time":181,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1761738045776x645112236671903700","nome":"Júlia Costa Barsani","cupom":"DAILYJU","instagram":"dailyy.ju_","telefone":"24999640868","email":"costabarsani@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Areal","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":10.0,"comissao_pct":10.0,"data_entrada":"2025-10-30","data_ultimo_pedido":null,"dias_no_time":180,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1731457406647x196876081177821200","nome":"Kamili Gonçalves da Costa","cupom":"KAMILI","instagram":"kamilicosta","telefone":"47996723040","email":"kamilicostacontato@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Itajaí","estado":"SC","vendas":10,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1771758555266x529468557704067840","nome":"Kammy Almeida","cupom":"KAMMY","instagram":"kammyalmeida","telefone":"11975417250","email":"kamilla.karlla@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":1,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1770573334599x362456605859253570","nome":"Karina Ventura","cupom":"KARINAV","instagram":"karinaventurasouzaa","telefone":"66999787966","email":"karinaventurasousa@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Sorriso","estado":"MT","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-10","data_ultimo_pedido":null,"dias_no_time":77,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1760367690323x441654060521440300","nome":"Karina Vitoria Ferreira Kadekaro","cupom":"KADEKARO","instagram":"kadekarokarinab_","telefone":"11964342730","email":"kkadekaro@icloud.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Mauá","estado":"SP","vendas":4,"saldo":0,"last_comission":10.0,"comissao_pct":10.0,"data_entrada":"2025-10-30","data_ultimo_pedido":null,"dias_no_time":180,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769530442415x274729499381867870","nome":"Karine Marques Favilla Cotrim","cupom":"KARINE","instagram":"karinefavilla","telefone":"21999186989","email":"contatokarinefavilla@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Niterói","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768668665937x180375016342470660","nome":"Kauana Schultz Mafra","cupom":"KAUSMAFRA","instagram":"kau.smafra","telefone":"47988928117","email":"kau.smafra@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio Do Sul","estado":"SC","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-03-31","data_ultimo_pedido":null,"dias_no_time":28,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1744750460708x368826544010559500","nome":"Kellyane Silva Gurgel","cupom":"NUTRIKELLY","instagram":"kellyaneg._","telefone":"87981469585","email":"kellyanegurgelnutri@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São João","estado":"PE","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":15.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1775565597775x100569393702819800","nome":"Laiz Hilda Maçaneiro","cupom":"LAIZ","instagram":"laizmacaneiro","telefone":"47992242758","email":"contatolaizmacaneiro@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Joinville","estado":"SC","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-07","data_ultimo_pedido":null,"dias_no_time":21,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Tiktok","categoria_mes":null,"followup":null,"obs":null},{"id":"1759166745273x784357090090609200","nome":"Lara Abreu Martins","cupom":"LARAMARTINS","instagram":"martins__lara","telefone":"85987697484","email":"laramartinsassessoria@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Fortaleza","estado":"CE","vendas":0,"saldo":0.0,"last_comission":10.0,"comissao_pct":10.0,"data_entrada":"2025-10-31","data_ultimo_pedido":null,"dias_no_time":179,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1753561972205x581073835362877400","nome":"Lara Lopes","cupom":"LARANUTRICIONISTA","instagram":"laranutricionista","telefone":"84996724949","email":"lara@laranutricionista.com.br","nivel":"Creator Blessy","status":"Ativa","cidade":"Natal","estado":"RN","vendas":13,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-08-15","data_ultimo_pedido":null,"dias_no_time":256,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768871658143x274463400638521150","nome":"Lara Lopes Silva Fagundes","cupom":"LARAFAGUNDES","instagram":"laralopesfagundes","telefone":"21972502359","email":"larafagundes@unigranrio.br","nivel":"Creator Blessy","status":"Ativa","cidade":"Niterói","estado":"RJ","vendas":1,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1770747295673x765853162781554200","nome":"Lara Pinheiro Medeiros","cupom":"LARAMEDEIROS","instagram":"larapmedeiros","telefone":"85981307081","email":"larapmedeiros08@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Fortaleza","estado":"CE","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-10","data_ultimo_pedido":null,"dias_no_time":77,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Sim, eu sou.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768495640830x311330421065116200","nome":"Larice Souza","cupom":"LARICE","instagram":"larice_","telefone":"31986484106","email":"larice.easier@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Para De Minas","estado":"MG","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1761217372470x577858110159391600","nome":"Larissa Cabral Mouta","cupom":"LALAMOUTA","instagram":"lalamouta","telefone":"83987284733","email":"larissacmouta@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"João Pessoa","estado":"PB","vendas":0,"saldo":0.0,"last_comission":10.0,"comissao_pct":10.0,"data_entrada":"2025-10-30","data_ultimo_pedido":null,"dias_no_time":180,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1756905571065x154971875301911580","nome":"Larissa Caroline Costa Dias","cupom":"LARIDAILY","instagram":"laricostavdaily","telefone":"21970009375","email":"laricostavdaily@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Rio de Janeiro","estado":"RJ","vendas":6,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-09-03","data_ultimo_pedido":null,"dias_no_time":237,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":null,"agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1751910608733x238511489317203550","nome":"Larissa Catiane De Oliveira","cupom":"LARICATIANE","instagram":"lariicatiane","telefone":"51996480962","email":"larissacatiane@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Leopoldo","estado":"RS","vendas":8,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1757354808651x322045541423513600","nome":"Larissa Cecilia Bravo da Costa","cupom":"LARI","instagram":"bariatricaporlari","telefone":"21972160425","email":"contatolarissaeis@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Itaboraí","estado":"RJ","vendas":11,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-09-16","data_ultimo_pedido":null,"dias_no_time":224,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1756237387949x383309346014649700","nome":"Larissa Piccinato Vieira","cupom":"LARIPICCINATO","instagram":"laripiccinato","telefone":"15981074295","email":"Larissa.piccinatov@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Bragança Paulista","estado":"SP","vendas":20,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-08-26","data_ultimo_pedido":null,"dias_no_time":245,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":null,"agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1767041006843x180380351050662750","nome":"Larissa Prado","cupom":"LARIPRADO","instagram":"larissaapradoo","telefone":"11933500641","email":"contatolarissaprado@hotmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1739123473002x454860493943439360","nome":"Larissa Vitória Borges Dias","cupom":"LAVI5","instagram":"_laviborges","telefone":"67996617413","email":"vihdias0312@icloud.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Campo Grande","estado":"MS","vendas":25,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-08-02","data_ultimo_pedido":null,"dias_no_time":269,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1772806006713x172951635319607000","nome":"Laura Beatriz Silva Souza","cupom":"LALABC","instagram":"lalabc","telefone":"47999425015","email":"laurabss@icloud.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Balneário Camboriú","estado":"SC","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-03-31","data_ultimo_pedido":null,"dias_no_time":28,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Tiktok","categoria_mes":null,"followup":null,"obs":null},{"id":"1767703829260x541972711450324800","nome":"Laura Farbin","cupom":"AQUELAGURIA","instagram":"aquela.guriaa","telefone":"47989010990","email":"garbiinlaura@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Blumenau","estado":"SC","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1738263339586x437152068397170700","nome":"Laura Helena Gatinho Moraes","cupom":"LAUGATINHO","instagram":"lauragatinho","telefone":"48996048568","email":"laugatinhoo@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Belém","estado":"PA","vendas":23,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-01-30","data_ultimo_pedido":null,"dias_no_time":454,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1760013648913x942632986947701000","nome":"Laura Pedrosa Pimentel Silva","cupom":"JAFUIFITNESS","instagram":"jafuifitness","telefone":"82996217087","email":"jafuifitness@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Maceió","estado":"AL","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-15","data_ultimo_pedido":null,"dias_no_time":164,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776727992208x868767417310960300","nome":"Lauren Antonia  Lupato de Sousa","cupom":null,"instagram":"laurenlupato","telefone":"41991841518","email":"laurenassessoria@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Curitiba","estado":"PR","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":0,"data_entrada":"2026-04-27","data_ultimo_pedido":null,"dias_no_time":1,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Não recebe","bca_enviado":null,"agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1774136563969x149903627594224030","nome":"Lauren Hornes Melo","cupom":"LAURENMELO","instagram":"laurenmeloo","telefone":"11973077395","email":"laurenmelolashes@outlook.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Sebastião","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1762537480867x781940191473115900","nome":"Lavínia Giehl","cupom":"LALAGIEHL","instagram":"lalagiehl","telefone":"51999469067","email":"contatolaviniagiehl@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Venâncio Aires","estado":"RS","vendas":3,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-16","data_ultimo_pedido":null,"dias_no_time":163,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1777368243314x706449197430410100","nome":"Layana Nascimento Silva Lisboa","cupom":null,"instagram":"layanaalisboa","telefone":"27988138245","email":"contato.layanalisboa@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Vitória","estado":"ES","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":0,"data_entrada":"2026-04-28","data_ultimo_pedido":null,"dias_no_time":0,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Não recebe","bca_enviado":null,"agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768312972191x634014936809131600","nome":"Lethicia Souza Barbosa","cupom":"LETHICIA","instagram":"lethicia.barbosa","telefone":"11964043118","email":"lethicia.barbosa81@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Suzano","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1762615580259x433095360833607900","nome":"Leticia Mendonca Araujo","cupom":"LETANUTRI","instagram":"letanutri","telefone":"85987110898","email":"leticiama468@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Fortaleza","estado":"CE","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-16","data_ultimo_pedido":null,"dias_no_time":163,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1772064467575x969961180951960300","nome":"Leticia de Souza Franca","cupom":"LETSFRANCA","instagram":"letsfranca","telefone":"11974961257","email":"le.sfranca1@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Embu Das Artes","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1755983716139x504197262754090500","nome":"Letícia Barbosa Maciel Diniz Feitosa","cupom":"LETICIAMACIEL","instagram":"leticia_macield","telefone":"81989287871","email":"leticia.maciel469@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Caruaru","estado":"PE","vendas":12,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-08-23","data_ultimo_pedido":null,"dias_no_time":248,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":null,"agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1772828605937x566529761221401700","nome":"Letícia Lenzi Claudino dos Santos","cupom":"LETICIALENZI","instagram":"leticialenziclaudino","telefone":"47999191145","email":"nutrileclaudino@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Balneário Camboriú","estado":"SC","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-03-31","data_ultimo_pedido":null,"dias_no_time":28,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1751202623727x986218342856352000","nome":"Letícia Magalhães","cupom":"LELEM","instagram":"lele.magalhaess","telefone":"11993506962","email":"contato.lelemagalhaes@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":13,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776112476845x820433278983739400","nome":"Lianna Trindade","cupom":"LIANNATRINDADE","instagram":"liannatrindadee","telefone":"21965808061","email":"liannatrindademed@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio De Janeiro","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-14","data_ultimo_pedido":null,"dias_no_time":14,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1757449228167x844704845603274800","nome":"Ligia Pinguello","cupom":"LIGIA","instagram":"pinguelloligia","telefone":"49999260592","email":"contatoligiapinguello@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Curitiba","estado":"PR","vendas":21,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-09-14","data_ultimo_pedido":null,"dias_no_time":226,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1757678922980x875740262922190800","nome":"Linda Zenja Woldemar","cupom":"LINDA","instagram":"lindazenja","telefone":"51982708482","email":"linda.zenja@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":8,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-09-13","data_ultimo_pedido":null,"dias_no_time":227,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773353420919x152193767313588700","nome":"Lis Bella Andreazzi","cupom":"LISBELLA","instagram":"lisbellaandreazzi","telefone":"11972608511","email":"lisbellaandreazzi@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Ilhabela","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-03-12","data_ultimo_pedido":null,"dias_no_time":47,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Pendente","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769800479601x715188824669492000","nome":"Lisa Haide Triverio Machado","cupom":"LISAHAIDE","instagram":"lisahaide","telefone":"11994687997","email":"lisahcomercial@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-12","data_ultimo_pedido":null,"dias_no_time":75,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773937030291x342883323787643200","nome":"Lisie Maria Dorea Mota Correa","cupom":"LISIEMARIA","instagram":"lisiemarianutri","telefone":"21999203656","email":"lisiepdmf@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio De Janeiro","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-03-31","data_ultimo_pedido":null,"dias_no_time":28,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1731530968401x625967042784395300","nome":"Livia Maria de Aguiar","cupom":"LIVIA","instagram":"liviaguiarr","telefone":"15998262258","email":"liviamariaaguiarr@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Itapetininga","estado":"SP","vendas":11,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2024-10-17","data_ultimo_pedido":null,"dias_no_time":559,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1759375279290x349557183845255200","nome":"Lizandra De Souza Galdino","cupom":"LILI","instagram":"lizandragaldino","telefone":"21984687172","email":"liligaldino1@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio de Janeiro","estado":"RJ","vendas":17,"saldo":0,"last_comission":0,"comissao_pct":20.0,"data_entrada":"2025-10-02","data_ultimo_pedido":null,"dias_no_time":208,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Não recebe","bca_enviado":null,"agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769772367193x857021785350292400","nome":"Lorena Dias","cupom":"LORE","instagram":"loorysz","telefone":"75991785663","email":"contatoloorysz@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Valença","estado":"BA","vendas":2,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-11","data_ultimo_pedido":null,"dias_no_time":76,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1777071603415x774977196275916600","nome":"Lorena Lemoine Câmara Pacífico","cupom":null,"instagram":"lorenalemoinenutri","telefone":"21986758547","email":"nutri.lorenalemoine@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio De Janeiro","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":0,"data_entrada":"2026-04-27","data_ultimo_pedido":null,"dias_no_time":1,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Não recebe","bca_enviado":null,"agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1765912519770x625331166359022200","nome":"Lorena Maria Martins Andrade","cupom":"LORE5","instagram":"loremartinsf","telefone":"81999499989","email":"loremartinsf@outlook.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Recife","estado":"PE","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1757530058457x341263653286969340","nome":"Lorena Rezende","cupom":"LORENAREZENDE","instagram":"lorena_rezende","telefone":"37999419096","email":"lorenarezende23@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Formiga","estado":"MG","vendas":9,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-09-16","data_ultimo_pedido":null,"dias_no_time":224,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776215802515x109814547545742610","nome":"Lorrayne Temer Cassimiro","cupom":"TEMER","instagram":"dailytemer","telefone":"14981831819","email":"contato.temerlo@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Sao Paulo SP","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-14","data_ultimo_pedido":null,"dias_no_time":14,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1762086729240x563051024782511100","nome":"Louise Alves Boffa Fajardo","cupom":"LOU5","instagram":"louisefajard","telefone":"31999789611","email":"louise.boffa@icloud.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Belo Horizonte","estado":"MG","vendas":5,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-15","data_ultimo_pedido":null,"dias_no_time":164,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1770952504394x940621853673735400","nome":"Luana Bernz","cupom":"LUANABERNZ","instagram":"luanabernz","telefone":"47996380417","email":"luanagruneich@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Blumenau","estado":"SC","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1766851703553x935237367661020400","nome":"Luana Narim","cupom":"NARIM","instagram":"narimluana","telefone":"11946274139","email":"contato.narim@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"São Bernardo Do Campo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-12-29","data_ultimo_pedido":null,"dias_no_time":120,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1774458904072x335459939322127360","nome":"Luanna Moreira Almeida","cupom":"FITBYLU","instagram":"__luannalmeidaa","telefone":"27998832108","email":"fitbyluanna@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Vitória","estado":"ES","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-03-31","data_ultimo_pedido":null,"dias_no_time":28,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1767795639059x341203048188597060","nome":"Luanna Pereira","cupom":"LUANNA","instagram":"luannapereiraf","telefone":"11943708070","email":"contatoluanna@outlook.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Barueri","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-01-07","data_ultimo_pedido":null,"dias_no_time":111,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1765801684079x246234156873756260","nome":"Luiza Capaverde","cupom":"LUCAPAVERDE","instagram":"luizacapaverde","telefone":"48991818881","email":"luiza.capaverde01@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Criciúma","estado":"SC","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773606703284x705967833730088100","nome":"Luiza Fernandes Cilento","cupom":"LUIZACILENTO","instagram":"luizacilento","telefone":"21965622933","email":"cilentoluiza1@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Macaé","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-11","data_ultimo_pedido":null,"dias_no_time":17,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1765302388500x393229959760188500","nome":"Luiza Gutman","cupom":"DRALUIZAGUTMAN","instagram":"draluizagutman","telefone":"21969297000","email":"luizagutman@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio De Janeiro","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768432072182x773371864250870700","nome":"Luiza Leite Corsato","cupom":"LUCORSATO","instagram":"luizacorsato","telefone":"14996417070","email":"luizacorsato@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Marília","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-10","data_ultimo_pedido":null,"dias_no_time":77,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Sim, eu sou.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1759148632313x296843214875122300","nome":"Luiza Lucci","cupom":"LUIZALUCCI","instagram":"luizalucci","telefone":"11942325540","email":"luizalucciserracarbassa@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":2,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-15","data_ultimo_pedido":null,"dias_no_time":164,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Tiktok","categoria_mes":null,"followup":null,"obs":null},{"id":"1768494714038x346853649380905340","nome":"Luiza Moema Grupioni","cupom":"LUIZAMOEMA","instagram":"luizamoema","telefone":"61998422982","email":"lu.moema26@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Cristalina","estado":"GO","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-10","data_ultimo_pedido":null,"dias_no_time":77,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776082201843x106815846888647980","nome":"Luiza Rissi","cupom":"RISSILU","instagram":"rissilu","telefone":"49998331538","email":"luizarissi@icloud.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Florianópolis","estado":"SC","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-13","data_ultimo_pedido":null,"dias_no_time":15,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1764609336060x122046127897058380","nome":"Luiza Rodrigues Hellmeister","cupom":"LUUHELLMEISTER","instagram":"luuhellmeister","telefone":"19993674514","email":"luiza.hellmeister@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Americana","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1775822644774x825503054706210300","nome":"Luiza de Paula Matos","cupom":"LUIZAMATOS","instagram":"luizamatostech","telefone":"31973272390","email":"contatoluizamatos@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Betim","estado":"MG","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1767987467569x248079416440637920","nome":"Luísa Marques Silva","cupom":"LUISAMARQUES","instagram":"luisaamarques__","telefone":"31995213072","email":"luisamsilva96@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Belo Horizonte","estado":"MG","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768402921713x997080754056767600","nome":"Mabel Teles","cupom":"MABEL","instagram":"mabelteles","telefone":"71996061671","email":"mktmabelteles@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Salvador","estado":"BA","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1758332197439x921682183944405000","nome":"Manoela Flores","cupom":"MANOELAFLORES","instagram":"manoelafloress","telefone":"51992691061","email":"manu@manoelaflores.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Porto Alegre","estado":"RS","vendas":0,"saldo":0.0,"last_comission":10.0,"comissao_pct":10.0,"data_entrada":"2025-10-30","data_ultimo_pedido":null,"dias_no_time":180,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776260967436x803072948645214200","nome":"Manoela Marques","cupom":"MANUMARQUES","instagram":"eumanu.marquess","telefone":"51984833896","email":"ugcmanumarques@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Porto Alegre","estado":"RS","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-15","data_ultimo_pedido":null,"dias_no_time":13,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1747762645949x813407384862982100","nome":"Marcela Castro Vieira Gomes","cupom":"MARCELA","instagram":"marcela.casstro","telefone":"34992191555","email":"contatomarcelacastrovg@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Uberlândia","estado":"MG","vendas":23,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1766683857442x121127445043405660","nome":"Marcela Miranda Bandeira","cupom":"MAHMIRANDA","instagram":"mahmirandd","telefone":"79991301678","email":"daniellemiranda2008@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio De Janeiro","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769207779007x840346161205398400","nome":"Marcela Raissa Nóbrega Ferreira","cupom":"MAHRAISSA","instagram":"mahraissa","telefone":"13996362882","email":"marcela.raissan@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Vicente","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1742582308193x972607198576771100","nome":"Marcella Leal","cupom":"MARCELLA","instagram":"marcellaleal","telefone":"11961769053","email":"mlealrb@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Itapecerica da Serra","estado":"SP","vendas":17,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Não recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768431661239x443946902218935940","nome":"Marcia Duarte","cupom":"MARCIADUARTE","instagram":"amarciaduarte","telefone":"51993597089","email":"marciaduarte.contato@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Porto Alegre","estado":"RS","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-10","data_ultimo_pedido":null,"dias_no_time":77,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1767872720329x494777023824617660","nome":"Maria Adelayde Amaral","cupom":"MARIAAMARAL","instagram":"maria.amaralg","telefone":"31991256517","email":"mariaadelayde@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776369728537x647956851824582100","nome":"Maria Alice Rodrigues","cupom":null,"instagram":"alicerodrigueez","telefone":null,"email":"contatoalicer@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":null,"estado":null,"vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":0,"data_entrada":"2026-04-24","data_ultimo_pedido":null,"dias_no_time":4,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Não recebe","bca_enviado":null,"agenciado":null,"rede_principal":null,"categoria_mes":null,"followup":null,"obs":null},{"id":"1772167061239x479137850878536900","nome":"Maria Clara Caminski Raposo","cupom":"CLARACAMINSKI","instagram":"clara_caminski","telefone":"69992825853","email":"contato.claracaminski@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Porto Velho","estado":"RO","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776433329228x319109192903135100","nome":"Maria Clara Pereira Da Cruz","cupom":null,"instagram":"clarafitness_","telefone":"81996337411","email":"contatoclarafitness1@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Jaboatão Dos Guararapes","estado":"PE","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":0,"data_entrada":"2026-04-24","data_ultimo_pedido":null,"dias_no_time":4,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Não recebe","bca_enviado":null,"agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1762360617699x970423756452247900","nome":"Maria Eduarda Alves","cupom":"DUDS","instagram":"dudaalvesxy","telefone":"38988420940","email":"dudaalvesp9@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Sete Lagoas","estado":"MG","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-15","data_ultimo_pedido":null,"dias_no_time":164,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776262469633x973248571325495400","nome":"Maria Eduarda Alves dos Santos","cupom":"EDUARDAALVS","instagram":"eduardaalvs__","telefone":"83996370486","email":"eduardaalvs19@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Mari","estado":"PB","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-16","data_ultimo_pedido":null,"dias_no_time":12,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1761239508690x630280039247428100","nome":"Maria Eduarda Andrade","cupom":"DUDAISZ","instagram":"dudaaisz","telefone":"22992074435","email":"iszduda1@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Nova Friburgo","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":10.0,"comissao_pct":10.0,"data_entrada":"2025-10-30","data_ultimo_pedido":null,"dias_no_time":180,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1774903471915x486489450496192300","nome":"Maria Eduarda Cabral de Lima","cupom":"DUDALIMA","instagram":"dudalimadaily_","telefone":"65984495299","email":"dudacl2005@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Cuiabá","estado":"MT","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1775358971905x457583275730514500","nome":"Maria Eduarda Garcia","cupom":"MADUGARCIA","instagram":"madugarcia","telefone":"11951478960","email":"mariaedugarcia1402@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1772731934345x106372313226004600","nome":"Maria Eduarda Leixas","cupom":"MADULEIXAS","instagram":"maduleixas","telefone":"31984038118","email":"leixasm@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Belo Horizonte","estado":"MG","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1758980615313x218843624209653400","nome":"Maria Eduarda Moreira","cupom":"DUDAMOREIRA","instagram":"dudaamoreeira","telefone":"16988295851","email":"mariaeduardamemaduda@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Carlos","estado":"SP","vendas":0,"saldo":0.0,"last_comission":10.0,"comissao_pct":10.0,"data_entrada":"2025-10-30","data_ultimo_pedido":null,"dias_no_time":180,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1761130678354x312558788807724800","nome":"Maria Eduarda Nossol","cupom":"DUDANOSSOL","instagram":"eduardanossol","telefone":"41987472597","email":"contatoeduardanossol@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Curitiba","estado":"PR","vendas":1,"saldo":0,"last_comission":10.0,"comissao_pct":10.0,"data_entrada":"2025-10-30","data_ultimo_pedido":null,"dias_no_time":180,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1775739008826x999320380610102800","nome":"Maria Eduarda Oliveira Sales","cupom":"DUDASAALLES","instagram":"dudasaallees","telefone":"82993085096","email":"dudasalleesacessoria@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Miguel Dos Campos","estado":"AL","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1763741274313x789414820914599000","nome":"Maria Eduarda Reolon","cupom":"FITDUDA","instagram":"_fitduda","telefone":"51992330096","email":"dudareolon745@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Canoas","estado":"RS","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1751376590156x784041980876239700","nome":"Maria Eduarda Scott Lima Dos Santos","cupom":"DUDASCOTT","instagram":"dudascott","telefone":"11978008889","email":"cttdudascott@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":13,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1766097891008x362305858384604600","nome":"Maria Eduarda Silveira da Cas","cupom":"MADUFIT","instagram":"_madufit_","telefone":"51989216100","email":"dudadacas09@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Porto Alegre","estado":"RS","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1746653933761x575541551375319040","nome":"Maria Eduarda Sonntag","cupom":"QUERODUDA","instagram":"dudasonntag","telefone":"55996933660","email":"eduardasonntag@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Santa Maria","estado":"RS","vendas":24,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769101723825x128657437171168850","nome":"Maria Eduarda Tufaile Bueno","cupom":"MARIATUFAILE","instagram":"mariatufaile","telefone":"17997154661","email":"mariatufaile@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São José Do Rio Preto","estado":"SP","vendas":8,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-01-22","data_ultimo_pedido":null,"dias_no_time":96,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1765972715605x925737444113026800","nome":"Maria Eloisa Matias Leal","cupom":"MARIE","instagram":"marieeloisa_","telefone":"81999907482","email":"mariaeloisaml25@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Caruaru","estado":"PE","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1758574922664x613342087882735600","nome":"Maria Gabriella Lima Clemonez","cupom":"GABICLEMONEZ","instagram":"gabiclemonezgym","telefone":"99984760479","email":"gabriellaclemonez@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São José de Ribamar","estado":"MA","vendas":18,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-09-22","data_ultimo_pedido":null,"dias_no_time":218,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1765480842006x331097156160035500","nome":"Maria Julia Abreu Silva","cupom":"MAJUABREU","instagram":"majuaabreu","telefone":"71996043842","email":"majuabreusilva@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Salvador","estado":"BA","vendas":0,"saldo":0.0,"last_comission":10.0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1771697274125x397025432938967300","nome":"Maria Julia Barbosa","cupom":"MAJUSB","instagram":"nutri.majusb","telefone":"12991252784","email":"barbosa.mj22@yahoo.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Taubaté","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769990219964x638479641922549100","nome":"Maria Julia Ribeiro","cupom":"MAJURIB","instagram":"majurib","telefone":"16997170213","email":"majurib100@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Ribeirão Preto","estado":"SP","vendas":2,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-11","data_ultimo_pedido":null,"dias_no_time":76,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776014695504x196357200158491460","nome":"Maria Luiza Alves Echs","cupom":"MALUALVES","instagram":"marialuizzalves","telefone":"34999210990","email":"marialuizzalves@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-12","data_ultimo_pedido":null,"dias_no_time":16,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768751972208x273436385860306180","nome":"Maria Luiza Diaz","cupom":"MALUDIAZ","instagram":"maludiazr","telefone":"11998044514","email":"contato.maludiaz@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":4,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-19","data_ultimo_pedido":null,"dias_no_time":68,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Tiktok","categoria_mes":null,"followup":null,"obs":null},{"id":"1767841755101x306988231309761860","nome":"Maria Luiza Lazzaretto","cupom":"MALULO","instagram":"malulofit","telefone":"11975034218","email":"malucirillo10@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773432816167x731537033281238500","nome":"Maria Luiza de Souza Vieira","cupom":"MALUFIT","instagram":"maluvieirafit","telefone":"12991858505","email":"jobsmaluvieirafit@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Taubaté","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-03-31","data_ultimo_pedido":null,"dias_no_time":28,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1772892651380x288341688211381200","nome":"Maria Paula Lasch Johann","cupom":"MARIAPAULA","instagram":"mariapaulajohann","telefone":"54997105130","email":"mariapaulajohann@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1775509470860x952862884032207400","nome":"Maria Rita Olivera Baquil","cupom":"RITABAQUIL","instagram":"ritabaquil","telefone":"98985631163","email":"ritaolive28@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Barreirinhas","estado":"MA","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1765209216851x209525407297544100","nome":"Maria Stella Rocha","cupom":"MARIASTELLA","instagram":"mariastellarocha","telefone":"84994852754","email":"mariastellarco@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Mossoró","estado":"RN","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773371153995x653855436982211600","nome":"Maria Victoria Sandes Bezerra","cupom":"MAVIB","instagram":"mavibezerra","telefone":"99984472586","email":"maavibezerra@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Balsas","estado":"MA","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-11","data_ultimo_pedido":null,"dias_no_time":17,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1757354066953x881567296191725600","nome":"Maria Vitória","cupom":"MARIA","instagram":"mqliveira_","telefone":"47989186477","email":"contatomqliveira@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Joinville","estado":"SC","vendas":5,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-09-16","data_ultimo_pedido":null,"dias_no_time":224,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768656490060x152537144184710300","nome":"Mariana Albuquerque Peris","cupom":"MARIALBU","instagram":"mariianaalbu","telefone":"21977106313","email":"marianaalbuperis7@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio De Janeiro","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1775596353803x441438718216528450","nome":"Mariana Dionisio","cupom":"MARYDIONISIO","instagram":"amarydionisio","telefone":"21970995710","email":"marianadionisio@id.uff.br","nivel":"Creator Blessy","status":"Ativa","cidade":"Niterói","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1758633580111x139089783234536350","nome":"Mariana Domingues","cupom":"MARIDS","instagram":"mrianads","telefone":"11949060490","email":"marianasoares.ms2021@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Osasco","estado":"SP","vendas":8,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-09-23","data_ultimo_pedido":null,"dias_no_time":217,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Pendente","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776011718275x601767730659294600","nome":"Mariana Mendes","cupom":"MARIMENDES","instagram":"nutrimarimendes","telefone":"19982240004","email":"marimnutri@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Campinas","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-12","data_ultimo_pedido":null,"dias_no_time":16,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1770959633334x241908504708965300","nome":"Mariana Menenezes","cupom":"MARIMENEZES","instagram":"marianatmenezes","telefone":"51997204787","email":"marianatmenezes@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":1,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768923177598x804331808871507100","nome":"Mariana Roberta Pinel Veras","cupom":"MARIVERAS","instagram":"maripveras","telefone":"81985613478","email":"marianapveras@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Jaboatão Dos Guararapes","estado":"PE","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-01-27","data_ultimo_pedido":null,"dias_no_time":91,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1764816609179x662445971163660500","nome":"Mariana Silva Avila Caminha","cupom":"MARICAMINHA","instagram":"maricaminha","telefone":"48999887991","email":"maricaminha29@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Palhoça","estado":"SC","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1750209210871x230895573262925820","nome":"Marianna Hofke","cupom":"MARIHOFKE","instagram":"marihofke","telefone":"67999202602","email":"mahofke@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":5,"saldo":0,"last_comission":0,"comissao_pct":15.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1763496693820x569042373598930940","nome":"Marina Cardoso","cupom":"MARICARDOSO","instagram":"marinacrd_","telefone":"51996190985","email":"contato.marinacrd@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Bento Gonçalves","estado":"RS","vendas":4,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768645220552x385683067900650240","nome":"Marina Dutra","cupom":"MARINADUTTRA","instagram":"marinaduttra_","telefone":"42984175141","email":"marinadutra584@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Mateus Do Sul","estado":"PR","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1739123067299x219177341237854200","nome":"Marina Marques Martins","cupom":"MARINA5","instagram":"marina.marquest","telefone":"19994330681","email":"marina21martins@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Casa Branca","estado":"SP","vendas":24,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-02-09","data_ultimo_pedido":null,"dias_no_time":444,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1770251425059x240751301911709340","nome":"Marina Martins Chiesa","cupom":"CHIESA","instagram":"marinachiesa_","telefone":"48998381205","email":"marinachiesamkt@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Imbituba","estado":"SC","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-10","data_ultimo_pedido":null,"dias_no_time":77,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1758633002533x100492401681486320","nome":"Marina Spadetto Costa","cupom":"MARINASP","instagram":"marinaspadetto","telefone":"(27) 98816-3960","email":"marinaspadetto@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Vitória","estado":"ES","vendas":10,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-09-23","data_ultimo_pedido":null,"dias_no_time":217,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":null,"agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1760699271416x543333406908812740","nome":"Marina Sângela","cupom":"SANGELA","instagram":"sangela_","telefone":"85997924922","email":"marinasangelaoa@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Eusébio","estado":"CE","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-16","data_ultimo_pedido":null,"dias_no_time":163,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1734029594409x998092306464636900","nome":"Marina Vilaça","cupom":"MAVI","instagram":"marinavilacac","telefone":"11917371300","email":"marinavilacac@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Barueri","estado":"SP","vendas":19,"saldo":0,"last_comission":0,"comissao_pct":28.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Não recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1770746264812x151596015389266800","nome":"Monik Amato Mirandola","cupom":"MONIK","instagram":"daily.monikamato","telefone":"17997260260","email":"contatomonikamato@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Presidente Prudente","estado":"SP","vendas":1,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-10","data_ultimo_pedido":null,"dias_no_time":77,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1754661021760x870652612190404600","nome":"Nadiny Almeida Magalhães Silva","cupom":"NADINY","instagram":"nadinymagalhaess","telefone":"31975780973","email":"contatonadinymagalhaes@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Florianópolis","estado":"SC","vendas":3,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-08-13","data_ultimo_pedido":null,"dias_no_time":258,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768870195483x879419013354495000","nome":"Natalia Borges Vieira","cupom":"NATALIABORGESNUTRI","instagram":"nataliaborgesnutri","telefone":"98982751647","email":"nataliaborgesnutri@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Luís","estado":"MA","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-10","data_ultimo_pedido":null,"dias_no_time":77,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1774023673141x905854347368597800","nome":"Natalia Lourenço","cupom":"NATLOURENCO","instagram":"nataliallourenco","telefone":"31986691151","email":"contatonataliallourenco@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Belo Horizonte","estado":"MG","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1751217438972x378358155097362940","nome":"Natalia Possamai","cupom":"NATALIAP","instagram":"nataliapossamai","telefone":"48999093200","email":"natpossamai@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Urussanga","estado":"SC","vendas":30,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1758043203918x717258813910810600","nome":"Natalia Stein Corceti","cupom":"NATCORCETI","instagram":"dailynataliacorceti","telefone":"67996180380","email":"nataliacorceti@outlook.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio de Janeiro","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-09-16","data_ultimo_pedido":null,"dias_no_time":224,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Tiktok","categoria_mes":null,"followup":null,"obs":null},{"id":"1733331459599x883898435373891600","nome":"Nataly Rossim da Silva","cupom":"NATY5","instagram":"focusbefitt","telefone":"11952698395","email":"natalycreator@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Santos","estado":"SP","vendas":1,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Não recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1763165242488x113105500399025780","nome":"Natan Sztamfater","cupom":"NATAN","instagram":null,"telefone":"00000000000","email":"natan@staminavc.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":0.0,"data_entrada":"2025-11-14","data_ultimo_pedido":null,"dias_no_time":165,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":null,"agenciado":null,"rede_principal":null,"categoria_mes":null,"followup":null,"obs":null},{"id":"1736959038601x396131738147880960","nome":"Nathalia Canela","cupom":"NUTRINC","instagram":"nutrinathaliacanela","telefone":"35984216971","email":"Nathalia_canela@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Monte Sião","estado":"MG","vendas":32,"saldo":0,"last_comission":15.0,"comissao_pct":15.0,"data_entrada":"2025-01-15","data_ultimo_pedido":null,"dias_no_time":469,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769697098432x165473768408008770","nome":"Nathália Regina Martins Quadros","cupom":"NATHALIAMARTINS","instagram":"nathaliamartinsnr","telefone":"51984877920","email":"comercial.nathaliamartins@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Gravataí","estado":"RS","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-10","data_ultimo_pedido":null,"dias_no_time":77,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768517711875x722313046889492200","nome":"Nayara Rampani do Vale","cupom":"NAYARAR","instagram":"nayararampani1","telefone":"44991092423","email":"nayararvale@outlook.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Maringá","estado":"PR","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-10","data_ultimo_pedido":null,"dias_no_time":77,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773082198145x492740576461636160","nome":"Nayara Stefany Sabir","cupom":"NAYARASTEFANY","instagram":"nayaraastefany","telefone":"32991562527","email":"nayfisioterapeuta@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Juiz De Fora","estado":"MG","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-11","data_ultimo_pedido":null,"dias_no_time":17,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1770118820211x472879766640812200","nome":"Nayara de Sousa Ferreira","cupom":"NAYSOUSA","instagram":"sounaysousa","telefone":"62983042880","email":"naysousadv@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Goiânia","estado":"GO","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-12","data_ultimo_pedido":null,"dias_no_time":75,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1764976476823x318731103843766600","nome":"Nicole Bárbara Moreira","cupom":"NICOLEFIT","instagram":"nicmoreirafit","telefone":"48999309799","email":"nicolebarbaramoreira@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Florianópolis","estado":"SC","vendas":1,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-12-16","data_ultimo_pedido":null,"dias_no_time":133,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769518223832x653528498826590100","nome":"Nicole Shawdon Varela Monteiro","cupom":"NIHSHAWDON","instagram":"nihshawdon","telefone":"61986290443","email":"nshawdon@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Brasília","estado":"DF","vendas":2,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768756742191x805882901925310200","nome":"Nicole Vilela Ferreira","cupom":"NICVILELA","instagram":"niic_vilela","telefone":"13988146132","email":"nicolevilela12@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Santos","estado":"SP","vendas":1,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-01-27","data_ultimo_pedido":null,"dias_no_time":91,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1760471394257x673363172169337000","nome":"Nicolle Borges","cupom":"NICOLLE","instagram":"nicolleborges","telefone":"51990122443","email":"nicamaraborges@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Porto Alegre","estado":"RS","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-16","data_ultimo_pedido":null,"dias_no_time":163,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773763626052x919193841823239700","nome":"Nicolle de Castro Sant Anna","cupom":"NIKSANTANNA","instagram":"niksantanna","telefone":"19990189898","email":"contatoniksantanna@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Mogi Guaçu","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1767624624032x301616500608034900","nome":"Nicolli Lopes Perdigão","cupom":"NICOLLI","instagram":"nicolliperdigao","telefone":"31991542305","email":"nicolliperdigao.ugc@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Belo Horizonte","estado":"MG","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-01-06","data_ultimo_pedido":null,"dias_no_time":112,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1765291112328x200964921289581000","nome":"Nicolli Tissi","cupom":"NICCTISSI","instagram":"nicctissi","telefone":"41984999971","email":"nicctissi@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Curitiba","estado":"PR","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1770170081263x616616061273282000","nome":"Nicoly Schlichting","cupom":"SCHSNIC","instagram":"schsnic","telefone":"48992001785","email":"schlichtingnicoly@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São José","estado":"SC","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-11","data_ultimo_pedido":null,"dias_no_time":76,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1775607629074x122044694930149900","nome":"Nilza Souza Amorim","cupom":"AMORINIH","instagram":"amorinih","telefone":"11994342194","email":"nilzaamorim97@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Poá","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1748547102427x280363805593567230","nome":"Papoula Serena Amaral","cupom":"PAPOULLA","instagram":"dailypapoulla","telefone":"69999004533","email":"contatopapoullaserena@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Cacoal","estado":"RO","vendas":2,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776175068698x337355363615490000","nome":"Patricia Valle","cupom":"PATRICIAVALLE","instagram":"patriciavallle","telefone":"11912080777","email":"patriciavallewalter@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Ribeirão Preto","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-16","data_ultimo_pedido":null,"dias_no_time":12,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Sim, eu sou.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1759681829812x174191204080834000","nome":"Paula Camargo","cupom":"PAULACAMARGO","instagram":"paulacamargo_","telefone":"11998246139","email":"paularenatacp@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Mogi Das Cruzes","estado":"SP","vendas":4,"saldo":0,"last_comission":10.0,"comissao_pct":10.0,"data_entrada":"2025-10-30","data_ultimo_pedido":null,"dias_no_time":180,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773493263771x677163031213573600","nome":"Paula Kyrillos","cupom":"PAULINHAK","instagram":"paulinhakyrillos","telefone":"81997311252","email":"falecompk@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Recife","estado":"PE","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-11","data_ultimo_pedido":null,"dias_no_time":17,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1758222511902x928296606491213800","nome":"Pietra Janovichi","cupom":"PITT","instagram":"pittbulk_","telefone":"11977185696","email":"pjanovichi@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":16,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-09-18","data_ultimo_pedido":null,"dias_no_time":222,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1770684600473x770114880291951500","nome":"Priscilla Oliveira de Moura","cupom":"PRISCILLA","instagram":"priscillaoliveirademoura","telefone":"11977076006","email":"prioliveira_1@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Arujá","estado":"SP","vendas":6,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-10","data_ultimo_pedido":null,"dias_no_time":77,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1775594597656x216606087045077220","nome":"Pâmela Marcele Ghilardj","cupom":"PAGHILARDI","instagram":"paghilardi","telefone":"51982029957","email":"pmghilardi@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Sapiranga","estado":"RS","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1763165497130x194005393335356700","nome":"Rafael Shigueru Arakaki","cupom":"SHIGUERU","instagram":null,"telefone":"00000000000","email":"rafael_shigueru@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":0.0,"data_entrada":"2025-11-14","data_ultimo_pedido":null,"dias_no_time":165,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":null,"agenciado":null,"rede_principal":null,"categoria_mes":null,"followup":null,"obs":null},{"id":"1757106201442x612392060866789400","nome":"Rafaella Costa Maciel","cupom":"RAFAMACIEL","instagram":"rafacmaciel_","telefone":"11957401313","email":"rafinhamaciel102@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Arujá","estado":"SP","vendas":37,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-09-14","data_ultimo_pedido":null,"dias_no_time":226,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1747165520697x305721198353842200","nome":"Rafaella Magalhães","cupom":"RAFAELLA","instagram":"rafamagalhaesdaily","telefone":"53981633000","email":"contatorafaellamagalhaes@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Garopaba","estado":"SC","vendas":23,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Pendente","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1733331571553x721352167603306500","nome":"Rafaella Melotti Hedro","cupom":"FAFA","instagram":"rafaellahedro","telefone":"19993195381","email":"rafahedro@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Campinas","estado":"SP","vendas":15,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776130544457x819512150121874700","nome":"Rafaella Rabelo Silva","cupom":"RABELO","instagram":"rabelorafaella","telefone":"62994556546","email":"rafaellarabelos@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-14","data_ultimo_pedido":null,"dias_no_time":14,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1775055577009x819829304825563800","nome":"Raffaella Trevisan Melquiades","cupom":"RAFFAELLA","instagram":"raffaella.tm","telefone":"11958869648","email":"raffatrevi21@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1766410312319x510551422346023500","nome":"Raira Lamara Pereira de Souza","cupom":"RAIRA","instagram":"rairalamara","telefone":"84992198842","email":"rairalamara22@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Natal","estado":"RN","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773148630393x645425135718222100","nome":"Raissa Mat","cupom":"RAISSAMAT","instagram":"raissamat","telefone":"54996816030","email":"raimatx@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Canela","estado":"RS","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-11","data_ultimo_pedido":null,"dias_no_time":17,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768310869675x933659568865028000","nome":"Raissa Vidal","cupom":"RAHVIDAL","instagram":"rah.vidal","telefone":"15991651948","email":"raissaa.vidal@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Fortaleza","estado":"CE","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1758244665679x267917494528245760","nome":"Ranna Bittencourt","cupom":"RANNA","instagram":"rannabittencourt","telefone":"21992024648","email":"rannabittencourt@outlook.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio de Janeiro","estado":"RJ","vendas":6,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-09-18","data_ultimo_pedido":null,"dias_no_time":222,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1770450189386x738221807322069200","nome":"Rayanne Silva","cupom":"RAYPIRES","instagram":"rayannespiress","telefone":"31983478443","email":"rayannepirescontato@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-10","data_ultimo_pedido":null,"dias_no_time":77,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1758633320850x577714294251241200","nome":"Rayssa Melo","cupom":"RAYSSAMELO","instagram":"rayssamelonutri","telefone":"11949347082","email":"ray_melo19@outlook.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":6,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-09-23","data_ultimo_pedido":null,"dias_no_time":217,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Pendente","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768752127031x617364407572938800","nome":"Rayssa Melo","cupom":"RAYROTINA","instagram":"rotinadaray","telefone":"21997944503","email":"rotinademaeefilharj@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio De Janeiro","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-10","data_ultimo_pedido":null,"dias_no_time":77,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1763591984055x517265623545753540","nome":"Rayssa Novaes","cupom":"RAYSSANOVAES","instagram":"rayssaanovaes","telefone":"47997065252","email":"contatorayssanovaes@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Porto Belo","estado":"SC","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1762434621517x605890494073655600","nome":"Rebeca Ferreira de Moraes","cupom":"BECAFIT","instagram":"rebecamoraesfit","telefone":"22997318681","email":"rebecafmoraes28@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Itaperuna","estado":"RJ","vendas":2,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-15","data_ultimo_pedido":null,"dias_no_time":164,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769006441897x905514211032581100","nome":"Rebecca Luana Teixeira da Silva","cupom":"BECCAL","instagram":"rebeccaluana_","telefone":"47997792870","email":"rebeccaluanats@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Itapema","estado":"SC","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1775751756836x283668362742431230","nome":"Rebecca Victoria Ferrari Spironello","cupom":"BECCA","instagram":"beccaspironello","telefone":"19991032345","email":"rebeccafspironello3@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Santana De Parnaíba","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1763489211185x695489611622988500","nome":"Renata Almeida","cupom":"RENATAALMEIDA","instagram":"eurenatalmeida","telefone":"71994107127","email":"renatalmeiida@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Lauro De Freitas","estado":"BA","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1758124720380x562194642252192830","nome":"Renata Lima","cupom":"RENATINHA","instagram":"renatatbl","telefone":"2197308459","email":"contato@renatatbl.com.br","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio de Janeiro","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":0.0,"data_entrada":"2025-09-17","data_ultimo_pedido":null,"dias_no_time":223,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1772564529496x210818573897500350","nome":"Rhayne Ouriques","cupom":"RHAYOURIQUES","instagram":"rhayneouriquesoficial","telefone":"47991474322","email":"contatorhayneouriques@outlook.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Indaial","estado":"SC","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-11","data_ultimo_pedido":null,"dias_no_time":17,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1743450182223x893725330769707000","nome":"Rianne dos Santos Miranda Silveira","cupom":"RIANNEMIRANDA","instagram":"riannemiranda__","telefone":"85999501214","email":"riannemirandaugc@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Fortaleza","estado":"CE","vendas":20,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769366763923x539540005208697150","nome":"Roberta Fagundes","cupom":"ROBERTAF","instagram":"robertafagundes.s","telefone":"34992860727","email":"robertafagundes1717@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Patos De Minas","estado":"MG","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1748986476395x468740724325351400","nome":"Rosangela Pereira Da Cunha Dias Batista","cupom":"ROSANGELADYAS","instagram":"rosangeladyass","telefone":"27998852932","email":"rosangela_dias@hotmail.com.br","nivel":"Creator Blessy","status":"Ativa","cidade":"Cariacica","estado":"ES","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1762454504452x158996067957892350","nome":"Rute Bragança","cupom":"RUTE","instagram":"_umtake","telefone":"27988591002","email":"umtakee@gmail.com","nivel":"Creator Blessy","status":"Curadoria","cidade":"Serra","estado":"ES","vendas":2,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-16","data_ultimo_pedido":null,"dias_no_time":163,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1771350368869x666323576303327000","nome":"Sabrina Oliveira da Silva","cupom":"VIBESDASABRINA","instagram":"vibesdasabrina","telefone":"11946032224","email":"sab.oliveira@yahoo.com.br","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-19","data_ultimo_pedido":null,"dias_no_time":68,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1774962868366x444483265465418940","nome":"Sah Oliveira","cupom":"SAHOLIVEIRA","instagram":"eusaholiveira","telefone":"11973176870","email":"contato@saholiveira.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Suzano","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Sim, eu sou.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1774578707663x548685629973755900","nome":"Samilly Nascimento","cupom":"SAMILLY","instagram":"samillynascimentoo","telefone":"27988002722","email":"samillycontato05@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Vila Velha","estado":"ES","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776041695240x301387280481243200","nome":"Sara Sousa Quintino","cupom":"SARAQUINTINO","instagram":"sara.quintino","telefone":"21966929857","email":"sarapetitaquintino@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio De Janeiro","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-13","data_ultimo_pedido":null,"dias_no_time":15,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1763522935165x684351928885466500","nome":"Sarah Uliano","cupom":"SAHULIANO","instagram":"lifewtsarah","telefone":"48996257000","email":"correiosarahuliano@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio De Janeiro","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Tiktok","categoria_mes":null,"followup":null,"obs":null},{"id":"1768749449129x629106004995871900","nome":"Shirley Machado Mengue","cupom":"SHIRLEY","instagram":"shirleymengue","telefone":"51998801142","email":"contato.shirleymengue@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Guaíba","estado":"RS","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776180568119x910536388729621900","nome":"Sophia Lubianca Palmeiro de Linhares","cupom":"SOPHIALUBIANCA","instagram":"sophialubianca","telefone":"51995522525","email":"sophilubianca@icloud.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio De Janeiro","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-14","data_ultimo_pedido":null,"dias_no_time":14,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1758635068297x591928388579229700","nome":"Stephanie Mendes","cupom":"NUTRISTEPHANIEMENDES","instagram":"nutri.stephaniemendes","telefone":"13997702841","email":"stephaniemendes.nutri@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Santos","estado":"SP","vendas":0,"saldo":0.0,"last_comission":10.0,"comissao_pct":10.0,"data_entrada":"2025-10-30","data_ultimo_pedido":null,"dias_no_time":180,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769048780474x140717755460688210","nome":"Stephanny Gabrielle Ferrari Spironello","cupom":"STEPH","instagram":"stephspironello","telefone":"19991958392","email":"stephanny.spironello3@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Santana De Parnaíba","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1763128427764x443278182508356740","nome":"Stephany Alves","cupom":"STEPHANY","instagram":"_stephany_a","telefone":"91992391995","email":"stephany.ugc@outlook.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":19,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-15","data_ultimo_pedido":null,"dias_no_time":164,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1765933369837x540762922271593300","nome":"Ster Lemos","cupom":"STERLEMOS","instagram":"sterlemos__","telefone":"31985785379","email":"stephane.cm@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Santa Luzia","estado":"MG","vendas":5,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-12-16","data_ultimo_pedido":null,"dias_no_time":133,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1742755252585x839770823151059000","nome":"Stéfani Frassetto Schorr","cupom":"STESCHORR","instagram":"steschorr","telefone":"51994107950","email":"contato.stefanischorr@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Caxias do Sul","estado":"RS","vendas":32,"saldo":0,"last_comission":0,"comissao_pct":15.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Não recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1762198863296x103686745924159940","nome":"Suellen Kishi","cupom":"SUELLENKISHI","instagram":"suellenkishi","telefone":"41995478919","email":"st.assessora@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São José Dos Pinhais","estado":"PR","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-16","data_ultimo_pedido":null,"dias_no_time":163,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Sim, eu sou.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1770294797115x848616786981828400","nome":"Taissy Dias Rossoni","cupom":"TAYDIAS","instagram":"taissydias","telefone":"27992023880","email":"contato.tayrossoni@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Mateus","estado":"ES","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-10","data_ultimo_pedido":null,"dias_no_time":77,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Tiktok","categoria_mes":null,"followup":null,"obs":null},{"id":"1772133839584x646607962663181600","nome":"Talita Cagnoni","cupom":"TALITACAGNONI","instagram":"talitacagnonipersonal","telefone":"61996397177","email":"consultoriatalitacagnoni@outlook.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Formosa","estado":"GO","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-03-31","data_ultimo_pedido":null,"dias_no_time":28,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1767978277322x176952182941558340","nome":"Tamara Rocha de Freitas Biava","cupom":"TAMARA","instagram":"tamararfreitas","telefone":"48988386560","email":"contatotamaradefreitas@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Criciúma","estado":"SC","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Sim, eu sou.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1764529323568x553644608314257660","nome":"Tamiris Barbetta","cupom":"TAMIRIS","instagram":"eusoutamiris","telefone":"35997220703","email":"tamirisbarbetta@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Guaxupé","estado":"MG","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Tiktok","categoria_mes":null,"followup":null,"obs":null},{"id":"1775596947309x401488282897840600","nome":"Tatiana Gonçalves","cupom":"TATIANAGONCALVES","instagram":"tatianagoncalvesoficial","telefone":"31986448233","email":"tatianainsta36@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Belo Horizonte","estado":"MG","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769256867035x764486312015502000","nome":"Tatiand Ferreira","cupom":"TATILOVERS","instagram":"thatianexd","telefone":"11979633585","email":"ugc.bytatiane@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1743095665786x433056844719849500","nome":"Tays Avila Ribeiro","cupom":"TAYS","instagram":"tays.avila","telefone":"12997382022","email":"taysavila.contato@outlook.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Sebastião","estado":"SP","vendas":17,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776082700813x653305118897629300","nome":"Thacilla Ribeiro","cupom":"THACILLA","instagram":"thacillaribeiro","telefone":"21971732724","email":"contatothacilla@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio De Janeiro","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-13","data_ultimo_pedido":null,"dias_no_time":15,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1768855852475x801046941533576200","nome":"Thainara Lima França Oliveira","cupom":"THAINARALIMA","instagram":"thainaralimat","telefone":"85999383338","email":"thainaralimaa@hotmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Fortaleza","estado":"CE","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1746652091670x278695933262168060","nome":"Thais Sandrini","cupom":"THAIS5","instagram":"thaissandrinii","telefone":"47988707013","email":"thaissandrini.ts@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Trombudo Central","estado":"SC","vendas":11,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1770945630703x647052009205007000","nome":"Thaissa Rodrigues","cupom":"THAYFIT","instagram":"thaay.fitt","telefone":"44997051584","email":"thaayrss@outlook.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Paranavaí","estado":"PR","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1760704510776x715581526948872000","nome":"Thalia P Camacho Reis","cupom":"THACAMACHO","instagram":"thaacamacho","telefone":"11970751735","email":"openassessoria1@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Caetano Do Sul","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-15","data_ultimo_pedido":null,"dias_no_time":164,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Tiktok","categoria_mes":null,"followup":null,"obs":null},{"id":"1768256045019x994283446971763200","nome":"Thamara Pinho Batista","cupom":"ACHADOSDATHAM","instagram":"thamara.pinho","telefone":"21996796551","email":"achadosdatham@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio De Janeiro","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1762297956519x629942051134238500","nome":"Thamyres Rabello","cupom":"THAMSRABELLO","instagram":"thamsrabello","telefone":"21994251770","email":"contato.thamsrabello@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Petrópolis","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-15","data_ultimo_pedido":null,"dias_no_time":164,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1762392973386x840215553441057100","nome":"Thatiane Praia","cupom":"THATI","instagram":"thatipraia","telefone":"71991690229","email":"thatipraia@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Salvador","estado":"BA","vendas":4,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-15","data_ultimo_pedido":null,"dias_no_time":164,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1772553980731x204507905776067040","nome":"Thaynara Moreira Macedo","cupom":"THAYNARA","instagram":"thaynaranutricionista","telefone":"21969747151","email":"monarakini@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio De Janeiro","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-11","data_ultimo_pedido":null,"dias_no_time":17,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1758061457773x580604827221419500","nome":"Thaís Oliveira De Vasconcelos","cupom":"TATAV","instagram":"tatavdaily","telefone":"67993011919","email":"thais.odevasconcelos@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Campo Grande","estado":"MS","vendas":7,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-09-16","data_ultimo_pedido":null,"dias_no_time":224,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":null,"agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1757958021411x335291250618662900","nome":"Thaís Tocafundo Padilha","cupom":"THAPADILHA","instagram":"thatpadilha","telefone":"31994313199","email":"thaistpadilha@gmail.com","nivel":"Creator Blessy","status":"Curadoria","cidade":"São Paulo","estado":"SP","vendas":4,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-09-18","data_ultimo_pedido":null,"dias_no_time":222,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769017161830x176298889060910720","nome":"Thaíssa França Fernandes","cupom":"THAISSAF","instagram":"thaissafrancaf","telefone":"43988095254","email":"contatothaissafrancaf@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Londrina","estado":"PR","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773081478786x439322766458378750","nome":"Tifanny Carolina do Amaral Remunhã","cupom":"TIFANNY","instagram":"tifa.nny","telefone":"19971182701","email":"contatotifannyamaral@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Leme","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1731528193643x559011847818182660","nome":"Valentina Serikawa","cupom":"VALEN","instagram":"valeserikawa","telefone":"11933021796","email":"valeserikawacontato@gmail.com","nivel":"Creator Blessy","status":"Em análise","cidade":"Atibaia","estado":"SP","vendas":2,"saldo":0,"last_comission":20.0,"comissao_pct":20.0,"data_entrada":"2024-09-13","data_ultimo_pedido":null,"dias_no_time":593,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1742937245341x853739520684458000","nome":"Valéria Busetti","cupom":"NUTRIVALERIA","instagram":"nutri.valeriabusetti","telefone":"54991744267","email":"valeria_busetti@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Passo Fundo","estado":"RS","vendas":50,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":null,"data_ultimo_pedido":null,"dias_no_time":null,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1742665029208x636417184820625400","nome":"Vanessa Couto","cupom":"NESSA5","instagram":"nessa_beautydicas","telefone":"21996589422","email":"vrcouto8@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Rio de Janeiro","estado":"RJ","vendas":408,"saldo":0,"last_comission":0,"comissao_pct":20.0,"data_entrada":"1981-03-01","data_ultimo_pedido":null,"dias_no_time":16495,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1774013626511x703155310520285000","nome":"Vanessa Feitosa","cupom":"DAILYBYVAN","instagram":"dailybyvan","telefone":"81995134624","email":"contatovanessafeitoza@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Bento Do Una","estado":"PE","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1775536045225x485598492431955650","nome":"Vanessa Rodrigues","cupom":"NESSARODRIGUES","instagram":"nessarodriguesz","telefone":"15998331928","email":"contatovanessarodriguesz@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Votorantim","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1774402750615x272153926024520920","nome":"Victoria Cristina Costa de Noronha Covisi","cupom":"VICNORONHA","instagram":"viccnoronha","telefone":"47992710329","email":"vick.noronha@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Santo André","estado":"SP","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1774356738458x540735184619316700","nome":"Vithoria de Alencar Luz","cupom":"VITHORIAALUZ","instagram":"vithoriaaluz","telefone":"87991027214","email":"vithoriaalencar1@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Petrolina","estado":"PE","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-03-31","data_ultimo_pedido":null,"dias_no_time":28,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1760460609574x928483452161857400","nome":"Vitoria Belo","cupom":"BELO","instagram":"vitoriabelo","telefone":"11951317949","email":"contatovibelo@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":1,"saldo":0,"last_comission":10.0,"comissao_pct":10.0,"data_entrada":"2025-10-30","data_ultimo_pedido":null,"dias_no_time":180,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769448023689x654740887725046700","nome":"Vitoria Caroline Rodrigues de Matos","cupom":"VIMATOS","instagram":"_vimatos","telefone":"61995781848","email":"contato.vitoriacrmatos@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Brasília","estado":"DF","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1761319124403x532706315583908200","nome":"Vitoria Ribeiro Chiacchio","cupom":"VICHIACCHIO","instagram":"vitoria.chiacchio","telefone":"7193876630","email":"vitoria_chiacchio@outlook.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Lauro de Freitas","estado":"BA","vendas":2,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-10-30","data_ultimo_pedido":null,"dias_no_time":180,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1767390998287x494789850568475300","nome":"Vitória Margarida Simonetti","cupom":"MARGARIDA","instagram":"margarida.vii","telefone":"21992846716","email":"vitoriamargarida0@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Niterói","estado":"RJ","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Sim, eu sou.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1774302196551x860446197529893800","nome":"Vitória Ozuna Alabarces","cupom":"ALABARCESS","instagram":"alabarcess","telefone":"43984461427","email":"alabarcesscontato@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Londrina","estado":"PR","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Tiktok","categoria_mes":null,"followup":null,"obs":null},{"id":"1763403944628x516008625579205100","nome":"Viviane Jantsch","cupom":"VIVIJANTSCH","instagram":"vivijantsch","telefone":"51998848746","email":"vivijantsch@icloud.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Porto Alegre","estado":"RS","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1762447077328x303439960336346240","nome":"Wilana Maria Cordeiro","cupom":"WILANA","instagram":"_wilana","telefone":"32998597115","email":"cordeirowilana@hotmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São João Nepomuceno","estado":"MG","vendas":4,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-11-15","data_ultimo_pedido":null,"dias_no_time":164,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":null,"rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769452231184x849668352779649400","nome":"Yasmin Ambrosio","cupom":"YASMIN","instagram":"yasminambrosios","telefone":"48999645620","email":"yasminambrosiomkt@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Siderópolis","estado":"SC","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-13","data_ultimo_pedido":null,"dias_no_time":74,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1769803416859x961617659763397400","nome":"Yasmin Schimidt","cupom":"AYAS","instagram":"ayasminschimidt","telefone":"51994098004","email":"ayasminschimidt@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Porto Alegre","estado":"RS","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-02-11","data_ultimo_pedido":null,"dias_no_time":76,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1773887333762x770366413264748900","nome":"Yohanna Pimentel","cupom":"YOHANNA","instagram":"yohanna_pp","telefone":"85991644259","email":"yohannapp16@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"Fortaleza","estado":"CE","vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2026-04-10","data_ultimo_pedido":null,"dias_no_time":18,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1757443744427x670052077650051100","nome":"Yune Silva","cupom":"YUNE","instagram":"lm.yune","telefone":"11941986167","email":"yunebeauty@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":"São Paulo","estado":"SP","vendas":6,"saldo":0,"last_comission":0,"comissao_pct":10.0,"data_entrada":"2025-09-14","data_ultimo_pedido":null,"dias_no_time":226,"dias_sem_pedido":null,"is_nova_safra":false,"recebe_reposicao":"Recebe","bca_enviado":"Enviado","agenciado":"Não.","rede_principal":"Instagram","categoria_mes":null,"followup":null,"obs":null},{"id":"1776448904321x407124782722958000","nome":"bruna maria lazzaron rodrigues","cupom":null,"instagram":"brunalazzaron","telefone":null,"email":"blazzaron6@gmail.com","nivel":"Creator Blessy","status":"Ativa","cidade":null,"estado":null,"vendas":0,"saldo":0.0,"last_comission":0,"comissao_pct":0,"data_entrada":"2026-04-24","data_ultimo_pedido":null,"dias_no_time":4,"dias_sem_pedido":null,"is_nova_safra":true,"recebe_reposicao":"Não recebe","bca_enviado":null,"agenciado":null,"rede_principal":null,"categoria_mes":null,"followup":null,"obs":null}];
// ============================================================
// STORAGE ADAPTER
// Camadas, em ordem de preferência:
//   1. Supabase (sincroniza entre dispositivos e pessoas)  → quando lib disponível + URL+KEY configurados
//   2. window.storage (Claude artifact)                    → quando rodando dentro do Claude
//   3. localStorage (modo solo do navegador)               → fallback
// ============================================================
const STORAGE_PREFIX = "blessy_followup_edits:";
const HAS_CLAUDE_STORAGE = typeof window !== "undefined" && window.storage && typeof window.storage.set === "function";

// Detecta config Supabase: env var (Vercel) > localStorage (manual)
function getSupabaseConfig() {
  const envUrl = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_SUPABASE_URL) || null;
  const envKey = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || null;
  let lsUrl = null, lsKey = null;
  if (typeof localStorage !== "undefined") {
    lsUrl = localStorage.getItem("blessy:supabase_url");
    lsKey = localStorage.getItem("blessy:supabase_key");
  }
  return {
    url: envUrl || lsUrl || null,
    key: envKey || lsKey || null,
    fromEnv: !!(envUrl && envKey),
  };
}

// Carrega @supabase/supabase-js dinamicamente (não falha se não estiver disponível)
let supabaseLib = null;
let supabaseLibLoaded = false;
async function loadSupabaseLib() {
  if (supabaseLibLoaded) return supabaseLib;
  supabaseLibLoaded = true;
  try {
    supabaseLib = await import("@supabase/supabase-js");
    return supabaseLib;
  } catch (e) {
    return null;
  }
}

let supabaseClient = null;
async function initSupabaseClient() {
  const cfg = getSupabaseConfig();
  if (!cfg.url || !cfg.key) return null;
  const lib = await loadSupabaseLib();
  if (!lib) return null;
  try {
    supabaseClient = lib.createClient(cfg.url, cfg.key, {
      auth: { persistSession: false },
    });
    return supabaseClient;
  } catch (e) {
    console.error("Supabase init failed:", e);
    supabaseClient = null;
    return null;
  }
}

const TABLE = "kv";

const Storage = {
  get isCloud() { return !!supabaseClient; },
  getSupabaseConfig,
  init: initSupabaseClient,

  async list(prefix = STORAGE_PREFIX) {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from(TABLE)
          .select("key")
          .like("key", prefix + "%");
        if (error) throw error;
        return (data || []).map(r => r.key);
      } catch (e) {
        console.error("Supabase list failed:", e);
        return [];
      }
    }
    if (HAS_CLAUDE_STORAGE) {
      try {
        const r = await window.storage.list(prefix);
        return r?.keys || [];
      } catch (_) { return []; }
    }
    if (typeof localStorage === "undefined") return [];
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    return keys;
  },

  async get(key) {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from(TABLE)
          .select("value")
          .eq("key", key)
          .maybeSingle();
        if (error) throw error;
        return data ? { value: data.value } : null;
      } catch (e) {
        console.error("Supabase get failed:", e);
        return null;
      }
    }
    if (HAS_CLAUDE_STORAGE) {
      try { return await window.storage.get(key); } catch (_) { return null; }
    }
    if (typeof localStorage === "undefined") return null;
    const v = localStorage.getItem(key);
    return v ? { value: v } : null;
  },

  async set(key, value) {
    if (supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from(TABLE)
          .upsert({ key, value, updated_at: new Date().toISOString() });
        if (error) throw error;
        return;
      } catch (e) {
        console.error("Supabase set failed:", e);
        return;
      }
    }
    if (HAS_CLAUDE_STORAGE) {
      return window.storage.set(key, value);
    }
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, value);
  },

  async delete(key) {
    if (supabaseClient) {
      try {
        const { error } = await supabaseClient.from(TABLE).delete().eq("key", key);
        if (error) throw error;
        return;
      } catch (e) {
        console.error("Supabase delete failed:", e);
        return;
      }
    }
    if (HAS_CLAUDE_STORAGE) {
      try { return await window.storage.delete(key); } catch (_) {}
      return;
    }
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(key);
  },

  // Subscribe to realtime changes (Supabase only)
  subscribe(onChange) {
    if (!supabaseClient) return null;
    const channel = supabaseClient
      .channel("kv_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE },
        payload => {
          onChange(payload);
        },
      )
      .subscribe();
    return channel;
  },

  unsubscribe(channel) {
    if (supabaseClient && channel) {
      supabaseClient.removeChannel(channel);
    }
  },

  // Conecta manualmente (chamado pelo modal)
  async connect(url, key) {
    const lib = await loadSupabaseLib();
    if (!lib) {
      return { ok: false, error: "Biblioteca Supabase não disponível neste ambiente. Use o app publicado no Vercel." };
    }
    try {
      const test = lib.createClient(url, key, { auth: { persistSession: false } });
      const { error } = await test.from(TABLE).select("key").limit(1);
      if (error) throw new Error(error.message || "Erro ao conectar. Verifique se a tabela 'kv' existe.");
      localStorage.setItem("blessy:supabase_url", url);
      localStorage.setItem("blessy:supabase_key", key);
      supabaseClient = test;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || "Erro desconhecido" };
    }
  },

  disconnect() {
    localStorage.removeItem("blessy:supabase_url");
    localStorage.removeItem("blessy:supabase_key");
    supabaseClient = null;
  },
};

// ============================================================
// APP PRINCIPAL
// ============================================================
export default function FollowupBlessy() {
  // Carrega edições do storage
  const [edits, setEdits] = useState({});           // { creatorId: { categoria, followup, ... } }
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");

  // Mês corrente + histórico de meses fechados
  const [currentMonth, setCurrentMonth] = useState(todayMonthKey());
  const [history, setHistory] = useState({}); // { "2026-04": { creatorId: snapshot, ... }, ... }
  const [selectedHistMonth, setSelectedHistMonth] = useState(null);

  // Sincronização (Supabase)
  const [syncOpen, setSyncOpen] = useState(false);
  const [isCloud, setIsCloud] = useState(Storage.isCloud);

  // Filtros
  const [tab, setTab] = useState("nova_safra"); // nova_safra | veteranas | sem_data | todas | historico
  const [search, setSearch] = useState("");
  const [filterCategoria, setFilterCategoria] = useState(null);
  const [filterFollowup, setFilterFollowup] = useState(null);
  const [filterNivel, setFilterNivel] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);
  const [showOnlyPending, setShowOnlyPending] = useState(false);
  const [pageLimit, setPageLimit] = useState(40);

  // Hidrata edições + currentMonth + histórico do storage
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Inicializa Supabase (se configurado e disponível)
        await Storage.init();
        if (mounted) setIsCloud(Storage.isCloud);

        // Edits do mês corrente
        const keys = await Storage.list();
        const all = {};
        for (const k of keys) {
          try {
            const r = await Storage.get(k);
            if (r?.value) {
              const id = k.replace(new RegExp("^" + STORAGE_PREFIX), "");
              all[id] = JSON.parse(r.value);
            }
          } catch (_) {}
        }

        // currentMonth
        let cm = todayMonthKey();
        try {
          const cmR = await Storage.get("blessy_followup_meta:currentMonth");
          if (cmR?.value) cm = cmR.value;
        } catch (_) {}

        // Histórico
        const hist = {};
        try {
          const histKeys = await Storage.list("blessy_followup_history_month:");
          for (const k of histKeys) {
            try {
              const r = await Storage.get(k);
              if (r?.value) {
                const month = k.replace("blessy_followup_history_month:", "");
                hist[month] = JSON.parse(r.value);
              }
            } catch (_) {}
          }
        } catch (_) {}

        if (mounted) {
          setEdits(all);
          setCurrentMonth(cm);
          setHistory(hist);
          const months = Object.keys(hist).sort().reverse();
          if (months.length > 0) setSelectedHistMonth(months[0]);
          setHydrated(true);
        }
      } catch (e) {
        if (mounted) setHydrated(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Real-time: ouve mudanças no Supabase
  useEffect(() => {
    if (!isCloud) return;
    const channel = Storage.subscribe(payload => {
      const row = payload.new || payload.old;
      if (!row?.key) return;
      const { eventType } = payload;

      // Mudança em edits
      if (row.key.startsWith(STORAGE_PREFIX)) {
        const id = row.key.replace(STORAGE_PREFIX, "");
        if (eventType === "DELETE") {
          setEdits(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        } else {
          try {
            const value = JSON.parse(payload.new.value);
            setEdits(prev => ({ ...prev, [id]: value }));
          } catch (_) {}
        }
        return;
      }

      // Mudança em histórico
      if (row.key.startsWith("blessy_followup_history_month:")) {
        const month = row.key.replace("blessy_followup_history_month:", "");
        if (eventType === "DELETE") {
          setHistory(prev => {
            const next = { ...prev };
            delete next[month];
            return next;
          });
        } else {
          try {
            const value = JSON.parse(payload.new.value);
            setHistory(prev => ({ ...prev, [month]: value }));
          } catch (_) {}
        }
        return;
      }

      // currentMonth
      if (row.key === "blessy_followup_meta:currentMonth") {
        if (eventType !== "DELETE" && payload.new?.value) {
          setCurrentMonth(payload.new.value);
        }
      }
    });
    return () => Storage.unsubscribe(channel);
  }, [isCloud]);

  // Atualiza edição de uma Creator e persiste
  function updateEdit(creatorId, patch) {
    setEdits(prev => {
      const current = prev[creatorId] || {};
      const next = { ...current, ...patch };
      const updated = { ...prev, [creatorId]: next };
      setSaveStatus("saving");
      Storage.set(`${STORAGE_PREFIX}${creatorId}`, JSON.stringify(next))
        .then(() => setSaveStatus("saved"))
        .catch(() => setSaveStatus("error"));
      setTimeout(() => setSaveStatus("idle"), 1500);
      return updated;
    });
  }

  function markActedToday(creatorId) {
    const today = new Date().toISOString().slice(0, 10);
    updateEdit(creatorId, { data_ultima_acao: today });
  }

  // Reset edições (com confirmação)
  function resetAll() {
    if (!confirm("Apagar todas as edições salvas? Os dados originais voltam.")) return;
    Object.keys(edits).forEach(id => {
      Storage.delete(`${STORAGE_PREFIX}${id}`).catch(() => {});
    });
    setEdits({});
  }

  // Fecha o mês corrente: arquiva snapshot e zera campos do mês
  async function closeMonth() {
    const monthLabel = formatMonthKey(currentMonth);
    const next = nextMonthKey(currentMonth);
    const nextLabel = formatMonthKey(next);

    if (!confirm(
      `Fechar ${monthLabel}?\n\n` +
      `Suas anotações de categoria, follow-up, próxima ação, motivo, OBS e datas vão pro Histórico.\n` +
      `Nível e tags são mantidos (são transversais ao mês).\n\n` +
      `O painel vai zerar pra você começar ${nextLabel}.`
    )) return;

    // Monta snapshot do mês com os edits atuais
    const snapshot = {};
    for (const [id, e] of Object.entries(edits)) {
      const hasMonthData =
        e.categoria || e.followup || e.proxima_acao || e.motivo_nao_engajamento ||
        e.data_ultima_acao || e.data_ultima_resposta || e.obs || e.vendas_mes_manual;
      if (!hasMonthData) continue;
      snapshot[id] = {
        categoria: e.categoria || null,
        followup: e.followup || null,
        vendas_mes_manual: e.vendas_mes_manual || "",
        proxima_acao: e.proxima_acao || "",
        motivo_nao_engajamento: e.motivo_nao_engajamento || "",
        data_ultima_acao: e.data_ultima_acao || "",
        data_ultima_resposta: e.data_ultima_resposta || "",
        obs: e.obs || "",
      };
    }

    // Salva snapshot do mês
    try {
      await Storage.set(
        `blessy_followup_history_month:${currentMonth}`,
        JSON.stringify(snapshot),
      );
    } catch (e) {
      alert("Erro ao salvar histórico. Tente novamente.");
      return;
    }

    // Zera edits, mantém só nivel e tags
    const cleaned = {};
    for (const [id, e] of Object.entries(edits)) {
      const kept = {};
      if (e.nivel) kept.nivel = e.nivel;
      if (Array.isArray(e.tags) && e.tags.length > 0) kept.tags = e.tags;
      if (Object.keys(kept).length > 0) {
        cleaned[id] = kept;
        await Storage.set(`${STORAGE_PREFIX}${id}`, JSON.stringify(kept)).catch(() => {});
      } else {
        await Storage.delete(`${STORAGE_PREFIX}${id}`).catch(() => {});
      }
    }

    // Avança currentMonth
    await Storage.set("blessy_followup_meta:currentMonth", next).catch(() => {});

    // Atualiza state
    setEdits(cleaned);
    setHistory(h => ({ ...h, [currentMonth]: snapshot }));
    setCurrentMonth(next);
    setSelectedHistMonth(currentMonth);

    alert(`${monthLabel} fechado. ${nextLabel} começou.`);
  }

  // Migra dados locais (localStorage) pro Supabase quando conecta pela primeira vez
  async function migrateLocalToCloud() {
    if (!Storage.isCloud) return { migrated: 0 };
    let migrated = 0;
    try {
      // edits
      for (const [id, e] of Object.entries(edits)) {
        if (Object.keys(e).length === 0) continue;
        await Storage.set(`${STORAGE_PREFIX}${id}`, JSON.stringify(e));
        migrated++;
      }
      // history
      for (const [month, snap] of Object.entries(history)) {
        await Storage.set(`blessy_followup_history_month:${month}`, JSON.stringify(snap));
        migrated++;
      }
      // currentMonth
      await Storage.set("blessy_followup_meta:currentMonth", currentMonth);
    } catch (_) {}
    return { migrated };
  }

  async function handleSyncConnect(url, key, migrate) {
    const result = await Storage.connect(url, key);
    if (!result.ok) return result;
    setIsCloud(true);
    if (migrate) {
      await migrateLocalToCloud();
    }
    // Recarrega tudo do Supabase
    try {
      const keys = await Storage.list();
      const all = {};
      for (const k of keys) {
        try {
          const r = await Storage.get(k);
          if (r?.value) {
            const id = k.replace(new RegExp("^" + STORAGE_PREFIX), "");
            all[id] = JSON.parse(r.value);
          }
        } catch (_) {}
      }
      const cmR = await Storage.get("blessy_followup_meta:currentMonth");
      const cm = cmR?.value || todayMonthKey();
      const hist = {};
      const histKeys = await Storage.list("blessy_followup_history_month:");
      for (const k of histKeys) {
        const r = await Storage.get(k);
        if (r?.value) {
          const month = k.replace("blessy_followup_history_month:", "");
          hist[month] = JSON.parse(r.value);
        }
      }
      setEdits(all);
      setCurrentMonth(cm);
      setHistory(hist);
    } catch (_) {}
    return { ok: true };
  }

  function handleSyncDisconnect() {
    if (!confirm("Desconectar do Supabase? Você volta pro modo solo (localStorage do navegador). Os dados no Supabase ficam intactos.")) return;
    Storage.disconnect();
    setIsCloud(false);
  }

  // Aplica edições por cima dos dados base
  const merged = useMemo(() => {
    return CREATORS_DATA.map(c => {
      const e = edits[c.id] || {};
      return {
        ...c,
        _edits: e,
        _nivel: e.nivel ?? c.nivel,
        _categoria: e.categoria ?? c.categoria_mes ?? null,
        _followup: e.followup ?? c.followup ?? null,
      };
    });
  }, [edits]);

  // Filtragem
  const filtered = useMemo(() => {
    let list = merged;

    // Tab
    if (tab === "nova_safra") {
      list = list.filter(c => c.is_nova_safra === true);
    } else if (tab === "veteranas") {
      list = list.filter(c => c.is_nova_safra === false && c.dias_no_time != null);
    } else if (tab === "sem_data") {
      list = list.filter(c => c.dias_no_time == null);
    }

    if (filterCategoria) list = list.filter(c => c._categoria === filterCategoria);
    if (filterFollowup)  list = list.filter(c => c._followup === filterFollowup);
    if (filterNivel)     list = list.filter(c => c._nivel === filterNivel);
    if (filterStatus)    list = list.filter(c => c.status === filterStatus);

    if (showOnlyPending) {
      list = list.filter(c => {
        if (c._followup === "encerrado" || c._followup === "remover Creator") return false;
        return true;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(c => {
        const e = c._edits || {};
        const tags = Array.isArray(e.tags) ? e.tags.join(" ").toLowerCase() : "";
        return (
          (c.nome || "").toLowerCase().includes(q) ||
          (c.cupom || "").toLowerCase().includes(q) ||
          (c.instagram || "").toLowerCase().includes(q) ||
          (c.cidade || "").toLowerCase().includes(q) ||
          tags.includes(q)
        );
      });
    }

    return list;
  }, [merged, tab, search, filterCategoria, filterFollowup, filterNivel, filterStatus, showOnlyPending]);

  const visible = filtered.slice(0, pageLimit);

  // KPIs (sobre o filtro de tab atual, antes dos demais filtros)
  const tabBase = useMemo(() => {
    if (tab === "nova_safra") return merged.filter(c => c.is_nova_safra === true);
    if (tab === "veteranas") return merged.filter(c => c.is_nova_safra === false && c.dias_no_time != null);
    if (tab === "sem_data")  return merged.filter(c => c.dias_no_time == null);
    return merged;
  }, [merged, tab]);

  const kpis = useMemo(() => {
    const ativas = tabBase.filter(c => c.status === "Ativa").length;
    const vendas = tabBase.reduce((a, c) => a + (c.vendas || 0), 0);
    const cv = tabBase.filter(c => c._categoria === "POSTOU C/VENDA").length;
    const sv = tabBase.filter(c => c._categoria === "POSTOU S/VENDA").length;
    const conv = (cv + sv) > 0 ? cv / (cv + sv) : 0;
    const pend = tabBase.filter(c => ["em andamento", "sem retorno", "conferindo rastreio"].includes(c._followup)).length;
    const semCat = tabBase.filter(c => !c._categoria).length;
    return { ativas, vendas, conv, pend, semCat };
  }, [tabBase]);

  const distrCategorias = useMemo(() =>
    CATEGORIAS.map(cat => ({
      ...cat,
      count: tabBase.filter(c => c._categoria === cat.value).length,
    })),
  [tabBase]);

  const distrFollowup = useMemo(() =>
    FOLLOWUPS.map(fu => ({
      ...fu,
      count: tabBase.filter(c => c._followup === fu.value).length,
    })),
  [tabBase]);

  const totalCounts = {
    nova_safra: merged.filter(c => c.is_nova_safra === true).length,
    veteranas: merged.filter(c => c.is_nova_safra === false && c.dias_no_time != null).length,
    sem_data: merged.filter(c => c.dias_no_time == null).length,
    todas: merged.length,
  };

  // Export edições em CSV
  function exportEdicoes() {
    const rows = [["cupom", "nome", "instagram", "telefone", "nivel", "categoria_mes", "status_followup", "vendas_mes_manual", "tags", "proxima_acao", "motivo_nao_engajamento", "data_ultima_acao", "data_ultima_resposta", "obs"]];
    merged.forEach(c => {
      const e = c._edits || {};
      const hasEdit = Object.keys(e).length > 0;
      if (!hasEdit) return;
      const tagsStr = Array.isArray(e.tags) ? e.tags.join(" | ") : "";
      rows.push([
        c.cupom || "",
        c.nome || "",
        c.instagram || "",
        c.telefone || "",
        c._nivel || "",
        c._categoria || "",
        c._followup || "",
        e.vendas_mes_manual ?? "",
        tagsStr,
        (e.proxima_acao ?? "").replace(/\n/g, " "),
        (e.motivo_nao_engajamento ?? "").replace(/\n/g, " "),
        e.data_ultima_acao || "",
        e.data_ultima_resposta || "",
        (e.obs ?? "").replace(/\n/g, " "),
      ]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `followup_blessy_${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearFilters() {
    setSearch("");
    setFilterCategoria(null);
    setFilterFollowup(null);
    setFilterNivel(null);
    setFilterStatus(null);
    setShowOnlyPending(false);
  }

  const hasFilter = search || filterCategoria || filterFollowup || filterNivel || filterStatus || showOnlyPending;
  const totalEdits = Object.keys(edits).length;

  return (
    <div className="min-h-screen w-full" style={{ background: COLORS.paper, color: COLORS.ink }}>
      {/* Fontes */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Fraunces', Georgia, serif; font-optical-sizing: auto; }
        body, html { font-family: 'Manrope', system-ui, sans-serif; }
        * { font-family: inherit; }
        .font-display { font-family: 'Fraunces', Georgia, serif !important; }
        textarea, input, select, button { font-family: 'Manrope', system-ui, sans-serif; }
      `}</style>

      {/* HEADER */}
      <header className="sticky top-0 z-20" style={{ background: COLORS.paper, borderBottom: `1px solid ${COLORS.border}` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] font-semibold" style={{ color: COLORS.greenLight }}>
                Blessy · Canal de Creators
              </div>
              <h1 className="font-display text-3xl sm:text-5xl font-semibold leading-[1.05] mt-2" style={{ color: COLORS.green }}>
                Painel de <span className="italic" style={{ color: COLORS.pink }}>Follow-up</span>
              </h1>
              <p className="text-xs mt-2" style={{ color: COLORS.muted }}>
                Mês de referência: <span style={{ color: COLORS.green, fontWeight: 600 }}>{formatMonthKey(currentMonth)}</span> · {totalCounts.todas} Creators ativas no canal
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSyncOpen(true)}
                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md border transition"
                style={{
                  background: isCloud ? COLORS.greenPale : "#fff",
                  borderColor: isCloud ? COLORS.greenLight : COLORS.border,
                  color: isCloud ? COLORS.green : COLORS.muted,
                  fontWeight: isCloud ? 600 : 500,
                }}
                title={isCloud ? "Sincronizado com a equipe via Supabase" : "Modo solo neste navegador"}
              >
                {isCloud ? <Cloud size={13} /> : <CloudOff size={13} />}
                {isCloud ? "sincronizado" : "sincronizar"}
              </button>
              {totalEdits > 0 && (
                <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: COLORS.greenPale, color: COLORS.green, border: `1px solid ${COLORS.greenLight}` }}>
                  {totalEdits} {totalEdits === 1 ? "Creator editada" : "Creators editadas"}
                </span>
              )}
              {saveStatus === "saving" && (
                <span className="text-[11px]" style={{ color: COLORS.muted }}>salvando…</span>
              )}
              {saveStatus === "saved" && (
                <span className="text-[11px]" style={{ color: COLORS.green }}>salvo</span>
              )}
              <button
                onClick={exportEdicoes}
                disabled={totalEdits === 0}
                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md border transition disabled:opacity-40"
                style={{ background: "#fff", borderColor: COLORS.border, color: COLORS.ink }}
              >
                <Download size={13} /> exportar
              </button>
              <button
                onClick={closeMonth}
                disabled={totalEdits === 0}
                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md border transition disabled:opacity-40"
                style={{ background: COLORS.pinkSoft, borderColor: COLORS.pink, color: COLORS.pinkDeep, fontWeight: 600 }}
                title={`Arquiva ${formatMonthKey(currentMonth)} no histórico e zera o painel`}
              >
                <Archive size={13} /> fechar {formatMonthKey(currentMonth).split("/")[0]}
              </button>
              <button
                onClick={resetAll}
                disabled={totalEdits === 0}
                className="inline-flex items-center gap-1 text-xs px-2 py-1.5 rounded-md border transition disabled:opacity-40"
                style={{ background: "#fff", borderColor: COLORS.border, color: COLORS.muted }}
                title="Apaga todas as edições salvas"
              >
                <RotateCcw size={13} />
              </button>
            </div>
          </div>

          {/* DISTRIBUIÇÕES COMPACTAS COLORIDAS */}
          <div className="grid md:grid-cols-2 gap-x-6 gap-y-2 mt-4">
            <DistribCompact title="Categoria do mês" data={distrCategorias} total={tabBase.length} />
            <DistribCompact title="Status follow-up" data={distrFollowup} total={tabBase.length} />
          </div>
        </div>

        {/* TABS */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          {[
            { id: "nova_safra", label: "Nova Safra", count: totalCounts.nova_safra },
            { id: "veteranas",  label: "Veteranas",  count: totalCounts.veteranas },
            { id: "sem_data",   label: "Sem data",   count: totalCounts.sem_data },
            { id: "todas",      label: "Todas",      count: totalCounts.todas },
            { id: "historico",  label: "Histórico",  count: Object.keys(history).length, separator: true },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setPageLimit(40); }}
              className="relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition flex items-center gap-1.5"
              style={{
                color: tab === t.id ? COLORS.green : COLORS.muted,
                fontWeight: tab === t.id ? 600 : 500,
                marginLeft: t.separator ? "auto" : 0,
              }}
            >
              {t.id === "historico" && <Clock size={13} />}
              {t.label}
              <span className="text-[11px] font-mono" style={{ color: tab === t.id ? COLORS.green : COLORS.muted }}>
                {t.count}
              </span>
              {tab === t.id && (
                <span className="absolute bottom-0 left-3 right-3 h-[2px]" style={{ background: COLORS.green }} />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* FILTROS — só aparece nas tabs normais */}
      {tab !== "historico" && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-4">
        <div
          className="flex items-center gap-3 flex-wrap p-3 rounded-xl"
          style={{ background: "#fff", border: `1px solid ${COLORS.border}` }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search size={14} style={{ color: COLORS.muted }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="buscar por nome, cupom, @ ou cidade…"
              className="text-sm bg-transparent outline-none flex-1"
              style={{ color: COLORS.ink }}
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <PlainSelect value={filterCategoria} options={CATEGORIAS.map(c => c.value)} onChange={setFilterCategoria} placeholder="Categoria" />
            <PlainSelect value={filterFollowup} options={FOLLOWUPS.map(f => f.value)} onChange={setFilterFollowup} placeholder="Follow-up" />
            <PlainSelect value={filterNivel} options={NIVEIS} onChange={setFilterNivel} placeholder="Nível" />
            <PlainSelect value={filterStatus} options={STATUS_LIST} onChange={setFilterStatus} placeholder="Status" />

            <label className="text-xs flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyPending}
                onChange={e => setShowOnlyPending(e.target.checked)}
                className="accent-green-800"
              />
              só pendências
            </label>

            {hasFilter && (
              <button
                onClick={clearFilters}
                className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-stone-50"
                style={{ color: COLORS.muted }}
              >
                <X size={12} /> limpar
              </button>
            )}
          </div>
        </div>

        <div className="text-xs mt-2 px-1" style={{ color: COLORS.muted }}>
          Mostrando {visible.length} de {filtered.length} Creators
          {filtered.length > pageLimit && (
            <button
              onClick={() => setPageLimit(p => p + 40)}
              className="ml-3 underline hover:no-underline"
              style={{ color: COLORS.green }}
            >
              carregar mais 40
            </button>
          )}
        </div>
      </section>
      )}

      {/* LISTA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        {!hydrated && (
          <div className="text-center py-12 text-sm" style={{ color: COLORS.muted }}>
            carregando suas edições…
          </div>
        )}

        {/* MODO HISTÓRICO */}
        {hydrated && tab === "historico" && (
          <div>
            {Object.keys(history).length === 0 ? (
              <div className="text-center py-16 rounded-xl" style={{ background: "#fff", border: `1px solid ${COLORS.border}` }}>
                <Archive size={28} className="mx-auto" style={{ color: COLORS.muted }} />
                <p className="mt-2 text-sm" style={{ color: COLORS.muted }}>
                  Nenhum mês fechado ainda.
                </p>
                <p className="mt-1 text-xs" style={{ color: COLORS.muted }}>
                  Quando você clicar em "fechar {formatMonthKey(currentMonth).split("/")[0]}" no header, o snapshot daquele mês aparece aqui.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: COLORS.muted }}>
                    Selecionar mês:
                  </span>
                  {Object.keys(history).sort().reverse().map(month => (
                    <button
                      key={month}
                      onClick={() => setSelectedHistMonth(month)}
                      className="text-xs px-3 py-1.5 rounded-md border transition"
                      style={{
                        background: selectedHistMonth === month ? COLORS.green : "#fff",
                        borderColor: selectedHistMonth === month ? COLORS.green : COLORS.border,
                        color: selectedHistMonth === month ? "#fff" : COLORS.ink,
                        fontWeight: selectedHistMonth === month ? 600 : 500,
                      }}
                    >
                      {formatMonthKey(month)}
                    </button>
                  ))}
                </div>

                {selectedHistMonth && history[selectedHistMonth] && (
                  <HistoryMonthView
                    month={selectedHistMonth}
                    snapshots={history[selectedHistMonth]}
                    creatorsBase={CREATORS_DATA}
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* MODO NORMAL (filtros + cards editáveis) */}
        {hydrated && tab !== "historico" && filtered.length === 0 && (
          <div className="text-center py-16 rounded-xl" style={{ background: "#fff", border: `1px solid ${COLORS.border}` }}>
            <FilterIcon size={28} className="mx-auto" style={{ color: COLORS.muted }} />
            <p className="mt-2 text-sm" style={{ color: COLORS.muted }}>
              Nenhuma Creator atende a esses filtros.
            </p>
            {hasFilter && (
              <button onClick={clearFilters} className="mt-2 text-xs underline" style={{ color: COLORS.green }}>
                limpar filtros
              </button>
            )}
          </div>
        )}

        {hydrated && tab !== "historico" && (
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            }}
          >
            {visible.map(c => (
              <CreatorCard
                key={c.id}
                creator={c}
                edits={edits[c.id] || {}}
                onEdit={patch => updateEdit(c.id, patch)}
                onMarkActed={() => markActedToday(c.id)}
              />
            ))}
          </div>
        )}

        {hydrated && tab !== "historico" && filtered.length > visible.length && (
          <div className="text-center mt-6">
            <button
              onClick={() => setPageLimit(p => p + 40)}
              className="text-sm px-5 py-2 rounded-md border hover:bg-stone-50"
              style={{ borderColor: COLORS.border, color: COLORS.ink, background: "#fff" }}
            >
              carregar mais ({filtered.length - visible.length} restantes)
            </button>
          </div>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-6 text-[11px]" style={{ color: COLORS.muted, borderTop: `1px solid ${COLORS.border}` }}>
        Suas edições ficam salvas {isCloud ? "no Supabase, sincronizadas com toda a equipe" : "no navegador automaticamente"}. Use "exportar" pra gerar um CSV das mudanças.
      </footer>

      {syncOpen && (
        <SyncModal
          isCloud={isCloud}
          onClose={() => setSyncOpen(false)}
          onConnect={handleSyncConnect}
          onDisconnect={handleSyncDisconnect}
          totalLocalEdits={Object.keys(edits).length}
          totalLocalHistory={Object.keys(history).length}
        />
      )}
    </div>
  );
}

// ============================================================
// DISTRIB COMPACT — distribuição colorida e alinhada pro header
// ============================================================
function DistribCompact({ title, data, total }) {
  return (
    <div>
      <div className="mb-1.5 pb-1 border-b" style={{ borderColor: COLORS.border }}>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: COLORS.green }}>
          {title}
        </h3>
      </div>
      <div className="flex flex-col gap-1">
        {data.map(d => {
          const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
          return (
            <div
              key={d.value}
              className="grid items-center gap-2 text-[11px]"
              style={{ gridTemplateColumns: "1fr 28px 36px" }}
            >
              <span
                className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide leading-tight truncate"
                style={{
                  background: d.bg,
                  color: d.fg,
                  border: `1px solid ${d.border}`,
                }}
                title={d.value}
              >
                {d.value}
              </span>
              <span
                className="font-mono font-semibold text-right tabular-nums"
                style={{ color: COLORS.ink }}
              >
                {d.count}
              </span>
              <span
                className="text-right tabular-nums"
                style={{ color: COLORS.muted }}
              >
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// HISTORY MONTH VIEW — visualização read-only de um mês fechado
// ============================================================
function HistoryMonthView({ month, snapshots, creatorsBase }) {
  // Distribuições do mês fechado
  const distrCat = CATEGORIAS.map(cat => ({
    ...cat,
    count: Object.values(snapshots).filter(s => s.categoria === cat.value).length,
  }));
  const distrFu = FOLLOWUPS.map(fu => ({
    ...fu,
    count: Object.values(snapshots).filter(s => s.followup === fu.value).length,
  }));

  // Lookup map id → creator base
  const baseMap = {};
  for (const c of creatorsBase) baseMap[c.id] = c;

  const items = Object.entries(snapshots)
    .map(([id, snap]) => ({ id, snap, base: baseMap[id] }))
    .filter(x => x.base)
    .sort((a, b) => (b.snap.vendas_mes_manual || 0) - (a.snap.vendas_mes_manual || 0));

  return (
    <div>
      {/* Distribuições do mês */}
      <div className="grid md:grid-cols-2 gap-x-6 gap-y-2 mb-5 p-4 rounded-xl" style={{ background: "#fff", border: `1px solid ${COLORS.border}` }}>
        <DistribCompact title={`Categoria do mês · ${formatMonthKey(month)}`} data={distrCat} total={items.length} />
        <DistribCompact title={`Status follow-up · ${formatMonthKey(month)}`} data={distrFu} total={items.length} />
      </div>

      <div className="text-xs mb-3 px-1" style={{ color: COLORS.muted }}>
        {items.length} {items.length === 1 ? "Creator com registro" : "Creators com registro"} em {formatMonthKey(month)} · visualização somente leitura
      </div>

      {items.length === 0 ? (
        <div className="text-center py-10 text-sm" style={{ color: COLORS.muted }}>
          Nenhuma Creator teve dados registrados nesse mês.
        </div>
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}
        >
          {items.map(({ id, snap, base }) => (
            <HistoryCard key={id} creator={base} snapshot={snap} />
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryCard({ creator, snapshot }) {
  const cat = CATEGORIA_MAP[snapshot.categoria];
  const fu = FOLLOWUP_MAP[snapshot.followup];

  return (
    <div
      className="rounded-xl px-3 py-2.5 flex flex-col gap-1.5"
      style={{ background: "#fff", border: `1px solid ${COLORS.border}` }}
    >
      <div className="min-w-0">
        <h3 className="font-display text-base font-semibold leading-tight truncate" style={{ color: COLORS.ink }} title={creator.nome}>
          {creator.nome}
        </h3>
        <div className="flex items-center gap-1 text-[11px] truncate" style={{ color: COLORS.muted }}>
          {creator.instagram && <span className="truncate">@{creator.instagram}</span>}
          {creator.cupom && (
            <>
              <span>·</span>
              <span className="font-mono uppercase tracking-wider text-[10px] shrink-0">{creator.cupom}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <Pill option={cat} />
        <Pill option={fu} />
      </div>

      {snapshot.vendas_mes_manual && (
        <div
          className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-md self-start"
          style={{ background: COLORS.greenPale, color: COLORS.green }}
        >
          <span className="font-semibold">{snapshot.vendas_mes_manual}</span> vendas registradas
        </div>
      )}

      {snapshot.proxima_acao && (
        <div className="text-[11px]">
          <div className="text-[9px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: COLORS.muted }}>Ação</div>
          <div style={{ color: COLORS.ink }}>{snapshot.proxima_acao}</div>
        </div>
      )}

      {snapshot.motivo_nao_engajamento && (
        <div className="text-[11px]">
          <div className="text-[9px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: COLORS.muted }}>Motivo</div>
          <div style={{ color: COLORS.ink }}>{snapshot.motivo_nao_engajamento}</div>
        </div>
      )}

      {snapshot.obs && (
        <div className="text-[11px]">
          <div className="text-[9px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: COLORS.muted }}>OBS</div>
          <div style={{ color: COLORS.ink }}>{snapshot.obs}</div>
        </div>
      )}

      {(snapshot.data_ultima_acao || snapshot.data_ultima_resposta) && (
        <div className="text-[10px] flex items-center gap-2 pt-1 border-t" style={{ borderColor: COLORS.border, color: COLORS.muted }}>
          {snapshot.data_ultima_acao && <span>contato: {formatDate(snapshot.data_ultima_acao)}</span>}
          {snapshot.data_ultima_resposta && <span>· resposta: {formatDate(snapshot.data_ultima_resposta)}</span>}
        </div>
      )}
    </div>
  );
}

// ============================================================
// SYNC MODAL — configuração de Supabase
// ============================================================
const SUPABASE_SQL = `-- Cole isso no SQL Editor do Supabase e execute
create table if not exists kv (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

alter table kv enable row level security;

drop policy if exists "anyone read" on kv;
drop policy if exists "anyone insert" on kv;
drop policy if exists "anyone update" on kv;
drop policy if exists "anyone delete" on kv;

create policy "anyone read" on kv for select using (true);
create policy "anyone insert" on kv for insert with check (true);
create policy "anyone update" on kv for update using (true);
create policy "anyone delete" on kv for delete using (true);

-- Habilita realtime
alter publication supabase_realtime add table kv;`;

function SyncModal({ isCloud, onClose, onConnect, onDisconnect, totalLocalEdits, totalLocalHistory }) {
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [migrate, setMigrate] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  function copySQL() {
    navigator.clipboard.writeText(SUPABASE_SQL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  async function handleConnect() {
    setError(null);
    if (!url.trim() || !key.trim()) {
      setError("Cole a URL e a anon key.");
      return;
    }
    setConnecting(true);
    const res = await onConnect(url.trim(), key.trim(), migrate);
    setConnecting(false);
    if (res.ok) {
      onClose();
    } else {
      setError(res.error || "Erro ao conectar.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4"
      style={{ background: "rgba(27, 41, 32, 0.55)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl shadow-2xl"
        style={{ background: COLORS.paper, border: `1px solid ${COLORS.borderStrong}` }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b flex items-center justify-between" style={{ borderColor: COLORS.border }}>
          <div>
            <h2 className="font-display text-2xl font-semibold" style={{ color: COLORS.green }}>
              Sincronizar com a equipe
            </h2>
            <p className="text-xs mt-1" style={{ color: COLORS.muted }}>
              {isCloud
                ? "Conectado ao Supabase. Suas edições estão sincronizadas em tempo real."
                : "Conecte um Supabase grátis pra editar de qualquer dispositivo e dar acesso ao Felipe, Davi e ao time."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-stone-100"
            style={{ color: COLORS.muted }}
          >
            <X size={18} />
          </button>
        </div>

        {isCloud ? (
          <div className="px-6 py-5">
            <div
              className="flex items-center gap-3 p-4 rounded-lg mb-4"
              style={{ background: COLORS.greenPale, border: `1px solid ${COLORS.greenLight}` }}
            >
              <Cloud size={24} style={{ color: COLORS.green }} />
              <div>
                <div className="text-sm font-semibold" style={{ color: COLORS.green }}>
                  Sincronizado em tempo real
                </div>
                <div className="text-xs mt-0.5" style={{ color: COLORS.muted }}>
                  Suas edições aparecem instantaneamente em qualquer dispositivo conectado.
                </div>
              </div>
            </div>

            <div className="text-xs space-y-2" style={{ color: COLORS.ink }}>
              <p><strong>Pra dar acesso a outras pessoas do time:</strong></p>
              <p>Compartilha o link da Vercel (ex: <code className="text-[11px] px-1 py-0.5 rounded" style={{ background: COLORS.paperDeep }}>painel-followup-blessy.vercel.app</code>) com quem precisa.</p>
              <p style={{ color: COLORS.muted }}>
                Importante: se você usou variáveis de ambiente no Vercel, todo mundo já entra sincronizado. Se você configurou só neste navegador, cada pessoa precisa colar URL + KEY na máquina dela (não recomendado pra equipe).
              </p>
            </div>

            <button
              onClick={onDisconnect}
              className="mt-5 text-xs px-3 py-1.5 rounded-md border transition hover:bg-stone-50"
              style={{ borderColor: COLORS.border, color: COLORS.red }}
            >
              desconectar
            </button>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-5">
            {/* PASSO 1: Criar Supabase */}
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold mb-2" style={{ color: COLORS.green }}>
                Passo 1 · Criar conta Supabase
              </div>
              <ol className="text-xs space-y-1.5 list-decimal pl-5" style={{ color: COLORS.ink }}>
                <li>Acessa <a href="https://supabase.com" target="_blank" rel="noreferrer" className="underline font-semibold" style={{ color: COLORS.green }}>supabase.com</a> e cria conta (login com GitHub é o mais rápido)</li>
                <li>Clica em <strong>New Project</strong>. Escolhe nome, senha forte (anota), região mais próxima (South America - São Paulo). Aguarda ~2min até ficar pronto.</li>
              </ol>
            </div>

            {/* PASSO 2: Rodar SQL */}
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold mb-2" style={{ color: COLORS.green }}>
                Passo 2 · Criar a tabela
              </div>
              <p className="text-xs mb-2" style={{ color: COLORS.ink }}>
                No menu lateral do Supabase, clica em <strong>SQL Editor</strong> → <strong>New query</strong>. Cola o SQL abaixo e clica em Run.
              </p>
              <div
                className="relative rounded-lg overflow-hidden"
                style={{ background: COLORS.greenDeep, border: `1px solid ${COLORS.green}` }}
              >
                <button
                  onClick={copySQL}
                  className="absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition"
                  style={{ background: copied ? COLORS.greenPale : "rgba(255,255,255,0.15)", color: copied ? COLORS.green : "#fff" }}
                >
                  {copied ? <><Check size={11} /> copiado</> : <><Copy size={11} /> copiar SQL</>}
                </button>
                <pre className="text-[10px] font-mono p-3 pr-20 overflow-x-auto" style={{ color: COLORS.yellow, lineHeight: 1.5 }}>
{SUPABASE_SQL}
                </pre>
              </div>
            </div>

            {/* PASSO 3: Pegar credenciais */}
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold mb-2" style={{ color: COLORS.green }}>
                Passo 3 · Copiar URL e key
              </div>
              <p className="text-xs" style={{ color: COLORS.ink }}>
                No Supabase, vai em <strong>Settings → API</strong>. Copia o <strong>Project URL</strong> e a <strong>anon public</strong> key (a primeira chave grande).
              </p>
            </div>

            {/* PASSO 4: Conectar */}
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold mb-2" style={{ color: COLORS.green }}>
                Passo 4 · Colar e conectar
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="Project URL (https://xxx.supabase.co)"
                  className="w-full text-sm px-3 py-2 rounded-md border outline-none focus:ring-2"
                  style={{ background: "#fff", borderColor: COLORS.border, color: COLORS.ink }}
                />
                <input
                  type="text"
                  value={key}
                  onChange={e => setKey(e.target.value)}
                  placeholder="anon public key (eyJhbGciOi...)"
                  className="w-full text-sm px-3 py-2 rounded-md border outline-none focus:ring-2"
                  style={{ background: "#fff", borderColor: COLORS.border, color: COLORS.ink }}
                />

                {(totalLocalEdits > 0 || totalLocalHistory > 0) && (
                  <label className="flex items-center gap-2 text-xs cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={migrate}
                      onChange={e => setMigrate(e.target.checked)}
                      className="accent-green-800"
                    />
                    <span style={{ color: COLORS.ink }}>
                      Migrar minhas edições atuais ({totalLocalEdits} {totalLocalEdits === 1 ? "Creator" : "Creators"}{totalLocalHistory > 0 ? ` + ${totalLocalHistory} mês fechado` : ""}) pro Supabase
                    </span>
                  </label>
                )}

                {error && (
                  <div className="text-xs p-2 rounded-md" style={{ background: COLORS.redPale, color: COLORS.red }}>
                    {error}
                  </div>
                )}

                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-md font-semibold transition disabled:opacity-60"
                  style={{ background: COLORS.green, color: "#fff" }}
                >
                  <Cloud size={14} />
                  {connecting ? "conectando..." : "conectar e sincronizar"}
                </button>
              </div>
            </div>

            {/* AVANÇADO: Vercel env vars */}
            <details className="text-xs" style={{ color: COLORS.muted }}>
              <summary className="cursor-pointer hover:underline" style={{ color: COLORS.green, fontWeight: 600 }}>
                Pra todo mundo do time entrar sincronizado sem configurar (recomendado)
              </summary>
              <div className="mt-3 space-y-2 pl-2 border-l-2" style={{ borderColor: COLORS.border }}>
                <p>Em vez de cada pessoa colar URL/KEY no navegador dela, coloca como variáveis de ambiente no Vercel uma vez só. Aí qualquer um que abrir o link já entra sincronizado.</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Abre o projeto no Vercel</li>
                  <li>Vai em <strong>Settings → Environment Variables</strong></li>
                  <li>Adiciona duas variáveis:
                    <ul className="list-disc pl-5 mt-1">
                      <li><code className="text-[10px] px-1 py-0.5 rounded" style={{ background: COLORS.paperDeep, color: COLORS.ink }}>VITE_SUPABASE_URL</code> = (Project URL)</li>
                      <li><code className="text-[10px] px-1 py-0.5 rounded" style={{ background: COLORS.paperDeep, color: COLORS.ink }}>VITE_SUPABASE_ANON_KEY</code> = (anon public)</li>
                    </ul>
                  </li>
                  <li>Volta em Deployments e clica em <strong>Redeploy</strong> no último</li>
                </ol>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
