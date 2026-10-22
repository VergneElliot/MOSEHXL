export interface UserAccountData {
  email: string;
  password: string;
  establishmentId: string;
  role: string;
}

export interface CreatedUserAccount {
  id: string;
  email: string;
  role: string;
  establishmentId: string;
  token: string;
}

export interface SetupUserAccountInput {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone: string;
}
