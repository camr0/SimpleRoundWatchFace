#include <pebble.h>

int main(void) {
  Window *w = window_create();
  window_stack_push(w, true);

  // This larger fixed pool is required by the watchface's Alloy snapshot.
  // Firmware-managed defaults exhaust the chunk heap during startup.
  ModdableCreationRecord creation = {
    .recordSize = sizeof(ModdableCreationRecord),
    .stack = 6144,
    .slot = 32768,
    .chunk = 32768,
  };
  moddable_createMachine(&creation);

  window_destroy(w);
}
