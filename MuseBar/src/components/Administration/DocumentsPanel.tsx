import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  deleteDocument,
  getDocumentCategories,
  getDocumentDownloadUrl,
  listDocuments,
  updateDocument,
  uploadDocument,
  type AdminDocumentDto,
} from '../../services/api/adminSpace';

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

const DocumentsPanel: React.FC = () => {
  const [documents, setDocuments] = useState<AdminDocumentDto[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; label: string }>>([]);
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [storageConfigured, setStorageConfigured] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<AdminDocumentDto | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('autre');
  const [expiresAt, setExpiresAt] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [docsRes, cats] = await Promise.all([
        listDocuments({ category: category || undefined, q: q || undefined }),
        getDocumentCategories(),
      ]);
      setDocuments(docsRes.documents);
      setStorageConfigured(docsRes.storageConfigured);
      setCategories(cats.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible');
    }
  }, [category, q]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleUpload = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('title', title || file.name);
      form.append('category', uploadCategory);
      if (expiresAt) form.append('expires_at', expiresAt);
      await uploadDocument(form);
      setUploadOpen(false);
      setFile(null);
      setTitle('');
      setExpiresAt('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload impossible');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editDoc) return;
    setBusy(true);
    try {
      await updateDocument(editDoc.id, {
        title: editDoc.title,
        category: editDoc.category,
        expires_at: editDoc.expires_at,
      });
      setEditDoc(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible');
    } finally {
      setBusy(false);
    }
  };

  const categoryLabel = (id: string) => categories.find((c) => c.id === id)?.label ?? id;

  return (
    <Box>
      {!storageConfigured && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Stockage objet (DigitalOcean Spaces) non configuré côté serveur — les uploads échoueront
          jusqu&apos;à la configuration des variables SPACES_*.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
        <TextField
          size="small"
          label="Recherche"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Catégorie</InputLabel>
          <Select
            label="Catégorie"
            value={category}
            onChange={(e) => setCategory(String(e.target.value))}
          >
            <MenuItem value="">Toutes</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={() => setUploadOpen(true)}>
          Importer un document
        </Button>
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Titre</TableCell>
            <TableCell>Catégorie</TableCell>
            <TableCell>Expiration</TableCell>
            <TableCell>Source</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {documents.map((doc) => {
            const days = daysUntil(doc.expires_at);
            const expiring = days != null && days <= 30;
            return (
              <TableRow key={doc.id} sx={{ bgcolor: expiring ? 'warning.light' : undefined }}>
                <TableCell>
                  <Typography fontWeight={600}>{doc.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {doc.file_name}
                  </Typography>
                </TableCell>
                <TableCell>{categoryLabel(doc.category)}</TableCell>
                <TableCell>
                  {doc.expires_at ? (
                    <Chip
                      size="small"
                      color={days != null && days <= 7 ? 'error' : expiring ? 'warning' : 'default'}
                      label={`${doc.expires_at}${days != null ? ` (${days}j)` : ''}`}
                    />
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>{doc.source}</TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    onClick={async () => {
                      const { url } = await getDocumentDownloadUrl(doc.id);
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    Télécharger
                  </Button>
                  <Button size="small" onClick={() => setEditDoc({ ...doc })}>
                    Modifier
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    onClick={async () => {
                      if (!window.confirm('Archiver ce document ?')) return;
                      await deleteDocument(doc.id);
                      await refresh();
                    }}
                  >
                    Archiver
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
          {documents.length === 0 && (
            <TableRow>
              <TableCell colSpan={5}>
                <Typography color="text.secondary">Aucun document</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Importer un document</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Button variant="outlined" component="label">
            Choisir un fichier
            <input
              hidden
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Button>
          {file && <Typography variant="body2">{file.name}</Typography>}
          <TextField label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
          <FormControl fullWidth>
            <InputLabel>Catégorie</InputLabel>
            <Select
              label="Catégorie"
              value={uploadCategory}
              onChange={(e) => setUploadCategory(String(e.target.value))}
            >
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Date d'expiration"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadOpen(false)}>Annuler</Button>
          <Button variant="contained" disabled={!file || busy} onClick={() => void handleUpload()}>
            Importer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editDoc} onClose={() => setEditDoc(null)} fullWidth maxWidth="sm">
        <DialogTitle>Modifier le document</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {editDoc && (
            <>
              <TextField
                label="Titre"
                value={editDoc.title}
                onChange={(e) => setEditDoc({ ...editDoc, title: e.target.value })}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Catégorie</InputLabel>
                <Select
                  label="Catégorie"
                  value={editDoc.category}
                  onChange={(e) => setEditDoc({ ...editDoc, category: String(e.target.value) })}
                >
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Date d'expiration"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={editDoc.expires_at?.slice(0, 10) ?? ''}
                onChange={(e) =>
                  setEditDoc({ ...editDoc, expires_at: e.target.value || null })
                }
                fullWidth
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDoc(null)}>Annuler</Button>
          <Button variant="contained" disabled={busy} onClick={() => void handleSaveEdit()}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentsPanel;
