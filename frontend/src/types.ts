export interface Event {
  id: number;
  title: string;
  description?: string;
  banner_url: string;
  uploaded_image?: string;
  display_image_url?: string;
  default_image_url?: string; // Default fallback image URL for this event
  participants?: Participant[];
  created_at?: string;
  updated_at?: string;
}

export interface Participant {
  name: string;
  email: string;
  message?: string;
  timestamp?: string;
}