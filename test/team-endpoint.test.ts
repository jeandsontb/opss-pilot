import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { teamRequestSchema } from "../src/team/types.js";

// ---------------------------------------------------------------------------
// T017: Validação de schema Zod — offline, sem instanciar nenhum servidor
// ---------------------------------------------------------------------------
// Nota: testes de integração HTTP completos (com servidor iniciado)
// requerem npm rebuild do better-sqlite3 para o Node.js atual do ambiente.
// Este arquivo valida os contratos de validação via Zod diretamente.
// ---------------------------------------------------------------------------

describe("teamRequestSchema — validação de inputs na fronteira HTTP (T017)", () => {
  it("T017a: message vazia deve falhar na validação", () => {
    const result = teamRequestSchema.safeParse({ message: "" });
    assert.equal(result.success, false, "message vazia deve falhar");
    assert.ok(
      result.error?.issues.some((i) => i.path.includes("message")),
      "deve reportar erro no campo message",
    );
  });

  it("T017b: maxSteps: 99 deve falhar (acima do máximo 8)", () => {
    const result = teamRequestSchema.safeParse({ message: "teste", maxSteps: 99 });
    assert.equal(result.success, false, "maxSteps 99 deve falhar");
    assert.ok(
      result.error?.issues.some((i) => i.path.includes("maxSteps")),
      "deve reportar erro no campo maxSteps",
    );
  });

  it("T017c: maxSteps: 0 deve falhar (abaixo do mínimo 1)", () => {
    const result = teamRequestSchema.safeParse({ message: "teste", maxSteps: 0 });
    assert.equal(result.success, false, "maxSteps 0 deve falhar");
  });

  it("T017d: body sem message deve falhar", () => {
    const result = teamRequestSchema.safeParse({});
    assert.equal(result.success, false, "body sem message deve falhar");
  });

  it("T017e: input válido deve passar com defaults aplicados", () => {
    const result = teamRequestSchema.safeParse({ message: "Latência alta no serviço de pagamentos" });
    assert.equal(result.success, true, "input válido deve passar");
    if (result.success) {
      assert.equal(result.data.maxSteps, 8, "maxSteps deve ter default 8");
    }
  });

  it("T017f: maxSteps: 8 deve ser aceito (valor máximo)", () => {
    const result = teamRequestSchema.safeParse({ message: "teste", maxSteps: 8 });
    assert.equal(result.success, true, "maxSteps 8 deve ser aceito");
  });

  it("T017g: maxSteps: 1 deve ser aceito (valor mínimo)", () => {
    const result = teamRequestSchema.safeParse({ message: "teste", maxSteps: 1 });
    assert.equal(result.success, true, "maxSteps 1 deve ser aceito");
  });

  it("T017h: conversationId com UUID válido deve ser aceito", () => {
    const result = teamRequestSchema.safeParse({
      message: "teste",
      conversationId: "00000000-0000-4000-a000-000000000000",
    });
    assert.equal(result.success, true, "UUID válido deve ser aceito");
  });

  it("T017i: conversationId com string não-UUID deve falhar", () => {
    const result = teamRequestSchema.safeParse({
      message: "teste",
      conversationId: "nao-e-um-uuid",
    });
    assert.equal(result.success, false, "conversationId não-UUID deve falhar");
  });
});
