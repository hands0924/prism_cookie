declare module "solapi" {
  export class SolapiMessageService {
    constructor(apiKey: string, apiSecret: string);
    send(message: Record<string, unknown>): Promise<unknown>;
  }
}
