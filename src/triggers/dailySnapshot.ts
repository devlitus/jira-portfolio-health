// Stub handler for the daily scheduled trigger (manifest: jira:scheduledTrigger).
// Real snapshot logic (analyze selected projects, persist to KVS) lands in Fase 5.
export const run = async (): Promise<void> => {
  console.log('dailySnapshot trigger fired (stub — no-op until Fase 5)');
};
