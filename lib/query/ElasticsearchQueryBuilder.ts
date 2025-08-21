import { BoolQueryBuilder, OccurrenceQueryBuilder } from './BoolQueryBuilder';
import { ElasticsearchFilterRules } from '../utils/ElasticsearchFilterRules';
import { QueryBuilderOptions } from '../types';
import { ElastickbirdModel } from '../model/ElastickbirdModel';

/**
 * Elasticsearch Query Builder
 * @description It builds query objects for Elasticsearch methods that uses bool queries (search, count, updateByQuery and deleteByQuery)
 *
 * @note Occurrences Types
 * There are four types of occurrences that can be added to the query: must, should, filter, and mustNot.
 * When using the addTerm, addTerms, etc., methods without previously calling the should, filter, or mustNot methods, the clauses will be added to the must occurrence by default.
 * This means they will be required to match and will contribute to the score calculation. For filters that should not affect score calculation, use the filter occurrence.
 * Filter vs Must: Filters are not used in score calculation and sometimes ES consider them for caching, which can improve performance.
 * More info: https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-bool-query.html
 *
 * @note Routing
 * If the field of a term clause is the same as the routing field, the value will be assigned as the routing value.
 * This is applied to the first term clause that matches the routing field and works for all occurrence types.
 * It's recommended to start the query with the routing field to ensure the routing value is set correctly.
 * Note: The routing value will be used only if the routing field is set in the constructor.
 */
export class ElastickbirdQuery {
  private model: ElastickbirdModel;
  private query: { bool: Record<string, any> };
  private boolQueryBuilder: BoolQueryBuilder;
  private defaultOccurrence: OccurrenceQueryBuilder;
  private size: number;
  private sort: any[];
  private searchAfter: any[];
  private searchAfterDelimiter?: string;
  private from: number;
  private sortRules: Record<string, (query: any, order: string) => void>;
  private filterRules: ElasticsearchFilterRules;
  private routing?: string;
  private routingRules?: Record<string, (value: any) => string>;
  private routingValue?: string;
  private refresh?: boolean | string;
  private script?: any;

  // Dynamic method declarations for bound methods
  public addTerm!: (field: string, value: any) => this;
  public addTerms!: (field: string, values: any[]) => this;
  public addMatch!: (field: string, value: any) => this;
  public addExists!: (field: string) => this;
  public addRange!: (field: string, query: any) => this;
  public addCustomClause!: (clause: any) => this;
  public addQueryString!: (query: string, options?: any) => this;
  public applyFilters!: (filters?: any) => this;
  public must!: () => OccurrenceQueryBuilder;
  public should!: (options?: { minimumShouldMatch?: number }) => OccurrenceQueryBuilder;
  public filter!: () => OccurrenceQueryBuilder;
  public mustNot!: () => OccurrenceQueryBuilder;

  readonly OCCURRENCE_TYPES: string[] = ["must", "should", "filter", "mustNot"];
  readonly OCCURRENCE_QUERY_METHODS: string[] = [
    "addTerm",
    "addTerms",
    "addMatch",
    "addExists",
    "addRange",
    "addCustomClause",
    "addQueryString",
    "applyFilters"
  ];
  readonly BASE_QUERY_METHODS: string[] = [
    "addSort",
    "applySortRule",
    "setSearchAfter",
    "setSize",
    "setFrom",
    "setRouting",
    "setRefresh",
    "setScript",
    "build"
  ];

  /**
   * Creates a new ElastickbirdQuery
   * @param options - Configuration options
   * @param options.model - The model instance
   */
  constructor({
    model
  }: QueryBuilderOptions) {
    this.model = model;
    this.query = { bool: {} };
    // create the base bool query builder
    this.boolQueryBuilder = new BoolQueryBuilder(this.query.bool, this);
    // create the default occurrence (must) query builder
    this.defaultOccurrence = this.boolQueryBuilder.must();
    // default values
    this.size = 10;
    this.from = 0;
    this.sort = [];
    this.searchAfter = [];
    // set options
    this.searchAfterDelimiter = model.getSearchAfterDelimiter() || "~";
    this.sortRules = model.getSortRules() || {};
    this.filterRules = model.getFilterRules() || new ElasticsearchFilterRules();
    this.routing = model.getRouting();
    this.routingRules = model.getRoutingRules() || {};

    this.bindMethods();
  }

  private bindMethods(): void {
    // bind methods from default occurrence (must) to the base
    this.OCCURRENCE_QUERY_METHODS.forEach(method => {
      (this as any)[method] = (...params: any[]) => (this.defaultOccurrence as any)[method](...params);
    });

    // bind methods from bool query builder to the base
    this.OCCURRENCE_TYPES.forEach(method => {
      (this as any)[method] = (...params: any[]) => (this.boolQueryBuilder as any)[method](...params);
    });
  }

  /**
   * Apply a sort rule by ID
   * @param ruleId - The sort rule ID, optionally prefixed with +/- for order
   * @returns this
   */
  applySortRule(ruleId: string): this {
    if (!ruleId) return this;
    let order: string = "asc";
    if (ruleId.startsWith("-")) {
      order = "desc";
      ruleId = ruleId.substring(1);
    }
    if (ruleId.startsWith("+")) {
      ruleId = ruleId.substring(1);
    }
    const sortRule = this.sortRules[ruleId];
    if (sortRule) sortRule(this, order);
    return this;
  }

  /**
   * Get a filter rule by ID
   * @param ruleId - The filter rule ID
   * @returns The filter rule function
   */
  getFilterRule(ruleId: string): ((query: any, value: any) => void) | undefined {
    return this.filterRules.getFilterRule(ruleId);
  }

  /**
   * Set routing value if routing conditions are met
   * @param field - The field name
   * @param value - The field value
   */
  setRouting(field: string, value: any): void {
    if (this.routing && field === this.routing) {
      this.routingValue = value;
    } else if (this.routingRules && this.routingRules[field]) {
      this.routingValue = this.routingRules[field](value);
    }
  }

  /**
   * Add a sort clause to the query
   * @param field - The field name
   * @param order - Sort order (asc|desc)
   * @returns this
   */
  addSort(field: string, order: string = "asc"): this {
    if (!field) throw new Error("Field is required");
    this.sort.push({ [field]: order });
    return this;
  }

  /**
   * Set the searchAfter value
   * @param searchAfter - The search after value
   * @returns this
   */
  setSearchAfter(searchAfter: string): this {
    if (!searchAfter) throw new Error("SearchAfter value is required");
    if (!this.searchAfterDelimiter)
      throw new Error("SearchAfterDelimiter must be set in the constructor");
    this.searchAfter = searchAfter.split(this.searchAfterDelimiter);
    return this;
  }

  /**
   * Set the size of results to return
   * @param size - Number of results
   * @returns this
   */
  setSize(size: number): this {
    if (size < 0) throw new Error("Size must be greater than or equal to 0");
    this.size = size;
    return this;
  }

  /**
   * Set the from offset for pagination
   * @param from - The offset
   * @returns this
   */
  setFrom(from: number): this {
    this.from = from;
    return this;
  }

  /**
   * Set the refresh value for the query
   * @param refresh - The refresh value
   * @returns this
   */
  setRefresh(refresh: boolean | string): this {
    this.refresh = refresh;
    return this;
  }

  /**
   * Set the script for update operations
   * @param script - The script object
   * @returns this
   */
  setScript(script: any): this {
    this.script = script;
    return this;
  }

  /**
   * Build the final query object
   * @returns The complete Elasticsearch query
   */
  build(): any {
    const result: any = {
      query: this.query,
      size: this.size,
      from: this.from
    };

    if (this.sort.length) {
      result.sort = this.sort;
    }

    if (this.searchAfter.length) {
      result.search_after = this.searchAfter;
      delete result.from; // Can't use both from and search_after
    }

    if (this.routingValue) {
      result.routing = this.routingValue;
    }

    if (this.refresh !== undefined) {
      result.refresh = this.refresh;
    }

    if (this.script) {
      result.script = this.script;
    }

    return result;
  }
} 