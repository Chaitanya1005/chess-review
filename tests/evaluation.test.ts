import { describe, expect, it } from "vitest";
import { formatScore, mateWinner, toWhitePov, wdlToWhitePov } from "@/lib/analysis/evaluation";

describe("toWhitePov", () => {
  it("keeps White-to-move scores", () => {
    expect(toWhitePov({ type: "cp", value: 35 }, "w")).toEqual({ type: "cp", value: 35 });
    expect(toWhitePov({ type: "mate", value: 2 }, "w")).toEqual({ type: "mate", value: 2 });
  });

  it("negates Black-to-move scores", () => {
    expect(toWhitePov({ type: "cp", value: -27 }, "b")).toEqual({ type: "cp", value: 27 });
    expect(toWhitePov({ type: "mate", value: 3 }, "b")).toEqual({ type: "mate", value: -3 });
  });

  it("never produces negative zero", () => {
    const s = toWhitePov({ type: "cp", value: 0 }, "b");
    expect(Object.is(s.value, -0)).toBe(false);
  });

  it("maps UCI mate 0 (side to move is mated) to an explicit winner", () => {
    expect(toWhitePov({ type: "mate", value: 0 }, "b")).toEqual({ type: "mate", value: 0, winner: "w" });
    expect(toWhitePov({ type: "mate", value: 0 }, "w")).toEqual({ type: "mate", value: 0, winner: "b" });
  });
});

describe("wdlToWhitePov", () => {
  it("swaps win and loss for Black to move", () => {
    expect(wdlToWhitePov([6, 942, 52], "b")).toEqual([52, 942, 6]);
    expect(wdlToWhitePov([6, 942, 52], "w")).toEqual([6, 942, 52]);
  });
});

describe("mateWinner / formatScore", () => {
  it("identifies the mating side", () => {
    expect(mateWinner({ type: "mate", value: 4 })).toBe("w");
    expect(mateWinner({ type: "mate", value: -1 })).toBe("b");
    expect(mateWinner({ type: "mate", value: 0, winner: "b" })).toBe("b");
    expect(mateWinner({ type: "cp", value: 900 })).toBeUndefined();
  });

  it("formats scores", () => {
    expect(formatScore({ type: "cp", value: 37 })).toBe("+0.4");
    expect(formatScore({ type: "cp", value: -120 })).toBe("-1.2");
    expect(formatScore({ type: "cp", value: 0 })).toBe("0.0");
    expect(formatScore({ type: "mate", value: 3 })).toBe("M3");
    expect(formatScore({ type: "mate", value: -2 })).toBe("-M2");
    expect(formatScore({ type: "mate", value: 0, winner: "w" })).toBe("1-0");
  });
});
