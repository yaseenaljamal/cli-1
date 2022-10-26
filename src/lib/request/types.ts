import { OutgoingHttpHeaders } from 'http';
import { NeedleHttpVerbs } from 'needle';

export interface Payload {
  body: any;
  url: string;
  headers: OutgoingHttpHeaders;
  method: NeedleHttpVerbs;
  qs?: {};
  json?: boolean;
  timeout?: number;
  family?: number;
}

export interface TestExecutionResponse {
  data: {
    attributes: {
      state?: string;
    };
    id: string;
    type: string;
  };
  jsonapi: {
    version: string;
  };
  links: {
    self: string;
    related?: string;
  };
}
