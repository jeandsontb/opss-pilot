import { store } from "../models/store.js";
store.seed();
console.log(JSON.stringify({
  source: "src/data/seed.json",
  services: store.listServices().length,
  alerts: store.listAlerts().length,
  firing: store.listAlerts("firing").length,
  resolved: store.listAlerts("resolved").length,
}));
