import type { RefinementCtx } from "zod";

/**
 * Programs an equipment request can be charged to.
 * Wellness list confirmed by Carlos: each parenthetical item is its own program.
 * Add groups here when more departments send their lists.
 */
export const EQUIPMENT_PROGRAM_GROUPS = [
  {
    group: "Health Home/Care Management",
    programs: [
      { label: "FH", value: "Health Home/Care Management — FH" },
    ],
  },
  {
    group: "Peer Navigation",
    programs: [
      { label: "Employment", value: "Peer Navigation — Employment" },
      { label: "Recovery", value: "Peer Navigation — Recovery" },
      { label: "Embedded peers", value: "Peer Navigation — Embedded peers" },
      { label: "Peer support", value: "Peer Navigation — Peer support" },
    ],
  },
  {
    group: "Housing",
    programs: [
      { label: "MRT", value: "Housing — MRT" },
      { label: "OMH", value: "Housing — OMH" },
      { label: "HUD", value: "Housing — HUD" },
    ],
  },
] as const;

export const EQUIPMENT_PROGRAMS: readonly string[] =
  EQUIPMENT_PROGRAM_GROUPS.flatMap((group) =>
    group.programs.map((program) => program.value),
  );

export type EquipmentFormFields = {
  equipment_requested: string;
  equipment_owner_name?: string;
  equipment_item?: string;
  equipment_program?: string;
  equipment_budget?: string;
};

export type EquipmentDbFields = {
  equipment_requested: boolean;
  equipment_owner_name: string | null;
  equipment_item: string | null;
  equipment_program: string | null;
  equipment_budget: string | null;
};

export function addEquipmentIssues(
  data: EquipmentFormFields,
  ctx: RefinementCtx,
) {
  if (data.equipment_requested !== "yes" && data.equipment_requested !== "no") {
    ctx.addIssue({
      code: "custom",
      path: ["equipment_requested"],
      message: "Please choose whether you are requesting new equipment",
    });
    return;
  }

  if (data.equipment_requested !== "yes") return;

  if ((data.equipment_owner_name ?? "").trim().length < 2) {
    ctx.addIssue({
      code: "custom",
      path: ["equipment_owner_name"],
      message: "Enter the name of the person who will own this equipment",
    });
  }

  if ((data.equipment_item ?? "").trim().length < 2) {
    ctx.addIssue({
      code: "custom",
      path: ["equipment_item"],
      message: "Enter what equipment you are requesting",
    });
  }

  if (!EQUIPMENT_PROGRAMS.includes((data.equipment_program ?? "").trim())) {
    ctx.addIssue({
      code: "custom",
      path: ["equipment_program"],
      message: "Select the program this equipment is for",
    });
  }
}

export function equipmentDbFields(data: EquipmentFormFields): EquipmentDbFields {
  if (data.equipment_requested !== "yes") {
    return {
      equipment_requested: false,
      equipment_owner_name: null,
      equipment_item: null,
      equipment_program: null,
      equipment_budget: null,
    };
  }

  return {
    equipment_requested: true,
    equipment_owner_name: (data.equipment_owner_name ?? "").trim(),
    equipment_item: (data.equipment_item ?? "").trim(),
    equipment_program: (data.equipment_program ?? "").trim(),
    equipment_budget: (data.equipment_budget ?? "").trim() || null,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Paragraph included in new-ticket emails. */
export function equipmentNoticeHtml(fields: EquipmentDbFields): string {
  if (!fields.equipment_requested) {
    return "<p><strong>New equipment:</strong> No</p>";
  }

  const budgetLine = fields.equipment_budget
    ? `<li><strong>Budget:</strong> ${escapeHtml(fields.equipment_budget)}</li>`
    : "";

  return `<p><strong>New equipment:</strong> Yes</p>
    <ul>
      <li><strong>Requested for:</strong> ${escapeHtml(fields.equipment_owner_name ?? "")}</li>
      <li><strong>Item:</strong> ${escapeHtml(fields.equipment_item ?? "")}</li>
      <li><strong>Program:</strong> ${escapeHtml(fields.equipment_program ?? "")}</li>
      ${budgetLine}
    </ul>`;
}
