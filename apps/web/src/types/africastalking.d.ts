declare module 'africastalking' {
  interface SMSOptions {
    to: string[];
    message: string;
    from?: string;
    enqueue?: boolean;
  }

  interface SMSRecipient {
    statusCode: number;
    number: string;
    status: string;
    cost: string;
    messageId: string;
  }

  interface SMSResponse {
    SMSMessageData: {
      Message: string;
      Recipients: SMSRecipient[];
    };
  }

  interface SMS {
    send(options: SMSOptions): Promise<SMSResponse>;
  }

  interface AfricasTalkingConfig {
    apiKey: string;
    username: string;
  }

  interface AfricasTalking {
    SMS: SMS;
  }

  function initialize(config: AfricasTalkingConfig): AfricasTalking;
  
  export = initialize;
}
