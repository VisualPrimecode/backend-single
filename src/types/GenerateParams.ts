export interface GenerateParams {
  query: string;
  context: string;
  business: {
    _id: string;
    name: string;
    industry: string;
    businessType: string;
    domainName: string;
  };
  aiAgent: {
    name: string;
  };
  customerId: string;
}