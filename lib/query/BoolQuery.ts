export class BoolQuery {
  private boolRef: Record<string, any>;
  private base: any; // ElastickbirdQuery - will be properly typed later
  private mustBuilder?: OccurrenceQuery;
  private shouldBuilder?: OccurrenceQuery;
  private filterBuilder?: OccurrenceQuery;
  private mustNotBuilder?: OccurrenceQuery;

  constructor(ref: Record<string, any>, base: any) {
    this.boolRef = ref;
    this.base = base;
    this.bindMethods();
  }

  private bindMethods(): void {
    this.base.BASE_QUERY_METHODS.forEach((method: string) => {
      (this as any)[method] = (...params: any[]) => this.base[method](...params);
    });
  }

  /**
   * Must occurrence
   * @returns OccurrenceQuery
   */
  must(): OccurrenceQuery {
    if (!this.mustBuilder) {
      this.boolRef.must = [];
      this.mustBuilder = new OccurrenceQuery(this.boolRef.must, this.base);
    }
    return this.mustBuilder;
  }

  /**
   * Should occurrence
   * @param options - Configuration options
   * @param options.minimumShouldMatch - Minimum number of should clauses that must match
   * @returns OccurrenceQuery
   */
  should({ minimumShouldMatch = 1 }: { minimumShouldMatch?: number } = {}): OccurrenceQuery {
    if (!this.shouldBuilder) {
      this.boolRef.minimum_should_match = minimumShouldMatch;
      this.boolRef.should = [];
      this.shouldBuilder = new OccurrenceQuery(this.boolRef.should, this.base);
    }
    return this.shouldBuilder;
  }

  /**
   * Filter occurrence
   * @returns OccurrenceQuery
   */
  filter(): OccurrenceQuery {
    if (!this.filterBuilder) {
      this.boolRef.filter = [];
      this.filterBuilder = new OccurrenceQuery(this.boolRef.filter, this.base);
    }
    return this.filterBuilder;
  }

  /**
   * Must Not occurrence
   * @returns OccurrenceQuery
   */
  mustNot(): OccurrenceQuery {
    if (!this.mustNotBuilder) {
      this.boolRef.must_not = [];
      this.mustNotBuilder = new OccurrenceQuery(this.boolRef.must_not, this.base);
    }
    return this.mustNotBuilder;
  }
}

export class OccurrenceQuery {
  private occurrRef: any[];
  private base: any; // ElastickbirdQuery - will be properly typed later

  constructor(ref: any[], base: any) {
    this.occurrRef = ref;
    this.base = base;
    this.bindMethods();
  }

  private bindMethods(): void {
    this.base.BASE_QUERY_METHODS.forEach((method: string) => {
      (this as any)[method] = (...params: any[]) => this.base[method](...params);
    });

    this.base.OCCURRENCE_TYPES.forEach((method: string) => {
      (this as any)[method] = (...params: any[]) => this.base[method](...params);
    });
  }

  /**
   * Add a term clause to the query
   * If the field is the same as the routing field, the value will be used as the routing value
   * @param field - The field name
   * @param value - The term value
   * @returns this
   */
  addTerm(field: string, value: any): this {
    if (!field) throw new Error("Field is required");
    this.occurrRef.push({
      term: {
        [field]: value
      }
    });
    this.base.setRouting(field, value);
    return this;
  }

  /**
   * Add terms clause to the query
   * If the field is the same as the routing field, the value will be used as the routing value
   * @param field - The field name
   * @param values - Array of term values
   * @returns this
   */
  addTerms(field: string, values: any[]): this {
    this.occurrRef.push({
      terms: {
        [field]: values
      }
    });
    return this;
  }

  /**
   * Add match clause to the query
   * @param field - The field name
   * @param value - The match value
   * @returns this
   */
  addMatch(field: string, value: any): this {
    this.occurrRef.push({
      match: {
        [field]: value
      }
    });
    return this;
  }

  /**
   * Add a query string clause to the query
   * @param query - The query string
   * @param options - Query string options
   * @returns this
   */
  addQueryString(query: string, options: {
    fields?: string[];
    defaultOperator?: string;
    prefixLastWord?: boolean;
  } = {}): this {
    const queryStringBody: any = { query };
    const { fields, defaultOperator, prefixLastWord = false } = options;
    if (fields?.length) queryStringBody.fields = fields;
    if (defaultOperator) queryStringBody.default_operator = defaultOperator;
    if (prefixLastWord) queryStringBody.query = `${queryStringBody.query}*`;
    this.occurrRef.push({
      query_string: queryStringBody
    });
    return this;
  }

  /**
   * Add a exists clause to the query
   * @param field - The field name
   * @returns this
   */
  addExists(field: string): this {
    this.occurrRef.push({
      exists: {
        field
      }
    });
    return this;
  }

  /**
   * Add a range clause to the query
   * @param field - The field name
   * @param query - The range query object
   * @returns this
   */
  addRange(field: string, query: any): this {
    this.occurrRef.push({
      range: {
        [field]: query
      }
    });
    return this;
  }

  /**
   * Add a custom clause to the query
   * @param clause - The custom query clause
   * @returns this
   */
  addCustomClause(clause: any): this {
    this.occurrRef.push(clause);
    return this;
  }

  /**
   * Applies a filter rule to the current query builder instance.
   * @param filters - The filters to apply
   * @returns this
   */
  applyFilters(filters: any = {}): this {
    if (!filters) return this;

    filters = this.normalizeFilters(filters);

    const occurrences = Object.keys(filters).filter(occ =>
      ["must", "filter", "should", "mustNot"].includes(occ)
    );
    if (occurrences.length) {
      const bool = this.bool();
      occurrences.forEach(occ => {
        (bool as any)[occ]().applyFilters(filters[occ]);
      });
    }
    if (filters.rules?.length) this.applyRules(filters.rules);
    return this;
  }

  private normalizeFilters(filters: any): any {
    if (Array.isArray(filters)) return { rules: [filters] };
    else if (typeof filters === "string") {
      if (filters.includes(",")) return { rules: filters.split(",") };
      return { rules: [filters] };
    }
    return filters;
  }

  private applyRules(rules: any[]): void {
    rules.forEach(rule => this.applyRule(rule));
  }

  private applyRule(rule: any): void {
    let ruleId: string;
    let args: any[] = [];
    if (Array.isArray(rule)) {
      [ruleId, ...args] = rule;
    } else {
      ruleId = rule;
    }

    const filterRule = this.base.getFilterRule(ruleId);
    if (filterRule?.call) {
      filterRule(this, ...args);
    }
  }

  /**
   * Create a nested bool query
   * @returns BoolQuery
   */
  bool(): BoolQuery {
    const boolRef: Record<string, any> = {};
    this.occurrRef.push({ bool: boolRef });
    return new BoolQuery(boolRef, this.base);
  }
} 