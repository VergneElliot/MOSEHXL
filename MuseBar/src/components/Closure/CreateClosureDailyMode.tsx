import React from 'react';
import {
  Alert,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material';
import type { DailyClosureMode } from './createClosureTypes';

type Props = {
  dailyMode: DailyClosureMode;
  cutTime: string;
  onChange: (mode: DailyClosureMode) => void;
};

const CreateClosureDailyMode: React.FC<Props> = ({ dailyMode, cutTime, onChange }) => (
  <FormControl component="fieldset">
    <Typography variant="subtitle2" gutterBottom>
      Mode journalier
    </Typography>
    <RadioGroup value={dailyMode} onChange={(e) => onChange(e.target.value as DailyClosureMode)}>
      <FormControlLabel
        value="close_now"
        control={<Radio size="small" />}
        label="Clôturer maintenant (depuis la dernière clôture → maintenant)"
      />
      <FormControlLabel
        value="business_day"
        control={<Radio size="small" />}
        label="Clôturer une journée commerciale (date + heure de coupure)"
      />
    </RadioGroup>
    <Alert severity="info" sx={{ mt: 1 }}>
      {dailyMode === 'close_now' ? (
        <>
          Inclut toutes les ventes depuis la fin de la dernière clôture journalière
          jusqu’à l’instant présent. Idéal en fin de service.
        </>
      ) : (
        <>
          Journée commerciale : de <strong>{cutTime}</strong> le jour choisi jusqu’à{' '}
          <strong>{cutTime}</strong> le lendemain (paramètre « heure de clôture »). Les
          ventes déjà couvertes par une clôture précédente sont exclues.
        </>
      )}
    </Alert>
  </FormControl>
);

export default CreateClosureDailyMode;
