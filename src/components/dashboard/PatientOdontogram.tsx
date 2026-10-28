import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ClipboardPlus } from "lucide-react";
import { useDentalChartEntries, useCreateDentalChartEntry, useUpdateDentalChartEntry } from "@/hooks/useDentalCharts";
import { useTreatments } from "@/hooks/useTreatments";
import { conditionProcedure, matchCatalogTreatment, useAddChartItemToPlan } from "@/hooks/useVisitFlow";
import { toothLabel, type Notation } from "@/lib/dentalPhases";

const CONDITIONS: { value: string; label: string; cls: string }[] = [
  { value: "healthy", label: "Healthy", cls: "bg-emerald-100 border-emerald-400 text-emerald-900" },
  { value: "decayed", label: "Caries", cls: "bg-red-200 border-red-500 text-red-900" },
  { value: "treated", label: "Restored", cls: "bg-slate-300 border-slate-500 text-slate-900" },
  { value: "root_canal", label: "Root canal", cls: "bg-orange-200 border-orange-500 text-orange-900" },
  { value: "crowned", label: "Crown", cls: "bg-amber-200 border-amber-500 text-amber-900" },
  { value: "implant", label: "Implant", cls: "bg-cyan-200 border-cyan-500 text-cyan-900" },
  { value: "missing", label: "Missing", cls: "bg-muted border-border text-muted-foreground" },
  { value: "fractured", label: "Fractured", cls: "bg-rose-200 border-rose-500 text-rose-900" },
  { value: "impacted", label: "Impacted", cls: "bg-purple-200 border-purple-500 text-purple-900" },
  { value: "veneer", label: "Veneer", cls: "bg-pink-200 border-pink-500 text-pink-900" },
];
const SURFACES = ["M", "O", "D", "B", "L"];
const UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const style = (c: string) => CONDITIONS.find((x) => x.value === c)?.cls || CONDITIONS[0].cls;
const label = (c: string) => CONDITIONS.find((x) => x.value === c)?.label || c;

export function PatientOdontogram({ patientId, canEdit }: { patientId: string; canEdit: boolean }) {
  const [notation, setNotation] = useState<Notation>("fdi");
  const { data: entries = [] } = useDentalChartEntries(patientId);
  const { data: treatments = [] } = useTreatments();
  const addToPlan = useAddChartItemToPlan();
  const createEntry = useCreateDentalChartEntry();
  const updateEntry = useUpdateDentalChartEntry();

  const teeth = useMemo(() => {
    const map: Record<number, { condition: string; surface: string | null; id: string }> = {};
    (entries as any[]).forEach((e) => {
      if (!map[e.tooth_number]) map[e.tooth_number] = { condition: e.condition || "healthy", surface: e.surface || null, id: e.id };
    });
    return map;
  }, [entries]);

  const suggest = (condition: string) => {
    const rule = conditionProcedure[condition];
    if (!rule) return null;
    const t = matchCatalogTreatment(condition, treatments as any);
    return { label: t?.name || rule.label, cost: t ? Number(t.price || 0) : 0, treatmentId: t?.id || null, priced: !!t };
  };

  const setCondition = (tooth: number, condition: string, surface: string) => {
    const cur = teeth[tooth];
    if (cur) updateEntry.mutate({ id: cur.id, patient_id: patientId, condition, ...(surface ? { surface } : {}) });
    else createEntry.mutate({
      patient_id: patientId, tooth_number: tooth, procedure: `Condition: ${label(condition)}`,
      condition, surface: surface || null, entry_date: new Date().toISOString().split("T")[0],
    });
  };

  const plan = (tooth: number, condition: string, surface: string) => {
    const s = suggest(condition);
    if (!s) return;
    addToPlan.mutate({
      patient_id: patientId, tooth_number: tooth,
      description: surface ? `${s.label} (${surface})` : s.label,
      treatment_id: s.treatmentId, estimated_cost: s.cost,
    });
  };

  const row = (list: number[]) => (
    <div className="grid grid-cols-16 gap-0.5 sm:gap-1" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}>
      {list.map((t) => (
        <ToothCell key={t} tooth={t} notation={notation} data={teeth[t]} canEdit={canEdit}
          suggest={suggest} onSet={setCondition} onPlan={plan} />
      ))}
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Odontogram</CardTitle>
          <CardDescription>Tap a tooth to chart a finding or add it to the treatment plan.</CardDescription>
        </div>
        <ToggleGroup type="single" size="sm" value={notation} onValueChange={(v) => v && setNotation(v as Notation)} aria-label="Tooth numbering">
          <ToggleGroupItem value="fdi" className="text-xs">FDI</ToggleGroupItem>
          <ToggleGroupItem value="universal" className="text-xs">Universal</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Upper</p>
        {row(UPPER)}
        <div className="border-t border-dashed border-border my-1" />
        {row(LOWER)}
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Lower</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-2">
          {CONDITIONS.map((c) => (
            <span key={c.value} className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className={`h-2.5 w-2.5 rounded-sm border ${c.cls}`} />{c.label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ToothCell({ tooth, notation, data, canEdit, suggest, onSet, onPlan }: {
  tooth: number; notation: Notation; data?: { condition: string; surface: string | null }; canEdit: boolean;
  suggest: (c: string) => { label: string; cost: number; priced: boolean } | null;
  onSet: (t: number, c: string, s: string) => void; onPlan: (t: number, c: string, s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [surfaces, setSurfaces] = useState<string[]>([]);
  const condition = data?.condition || "healthy";
  const sug = suggest(condition);
  const surface = surfaces.join("") || data?.surface || "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`Tooth ${toothLabel(tooth, notation)}: ${label(condition)}`}
          className={`relative aspect-[3/4] min-h-9 rounded border-2 text-[10px] sm:text-xs font-bold flex items-center justify-center overflow-hidden transition-shadow hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${style(condition)}`}>
          {toothLabel(tooth, notation)}
          {condition === "missing" && (
            <svg className="absolute inset-0 h-full w-full text-destructive" viewBox="0 0 10 10" preserveAspectRatio="none" aria-hidden>
              <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="0.8" />
            </svg>
          )}
          {condition === "root_canal" && <span className="absolute bottom-0.5 left-1/2 h-1/3 w-0.5 -translate-x-1/2 bg-orange-700" aria-hidden />}
          {data?.surface && <span className="absolute top-0 right-0.5 text-[7px] font-semibold opacity-70">{data.surface}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-3 space-y-2" side="top">
        <p className="text-xs font-semibold">Tooth {toothLabel(tooth, notation)} · {label(condition)}{data?.surface ? ` (${data.surface})` : ""}</p>
        {canEdit ? (
          <>
            <div className="flex gap-1">
              {SURFACES.map((s) => (
                <button key={s} type="button" onClick={() => setSurfaces((c) => c.includes(s) ? c.filter((x) => x !== s) : [...c, s])}
                  className={`h-7 flex-1 rounded border text-[10px] font-bold ${surfaces.includes(s) ? "bg-primary text-primary-foreground border-primary" : "border-border bg-muted/30"}`}>{s}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1">
              {CONDITIONS.map((c) => (
                <button key={c.value} type="button" onClick={() => { onSet(tooth, c.value, surfaces.join("")); setSurfaces([]); }}
                  className={`rounded border px-2 py-1 text-[11px] font-medium text-left ${c.cls} ${c.value === condition ? "ring-2 ring-ring" : ""}`}>{c.label}</button>
              ))}
            </div>
            {sug && (
              <Button size="sm" className="w-full h-auto py-1.5 text-xs whitespace-normal" onClick={() => { onPlan(tooth, condition, surface); setOpen(false); setSurfaces([]); }}>
                <ClipboardPlus className="mr-1 h-3.5 w-3.5 shrink-0" />
                Add to plan: {sug.label}{sug.priced ? ` · ₦${sug.cost.toLocaleString()}` : ""}
              </Button>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Only clinicians can update the chart.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
