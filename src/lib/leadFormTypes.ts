export type SubserviceOption = {
  slug: string;
  name: string;
};

export type ServiceOption = {
  slug: string;
  name: string;
  subservices?: SubserviceOption[];
};
