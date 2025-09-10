export function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}


export function randElemFromArray<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) {
      matrix[i][0] = i;
  }
  for (let j = 0; j <= b.length; j++) {
      matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          matrix[i][j] = Math.min(
              matrix[i - 1][j] + 1, // deletion
              matrix[i][j - 1] + 1, // insertion
              matrix[i - 1][j - 1] + cost // substitution
          );
      }
  }

  return matrix[a.length][b.length];
}


export function chance(percent: number): boolean {
  if (percent > 100  || percent < 0) {
    throw new Error('Percent must be between 0 and 100');
  }
  const random = Math.random() * 100;
  return random < percent;
}
