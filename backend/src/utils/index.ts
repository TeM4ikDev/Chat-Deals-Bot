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
