import test from "node:test";
import assert from "node:assert/strict";
import { OperationalStore } from "../src/models/store.js";
test("seed populates five services and six alerts", () => {
  const store = new OperationalStore();
  assert.equal(store.listServices().length, 5); assert.equal(store.listAlerts().length, 6);
  assert.equal(store.listAlerts("firing").length, 3); assert.equal(store.listAlerts("resolved").length, 3);
});
test("clone isolates mutations", () => {
  const store = new OperationalStore(); store.seed(); const clone = store.clone();
  clone.openIncident({ title: "test", serviceId: "api", severity: "low" });
  assert.equal(store.snapshot().incidents.length, 0);
});
test("creates new services in memory when opening an incident", () => {
  const store = new OperationalStore();
  const incident = store.openIncident({ title: "Checkout outage", serviceId: "checkout", severity: "high" });
  assert.equal(incident.serviceId, "svc-6");
  assert.equal(store.listServices().at(-1)?.name, "checkout");
});
