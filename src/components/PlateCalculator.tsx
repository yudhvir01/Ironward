import { useState } from "react";
import { loadBar, saveBar } from "../lib/local";
import { BARS, plateStyle, platesFor } from "../lib/plates";
import { getUnit, toUnit } from "../lib/units";
import { Sheet } from "./Sheet";

// Works entirely in the unit on screen (kg plates or lb plates).
export function PlateCalculator({ initialKg, onClose }: { initialKg: number | null; onClose: () => void }) {
  const unit = getUnit();
  const [bar, setBar] = useState(loadBar(unit));
  const [total, setTotal] = useState(initialKg ? String(toUnit(initialKg)) : "");
  const kg = Number(total.replace(",", ".")) || 0;
  const { perSide, left } = platesFor(kg, bar, unit);

  return (
    <Sheet title="Plate calculator" onClose={onClose}>
      <label className="label">Total weight ({unit})</label>
      <input
        className="field font-display mt-1.5 text-center text-3xl font-black"
        type="number"
        inputMode="decimal"
        value={total}
        onChange={(e) => setTotal(e.target.value)}
        onFocus={(e) => e.target.select()}
        autoFocus={!initialKg}
      />
      <p className="label mt-4">Bar</p>
      <div className="mt-1.5 flex gap-1.5">
        {BARS[unit].map((b) => (
          <button
            key={b}
            onClick={() => {
              setBar(b);
              saveBar(unit, b);
            }}
            className={`flex-1 rounded-full py-2 text-sm font-bold ${bar === b ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}
          >
            {b ? `${b} ${unit}` : "None"}
          </button>
        ))}
      </div>

      <div className="mt-6 flex h-32 items-center justify-center rounded-2xl bg-muted/60 px-3">
        {kg > 0 && kg < bar ? (
          <p className="text-sm text-muted-foreground">Lighter than the bar.</p>
        ) : (
          <>
            {/* Collar side: plates from the outside in, mirrored. */}
            <div className="h-3 flex-1 rounded-l-full bg-zinc-400" />
            <div className="flex items-center gap-[3px]">
              {perSide.map((p, i) => (
                <div
                  key={i}
                  className="flex w-5 items-center justify-center rounded-md text-[9px] font-black text-black/70 [writing-mode:vertical-rl]"
                  style={{ height: plateStyle(unit, p).h, background: plateStyle(unit, p).color }}
                >
                  {p}
                </div>
              ))}
            </div>
            <div className="h-6 w-2 rounded-sm bg-zinc-500" />
            <div className="h-3 w-10 bg-zinc-400" />
          </>
        )}
      </div>

      <p className="font-display mt-4 text-center text-lg font-black">
        {perSide.length ? `Each side: ${perSide.join(" + ")}` : kg > 0 && kg >= bar ? "Just the bar" : "Enter a weight"}
      </p>
      {left > 0 && <p className="mt-1 text-center text-xs text-warn">{left} {unit} can't be made with standard plates — round to the nearest you can load.</p>}
    </Sheet>
  );
}
