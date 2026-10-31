/**
 * Minimal in-memory stand-ins for TypeORM repositories and DataSource, used by
 * the unit tests so service logic can be exercised without a database.
 * Excluded from the production build and from coverage.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

function matches(row: Row, where?: Row): boolean {
  return Object.entries(where ?? {}).every(([k, v]) => row[k] === v);
}

export class FakeRepo<T extends Row = Row> {
  rows: T[] = [];
  private seq = 1;

  create(data: Partial<T>): T {
    return { ...data } as T;
  }

  async save(entity: T): Promise<T> {
    if (entity.id == null) {
      entity.id = this.seq++ as T['id'];
      this.rows.push(entity);
      return entity;
    }
    const stored = this.rows.find((r) => r.id === entity.id);
    if (stored) {
      Object.assign(stored, entity);
      return stored;
    }
    this.rows.push(entity);
    return entity;
  }

  async find(opts: { where?: Row } = {}): Promise<T[]> {
    return this.rows.filter((r) => matches(r, opts.where)).map((r) => ({ ...r }));
  }

  async findOne(opts: { where?: Row } = {}): Promise<T | null> {
    const row = this.rows.find((r) => matches(r, opts.where));
    return row ? { ...row } : null;
  }

  async remove(items: T | T[]): Promise<void> {
    const ids = new Set((Array.isArray(items) ? items : [items]).map((i) => i.id));
    this.rows = this.rows.filter((r) => !ids.has(r.id));
  }
}

class FakeSurveyRepo extends FakeRepo {
  constructor(private readonly db: FakeDb) {
    super();
  }

  private withQuestions(row: Row, relations?: Row): Row {
    if (!relations?.questions) return { ...row };
    const questions = this.db.questions.rows
      .filter((q) => q.surveyId === row.id)
      .sort((a, b) => a.position - b.position)
      .map((q) => ({ ...q }));
    return { ...row, questions };
  }

  async findOne(opts: { where?: Row; relations?: Row } = {}) {
    const row = this.rows.find((r) => matches(r, opts.where));
    return row ? this.withQuestions(row, opts.relations) : null;
  }

  async find(opts: { where?: Row; relations?: Row } = {}) {
    return [...this.rows]
      .reverse()
      .filter((r) => matches(r, opts.where))
      .map((r) => this.withQuestions(r, opts.relations));
  }
}

export class FakeDb {
  surveys = new FakeSurveyRepo(this);
  questions = new FakeRepo();
  responses = new FakeRepo();

  dataSource = {
    transaction: async <R>(cb: (manager: any) => Promise<R>): Promise<R> =>
      cb({ getRepository: (entity: { name: string }) => this.repoFor(entity) }),
  };

  private repoFor(entity: { name: string }): FakeRepo {
    switch (entity.name) {
      case 'Survey':
        return this.surveys;
      case 'Question':
        return this.questions;
      case 'SurveyResponse':
        return this.responses;
      default:
        throw new Error(`FakeDb has no repository for ${entity.name}`);
    }
  }

  async seedSurvey(overrides: Row = {}): Promise<Row> {
    return this.surveys.save({
      title: 'Seeded survey',
      description: null,
      openDate: null,
      closeDate: null,
      status: 'Draft',
      ...overrides,
    });
  }
}
