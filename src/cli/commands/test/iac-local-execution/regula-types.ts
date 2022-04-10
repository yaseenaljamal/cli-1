export type RegulaOutput = {
  rule_results: RuleResult[];
  summary: {};
};

export type RuleResult = {
  filepath: string;
  input_type: string;
  resource_id: string;
  resource_type: string;
  rule_description: string;
  rule_id: string;
  rule_message: string;
  rule_name: string;
  rule_raw_result: boolean;
  rule_remediation_doc: string;
  rule_result: 'PASS' | 'FAIL' | 'WAIVED';
  rule_severity:
    | 'Critical'
    | 'High'
    | 'Medium'
    | 'Low'
    | 'Informational'
    | 'Unknown';
  rule_summary: string;
  source_location: { path: string; line: number; column: number };
};

export type RegulaSummary = {
  filepaths: string[];
  rule_results: {
    PASS: number;
    FAIL: number;
    WAIVED: number;
  };
  severities: {
    Critical: number;
    High: number;
    Medium: number;
    Low: number;
    Informational: number;
    Unknown: number;
  };
};
