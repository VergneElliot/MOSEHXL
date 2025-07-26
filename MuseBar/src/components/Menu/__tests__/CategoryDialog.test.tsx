import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CategoryDialog from '../CategoryDialog';
import { Category } from '../../../types';

// Mock theme
const theme = createTheme();

// Mock data
const mockCategory: Category = {
  id: '1',
  name: 'Test Category',
  description: 'Test description',
  color: '#1976d2',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

const defaultProps = {
  open: true,
  onClose: jest.fn(),
  onSubmit: jest.fn(),
  form: {
    name: '',
    description: '',
    color: '#1976d2'
  },
  onFormChange: jest.fn(),
  editingCategory: null,
  loading: false,
  error: null
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('CategoryDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render create dialog correctly', () => {
    renderWithTheme(<CategoryDialog {...defaultProps} />);

    expect(screen.getByText('Nouvelle Catégorie')).toBeInTheDocument();
    expect(screen.getByLabelText('Nom de la catégorie')).toBeInTheDocument();
    expect(screen.getByLabelText('Description (optionnel)')).toBeInTheDocument();
    expect(screen.getByText('Couleur de la catégorie')).toBeInTheDocument();
    expect(screen.getByText('Créer')).toBeInTheDocument();
    expect(screen.getByText('Annuler')).toBeInTheDocument();
  });

  it('should render edit dialog correctly', () => {
    const props = {
      ...defaultProps,
      editingCategory: mockCategory,
      form: {
        name: mockCategory.name,
        description: mockCategory.description || '',
        color: mockCategory.color || '#1976d2'
      }
    };

    renderWithTheme(<CategoryDialog {...props} />);

    expect(screen.getByText('Modifier la Catégorie')).toBeInTheDocument();
    expect(screen.getByText(`Modification de la catégorie "${mockCategory.name}"`)).toBeInTheDocument();
    expect(screen.getByDisplayValue(mockCategory.name)).toBeInTheDocument();
    expect(screen.getByDisplayValue(mockCategory.description || '')).toBeInTheDocument();
    expect(screen.getByText('Modifier')).toBeInTheDocument();
  });

  it('should call onClose when cancel button is clicked', async () => {
    const onClose = jest.fn();
    renderWithTheme(<CategoryDialog {...defaultProps} onClose={onClose} />);

    const cancelButton = screen.getByText('Annuler');
    await userEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onSubmit when form is submitted', async () => {
    const onSubmit = jest.fn();
    renderWithTheme(<CategoryDialog {...defaultProps} onSubmit={onSubmit} />);

    const submitButton = screen.getByText('Créer');
    await userEvent.click(submitButton);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('should call onFormChange when name field changes', async () => {
    const onFormChange = jest.fn();
    renderWithTheme(<CategoryDialog {...defaultProps} onFormChange={onFormChange} />);

    const nameInput = screen.getByLabelText('Nom de la catégorie');
    await userEvent.type(nameInput, 'New Category');

    expect(onFormChange).toHaveBeenCalledWith('name', 'New Category');
  });

  it('should call onFormChange when description field changes', async () => {
    const onFormChange = jest.fn();
    renderWithTheme(<CategoryDialog {...defaultProps} onFormChange={onFormChange} />);

    const descriptionInput = screen.getByLabelText('Description (optionnel)');
    await userEvent.type(descriptionInput, 'New description');

    expect(onFormChange).toHaveBeenCalledWith('description', 'New description');
  });

  it('should call onFormChange when color field changes', async () => {
    const onFormChange = jest.fn();
    renderWithTheme(<CategoryDialog {...defaultProps} onFormChange={onFormChange} />);

    const colorSelect = screen.getByText('Couleur de la catégorie');
    await userEvent.click(colorSelect);

    const greenOption = screen.getByText('Vert');
    await userEvent.click(greenOption);

    expect(onFormChange).toHaveBeenCalledWith('color', '#2e7d32');
  });

  it('should display error message when error prop is provided', () => {
    const errorMessage = 'This is an error message';
    renderWithTheme(<CategoryDialog {...defaultProps} error={errorMessage} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-standardError');
  });

  it('should disable submit button when loading is true', () => {
    renderWithTheme(<CategoryDialog {...defaultProps} loading={true} />);

    const submitButton = screen.getByText('Enregistrement...');
    expect(submitButton).toBeDisabled();
  });

  it('should disable submit button when name is empty', () => {
    renderWithTheme(<CategoryDialog {...defaultProps} form={{ ...defaultProps.form, name: '' }} />);

    const submitButton = screen.getByText('Créer');
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when name is provided', () => {
    renderWithTheme(<CategoryDialog {...defaultProps} form={{ ...defaultProps.form, name: 'Test Category' }} />);

    const submitButton = screen.getByText('Créer');
    expect(submitButton).not.toBeDisabled();
  });

  it('should show color preview', () => {
    const props = {
      ...defaultProps,
      form: {
        name: 'Test Category',
        description: '',
        color: '#d32f2f'
      }
    };

    renderWithTheme(<CategoryDialog {...props} />);

    expect(screen.getByText('Test Category')).toBeInTheDocument();
    const previewBox = screen.getByText('Test Category').closest('div');
    expect(previewBox).toHaveStyle({ backgroundColor: '#d32f2f' });
  });

  it('should show all color options', async () => {
    renderWithTheme(<CategoryDialog {...defaultProps} />);

    const colorSelect = screen.getByText('Couleur de la catégorie');
    await userEvent.click(colorSelect);

    expect(screen.getByText('Bleu (Défaut)')).toBeInTheDocument();
    expect(screen.getByText('Vert')).toBeInTheDocument();
    expect(screen.getByText('Orange')).toBeInTheDocument();
    expect(screen.getByText('Rouge')).toBeInTheDocument();
    expect(screen.getByText('Violet')).toBeInTheDocument();
    expect(screen.getByText('Bleu clair')).toBeInTheDocument();
  });

  it('should handle form submission with preventDefault', async () => {
    const onSubmit = jest.fn();
    renderWithTheme(<CategoryDialog {...defaultProps} onSubmit={onSubmit} form={{ ...defaultProps.form, name: 'Test' }} />);

    const form = screen.getByRole('form');
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    
    fireEvent(form, submitEvent);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('should not render when open is false', () => {
    renderWithTheme(<CategoryDialog {...defaultProps} open={false} />);

    expect(screen.queryByText('Nouvelle Catégorie')).not.toBeInTheDocument();
  });

  it('should show loading state correctly', () => {
    renderWithTheme(<CategoryDialog {...defaultProps} loading={true} form={{ ...defaultProps.form, name: 'Test' }} />);

    expect(screen.getByText('Enregistrement...')).toBeInTheDocument();
    expect(screen.getByText('Enregistrement...')).toBeDisabled();
  });

  it('should handle empty description', () => {
    renderWithTheme(<CategoryDialog {...defaultProps} />);

    const descriptionInput = screen.getByLabelText('Description (optionnel)');
    expect(descriptionInput).toHaveValue('');
  });

  it('should handle multiline description', async () => {
    const onFormChange = jest.fn();
    renderWithTheme(<CategoryDialog {...defaultProps} onFormChange={onFormChange} />);

    const descriptionInput = screen.getByLabelText('Description (optionnel)');
    await userEvent.type(descriptionInput, 'Line 1\nLine 2\nLine 3');

    expect(onFormChange).toHaveBeenCalledWith('description', 'Line 1\nLine 2\nLine 3');
  });
}); 