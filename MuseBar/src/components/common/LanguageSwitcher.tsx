import React from 'react';
import { Button, ButtonGroup } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { AppLanguage, setAppLanguage } from '../../i18n';

interface LanguageSwitcherProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'inherit';
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  size = 'small',
  color = 'inherit',
}) => {
  const { t, i18n } = useTranslation('common');
  const currentLanguage = i18n.language.startsWith('fr') ? 'fr' : 'en';

  const handleLanguageChange = (language: AppLanguage) => {
    if (language !== currentLanguage) {
      setAppLanguage(language);
    }
  };

  return (
    <ButtonGroup size={size} color={color} variant="outlined" aria-label="language switcher">
      <Button
        onClick={() => handleLanguageChange('en')}
        variant={currentLanguage === 'en' ? 'contained' : 'outlined'}
      >
        {t('language.en')}
      </Button>
      <Button
        onClick={() => handleLanguageChange('fr')}
        variant={currentLanguage === 'fr' ? 'contained' : 'outlined'}
      >
        {t('language.fr')}
      </Button>
    </ButtonGroup>
  );
};
