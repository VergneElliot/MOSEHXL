import {
  findUserByEmail,
  findUserById,
  getAuthenticatedUser,
  getAuthLoginDetails,
  getAuthMeProfile,
  getAuthRoleState,
  listSystemAdmins,
  listUsersByEstablishment,
  userBelongsToEstablishment,
  verifyUserPassword,
} from './userReadModel';
import {
  applyLoginLockout,
  clearLoginLockoutState,
  deleteUserById,
  incrementFailedLoginAttempts,
  setSystemAdminActive,
  unlockUserAccount,
  updatePersonalProfile,
  updateUserRoleById,
} from './userWriteModel';
import {
  bootstrapSystemAdmin,
  createSystemAdmin,
  createUser,
  createUserForEstablishment,
  updatePasswordById,
} from './userCreateModel';
import {
  disableMfaTotp,
  enableMfaTotp,
  getMfaTotpState,
  setMfaTotpSecret,
} from './userMfaModel';
import { getUserPermissions, setUserPermissions } from './userPermissionsModel';

export type { AuthenticatedUser, UserRow, User } from './userTypes';

export class UserModel {
  static createUser = createUser;
  static createSystemAdmin = createSystemAdmin;
  static listSystemAdmins = listSystemAdmins;
  static setSystemAdminActive = setSystemAdminActive;
  static createUserForEstablishment = createUserForEstablishment;
  static findByEmail = findUserByEmail;
  static findById = findUserById;
  static getAuthenticatedUser = getAuthenticatedUser;
  static verifyPassword = verifyUserPassword;
  static incrementFailedLoginAttempts = incrementFailedLoginAttempts;
  static applyLoginLockout = applyLoginLockout;
  static clearLoginLockoutState = clearLoginLockoutState;
  static getMfaTotpState = getMfaTotpState;
  static setMfaTotpSecret = setMfaTotpSecret;
  static enableMfaTotp = enableMfaTotp;
  static disableMfaTotp = disableMfaTotp;
  static unlockUserAccount = unlockUserAccount;
  static getUserPermissions = getUserPermissions;
  static setUserPermissions = setUserPermissions;
  static getAuthLoginDetails = getAuthLoginDetails;
  static getAuthRoleState = getAuthRoleState;
  static getAuthMeProfile = getAuthMeProfile;
  static updatePersonalProfile = updatePersonalProfile;
  static listUsersByEstablishment = listUsersByEstablishment;
  static userBelongsToEstablishment = userBelongsToEstablishment;
  static deleteUserById = deleteUserById;
  static updateUserRoleById = updateUserRoleById;
  static updatePasswordById = updatePasswordById;
  static bootstrapSystemAdmin = bootstrapSystemAdmin;
}
