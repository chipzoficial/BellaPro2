export type ActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[] | undefined>;
};
