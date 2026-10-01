/**
 * GET/PATCH /api/auth/me/profile — personal fields + ui_prefs for the active PIN actor.
 */

import { Router } from 'express';

import { pool } from '../../db/pool';
import { requireAuth } from '../../middleware/auth';
import {
  asyncHandler,
  NotFoundError,
  ValidationError,
} from '../../middleware/errorHandler';
import { MembershipModel } from '../../models/membership';
import { UserModel } from '../../models/user';
import { requirePinActorUserId } from '../../services/auth/requirePinActorUserId';
import { normalizeUiPrefs, type UiPrefs } from '../../services/auth/uiPrefs';

const profileRoutes = Router();

function profilePayload(
  email: string,
  personal: {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    date_of_birth: string | null;
  },
  calendarColor: string,
  canLogin: boolean,
  used: string[],
  uiPrefs: UiPrefs
) {
  return {
    email,
    first_name: personal.first_name || '',
    last_name: personal.last_name || '',
    phone: personal.phone || '',
    date_of_birth: personal.date_of_birth || '',
    calendar_color: calendarColor,
    can_login: canLogin,
    available_colors: MembershipModel.availableColorsForUser(used, calendarColor),
    used_colors: used,
    ui_prefs: uiPrefs,
  };
}

profileRoutes.get(
  '/me/profile',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId, email } = requirePinActorUserId(req);
    const establishmentId = req.user!.establishment_id ?? null;
    if (!establishmentId) {
      throw new ValidationError('Aucun établissement actif');
    }
    const [profile, membership, used, canLoginRow] = await Promise.all([
      UserModel.getAuthMeProfile(userId),
      MembershipModel.get(userId, establishmentId),
      MembershipModel.listUsedCalendarColors(establishmentId, userId),
      pool.query(`SELECT can_login, email FROM users WHERE id = $1`, [userId]),
    ]);
    if (!profile || !membership) {
      throw new NotFoundError('Profil introuvable');
    }
    const row = canLoginRow.rows[0] as { can_login?: boolean; email?: string } | undefined;
    return res.json(
      profilePayload(
        row?.email || email,
        profile,
        membership.calendar_color,
        row?.can_login !== false,
        used,
        normalizeUiPrefs(membership.ui_prefs)
      )
    );
  })
);

profileRoutes.patch(
  '/me/profile',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId, email } = requirePinActorUserId(req);
    const establishmentId = req.user!.establishment_id ?? null;
    if (!establishmentId) {
      throw new ValidationError('Aucun établissement actif');
    }

    const firstName =
      req.body.first_name !== undefined
        ? req.body.first_name == null
          ? null
          : String(req.body.first_name)
        : undefined;
    const lastName =
      req.body.last_name !== undefined
        ? req.body.last_name == null
          ? null
          : String(req.body.last_name)
        : undefined;
    const phone =
      req.body.phone !== undefined
        ? req.body.phone == null
          ? null
          : String(req.body.phone)
        : undefined;
    const dateOfBirth =
      req.body.date_of_birth !== undefined
        ? req.body.date_of_birth == null || req.body.date_of_birth === ''
          ? null
          : String(req.body.date_of_birth)
        : undefined;

    if (phone && !/^[\d\s\-+().]{0,40}$/.test(phone)) {
      throw new ValidationError('Numéro de téléphone invalide');
    }
    if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      throw new ValidationError('Date de naissance invalide (AAAA-MM-JJ)');
    }

    const personal = await UserModel.updatePersonalProfile(userId, {
      first_name: firstName,
      last_name: lastName,
      phone,
      date_of_birth: dateOfBirth,
    });

    let membership = await MembershipModel.get(userId, establishmentId);
    if (!membership) throw new NotFoundError('Profil introuvable');

    if (req.body.calendar_color != null && String(req.body.calendar_color).trim() !== '') {
      try {
        membership = await MembershipModel.setCalendarColor(
          userId,
          establishmentId,
          String(req.body.calendar_color)
        );
      } catch (error) {
        const code = (error as Error & { code?: string }).code;
        if (code === 'INVALID_COLOR') {
          throw new ValidationError('Couleur invalide (attendu #RRGGBB)');
        }
        if (code === 'COLOR_TAKEN') {
          throw new ValidationError('Cette couleur est déjà utilisée dans l’établissement');
        }
        throw error;
      }
    }

    if (req.body.ui_prefs !== undefined) {
      try {
        membership = await MembershipModel.setUiPrefs(
          userId,
          establishmentId,
          req.body.ui_prefs
        );
      } catch (error) {
        const code = (error as Error & { code?: string }).code;
        if (code === 'INVALID_UI_PREFS') {
          throw new ValidationError(
            error instanceof Error ? error.message : 'Préférences d’affichage invalides'
          );
        }
        throw error;
      }
    }

    // Reload so calendar_color + ui_prefs are both current after partial updates.
    membership = (await MembershipModel.get(userId, establishmentId)) ?? membership;

    const used = await MembershipModel.listUsedCalendarColors(establishmentId, userId);
    const canLoginRow = await pool.query(`SELECT can_login, email FROM users WHERE id = $1`, [
      userId,
    ]);
    const row = canLoginRow.rows[0] as { can_login?: boolean; email?: string } | undefined;
    return res.json(
      profilePayload(
        row?.email || email,
        personal,
        membership.calendar_color,
        row?.can_login !== false,
        used,
        normalizeUiPrefs(membership.ui_prefs)
      )
    );
  })
);

export default profileRoutes;
