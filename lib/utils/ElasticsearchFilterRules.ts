export class ElasticsearchFilterRules {
  private filterRules: Record<string, (queryBuilder: any, value: any) => void>;

  static readonly ELASTICSEARCH_OPERATORS = {
    and: "filter",
    or: "should",
    not: "mustNot"
  } as const;

  constructor(filterRules: Record<string, (queryBuilder: any, value: any) => void> = {}) {
    this.filterRules = filterRules;
  }

  private splitTopLevel(str: string): string[] {
    let level = 0; // Tracks parentheses depth
    const parts: string[] = [];
    let buffer = "";

    for (const char of str) {
      if (char === "(") level++;
      if (char === ")") level--;

      // Split only on commas outside of parentheses
      if (char === "," && level === 0) {
        parts.push(buffer.trim());
        buffer = "";
      } else {
        buffer += char;
      }
    }

    // Add the last buffer if not empty
    if (buffer) parts.push(buffer.trim());
    return parts;
  }

  private parseQuery(input: string): any {
    input = input.trim();

    // Handle simple rule (e.g., "basic")
    if (!input.includes("(") && !input.includes(",")) {
      if (!this.filterRules[input]?.call) {
        throw new Error(`Undefined rule: ${input}`);
      }
      return input;
    }

    // Handle comma-separated list (e.g., "basic,exclusive")
    if (!input.includes("(")) {
      return input.split(",").map(item => this.parseQuery(item));
    }

    // Extract the top-level operator and arguments
    const match = input.match(/^(\w+)\((.*)\)$/);
    if (!match) throw new Error(`Invalid query format: ${input}`);

    const operator = match[1];
    const args = this.splitTopLevel(match[2]);

    const result: any = {};
    if (operator in ElasticsearchFilterRules.ELASTICSEARCH_OPERATORS) {
      const esOperator = ElasticsearchFilterRules.ELASTICSEARCH_OPERATORS[
        operator as keyof typeof ElasticsearchFilterRules.ELASTICSEARCH_OPERATORS
      ];

      result[esOperator] = {};
      const rules = args.map(arg => this.parseQuery(arg));

      // Flatten "rules" into the result structure
      result[esOperator].rules = rules.filter(
        rule => typeof rule === "string" || Array.isArray(rule)
      );
      rules
        .filter(rule => typeof rule === "object" && !Array.isArray(rule))
        .forEach((subRule: Record<string, any>) => {
          Object.entries(subRule).forEach(([key, value]) => {
            result[esOperator][key] = result[esOperator][key] || {};
            result[esOperator][key] = { ...result[esOperator][key], ...value };
          });
        });
    } else {
      const rule = operator;
      if (!this.filterRules[rule]?.call) {
        throw new Error(`Undefined rule: ${rule}`);
      }
      return args.length ? [rule, ...args] : rule;
    }
    return result;
  }

  getFilterRule(ruleId: string): ((queryBuilder: any, value: any) => void) | undefined {
    return this.filterRules[ruleId];
  }

  getFilterRules(): Record<string, (queryBuilder: any, value: any) => void> {
    return this.filterRules;
  }

  evalQuery(query: string): { filters: any; error: false } | { filters: {}; error: string } {
    try {
      let parsedQuery = this.parseQuery(query);
      if (typeof parsedQuery === "string") {
        // wrap it for string rule alone case
        parsedQuery = { filter: { rules: [parsedQuery] } };
      }
      return {
        filters: parsedQuery,
        error: false
      };
    } catch (error) {
      return {
        filters: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
} 