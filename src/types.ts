export type Section =
  | 'Dashboard'
  | 'Posting log'
  | 'Accounts'
  | 'Clients'
  | 'Platforms'
  | 'Devices'
  | 'History'
  | 'Reports'
  | 'Settings';
export type Status = 'Published' | 'Failed' | 'Pending' | 'Scheduled' | 'Cancelled';
export type Client = {
  id: string;
  name: string;
  contact: string;
  dailyTarget: number;
  status: string;
  remarks: string;
};
export type Platform = {
  id: string;
  name: string;
  active: boolean;
  color: string;
  dailyTarget: number;
  notes: string;
};
export type Device = {
  id: string;
  name: string;
  type: string;
  assignedTo: string;
  status: string;
  remarks: string;
};
export type Account = {
  id: string;
  clientId: string;
  platformId: string;
  name: string;
  deviceId: string;
  phone: string;
  email: string;
  status: string;
  dailyTarget: number;
  remarks: string;
};
export type Post = {
  id: string;
  date: string;
  time: string;
  clientId: string;
  accountId: string;
  platformId: string;
  deviceId: string;
  contentId: string;
  contentType: string;
  status: Status;
  operator: string;
  url: string;
  remark: string;
};
export type Store = {
  clients: Client[];
  platforms: Platform[];
  devices: Device[];
  accounts: Account[];
  posts: Post[];
};
