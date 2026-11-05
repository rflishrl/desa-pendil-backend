/** Authenticated actor representing caller context in the service layer. */
export interface Actor {
  id: string;
  email: string;
  role: "admin" | "user";
}
