export type ClassValue =
  | ClassValue[]
  | Record<string, boolean | null | undefined>
  | string
  | number
  | null
  | boolean
  | undefined;

/**
 * Merges class names into a single string.
 * Compatible with shadcn `cn` utility function.
 */
export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  function process(input: ClassValue) {
    if (!input) return;
    if (typeof input === 'string') {
      classes.push(input);
    } else if (typeof input === 'number') {
      classes.push(String(input));
    } else if (Array.isArray(input)) {
      input.forEach(process);
    } else if (typeof input === 'object') {
      for (const key in input) {
        if (input[key]) classes.push(key);
      }
    }
  }

  inputs.forEach(process);
  return classes.join(' ');
}
