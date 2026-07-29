export interface QueryRecord {
  name: string;
  model: string;
  operation: string;
  rows: number;
  duration: number;
}

export class QueryProfiler {
  private queries: QueryRecord[] = [];

  record(name: string, model: string, operation: string, rows: number, duration: number): void {
    this.queries.push({ name, model, operation, rows, duration });
  }

  getQueries(): readonly QueryRecord[] {
    return this.queries;
  }

  findDuplicates(): QueryRecord[][] {
    const groups = new Map<string, QueryRecord[]>();
    for (const q of this.queries) {
      const key = `${q.model}:${q.operation}`;
      const group = groups.get(key) ?? [];
      group.push(q);
      groups.set(key, group);
    }
    return Array.from(groups.values()).filter((g) => g.length > 1);
  }

  findSequentialCandidates(): QueryRecord[] {
    return this.queries;
  }

  printReport(): void {
    const sorted = [...this.queries].sort((a, b) => b.duration - a.duration);

    console.debug('');
    console.debug('=== Query Profiler Report (ranked slowest to fastest) ===');
    for (const q of sorted) {
      const padding = '.'.repeat(Math.max(1, 32 - q.name.length));
      console.debug(`[dbQuery] ${q.name} ${padding} ${q.duration}ms`);
      console.debug(`  Model: ${q.model}`);
      console.debug(`  Operation: ${q.operation}`);
      console.debug(`  Rows: ${q.rows}`);
    }

    const duplicates = this.findDuplicates();
    if (duplicates.length > 0) {
      console.debug('');
      console.debug('=== Duplicate Queries ===');
      for (const group of duplicates) {
        console.debug(`Model: ${group[0].model}, Operation: ${group[0].operation} - ${group.length} queries`);
      }
    }

    console.debug('');
    console.debug(`=== Total: ${this.queries.length} queries, slowest: ${sorted[0]?.duration ?? 0}ms ===`);
  }
}