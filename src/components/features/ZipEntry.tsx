"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CountyPicker, DistrictConfirm } from "@/components/features/CountyPicker";
import { track } from "@/lib/analytics";
import { writeLocation } from "@/lib/location";
import type { ResolveResult } from "@/types/app";

type Stage =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "split"; zip: string; districts: string[] }
  | { kind: "outOfCoverage" };

export function ZipEntry() {
  const router = useRouter();
  const [zip, setZip] = useState("");
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [showCounties, setShowCounties] = useState(false);

  async function resolve(zipCode: string, district?: string) {
    setStage({ kind: "loading" });
    try {
      const params = new URLSearchParams({ zip: zipCode });
      if (district) params.set("district", district);
      const res = await fetch(`/api/resolve?${params}`);
      if (!res.ok) {
        setStage({
          kind: "error",
          message:
            "We couldn't match that ZIP. Double-check it, or pick your county instead.",
        });
        return;
      }
      const data: ResolveResult = await res.json();

      if (!data.inCoverage) {
        setStage({ kind: "outOfCoverage" });
        return;
      }
      if (data.needsCountyConfirm && data.candidateDistricts) {
        setStage({
          kind: "split",
          zip: zipCode,
          districts: data.candidateDistricts,
        });
        return;
      }

      writeLocation({
        zip: data.zip,
        county: data.county ?? "",
        district: data.district,
        metro: data.metro,
      });
      track("zip_resolved");
      const q = new URLSearchParams({ view: "races", zip: data.zip });
      if (data.district) q.set("district", data.district);
      router.push(`/candidates?${q}`);
    } catch {
      setStage({
        kind: "error",
        message: "Something went wrong — give it another try.",
      });
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!/^\d{5}$/.test(zip)) {
      setStage({
        kind: "error",
        message: "ZIP codes are 5 digits — double-check yours.",
      });
      return;
    }
    void resolve(zip);
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <form onSubmit={submit} className="flex w-full flex-col gap-3 sm:flex-row">
        <label htmlFor="zip" className="sr-only">
          ZIP code
        </label>
        <Input
          id="zip"
          name="zip"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          placeholder="Enter your ZIP code"
          value={zip}
          onChange={(e) => {
            setZip(e.target.value.replace(/\D/g, ""));
            if (stage.kind === "error") setStage({ kind: "idle" });
          }}
          className="sm:max-w-[260px]"
        />
        <Button type="submit" disabled={stage.kind === "loading"}>
          {stage.kind === "loading" ? "Looking up…" : "See my ballot"}
        </Button>
      </form>

      {stage.kind === "error" && (
        <p role="alert" className="text-body-sm text-error">
          {stage.message}
        </p>
      )}

      {stage.kind === "outOfCoverage" && (
        <div className="flex flex-col gap-3" role="status">
          <p className="text-body-sm text-on-surface-muted">
            We don&apos;t cover that area yet — right now we cover the Miami,
            Fort Lauderdale, Tampa, and Orlando metros. You can still browse a
            covered county:
          </p>
          <CountyPicker
            onPick={(county) => {
              writeLocation({ county: county.name });
              router.push(`/candidates?view=races&county=${county.fips}`);
            }}
          />
        </div>
      )}

      {stage.kind === "split" && (
        <DistrictConfirm
          districts={stage.districts}
          onPick={(district) => void resolve(stage.zip, district)}
        />
      )}

      {stage.kind !== "outOfCoverage" && (
        <button
          type="button"
          onClick={() => setShowCounties((v) => !v)}
          className="w-fit text-body-sm text-on-surface-muted underline underline-offset-2 hover:text-on-surface"
        >
          or pick your county
        </button>
      )}

      {showCounties && stage.kind !== "outOfCoverage" && (
        <CountyPicker
          onPick={(county) => {
            writeLocation({ county: county.name });
            router.push(`/candidates?view=races&county=${county.fips}`);
          }}
        />
      )}
    </div>
  );
}
