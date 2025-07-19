export interface Event {
  id: string;
  title: string;
  banner_url: string;
  participants?: Participant[];
}

export interface Participant {
  name: string;
  email: string;
  message?: string;
  timestamp?: string;
}