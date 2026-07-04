'use client';

import Container from '@mui/material/Container';
import {
  Box, Button, Card, CardContent, CardHeader, Chip, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, InputAdornment, Stack, Table,
  TableBody, TableCell, TableHead, TablePagination, TableRow, TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

import { useSettingsContext } from 'src/components/settings';
import Iconify from 'src/components/iconify';
import { get_translations, update_translation } from 'src/components/api/api';

const EMPTY_FORM = { key: '', value_en: '', value_zh: '' };

export default function TranslationsListView() {
  const settings = useSettingsContext();
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const getData = async () => {
    const res = await get_translations();
    if (res.status) setRows(res.data || []);
    setLoaded(true);
  };

  useEffect(() => { getData(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      (r.key || '').toLowerCase().includes(q)
      || (r.value_en || '').toLowerCase().includes(q)
      || (r.value_zh || '').toLowerCase().includes(q)
    );
  }, [rows, query]);

  const pageRows = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleOpen = (row = null) => {
    setSelected(row);
    setForm(row ? { key: row.key, value_en: row.value_en || '', value_zh: row.value_zh || '' } : EMPTY_FORM);
    setOpen(true);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!form.key) { alert('Key is required'); return; }
    setSaving(true);
    try {
      const res = await update_translation(form);
      if (res.status) {
        setOpen(false);
        await getData();
      } else {
        alert(res.message || 'Error saving');
      }
    } finally {
      setSaving(false);
    }
  };

  const reuseEnglish = () => setForm((f) => ({ ...f, value_zh: f.value_en }));

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <Card>
        <CardHeader
          title="Translations"
          subheader="Search a key, click edit, save — frontend reflects changes within ~60s."
          action={
            <Button variant="contained" startIcon={<Iconify icon="mdi:plus" />} onClick={() => handleOpen()}>
              Add key
            </Button>
          }
        />
        <CardContent>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search by key or value..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(0); }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="mdi:magnify" />
                  </InputAdornment>
                ),
              }}
            />
            <Chip
              label={`${filtered.length} / ${rows.length}`}
              variant="outlined"
              sx={{ flexShrink: 0 }}
            />
          </Stack>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: '28%' }}>Key</TableCell>
                <TableCell sx={{ width: '32%' }}>English</TableCell>
                <TableCell sx={{ width: '32%' }}>中文</TableCell>
                <TableCell align="right" sx={{ width: '8%' }}>Edit</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loaded && pageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                    {query ? 'No keys match this search.' : 'No translations yet. Seed the table first.'}
                  </TableCell>
                </TableRow>
              )}
              {pageRows.map((r) => (
                <TableRow key={r.key} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem', verticalAlign: 'top' }}>
                    {r.key}
                  </TableCell>
                  <TableCell sx={{ verticalAlign: 'top', whiteSpace: 'pre-wrap' }}>
                    <Typography variant="body2" color={r.value_en ? 'text.primary' : 'text.disabled'}>
                      {r.value_en || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ verticalAlign: 'top', whiteSpace: 'pre-wrap' }}>
                    <Typography variant="body2" color={r.value_zh ? 'text.primary' : 'text.disabled'}>
                      {r.value_zh || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ verticalAlign: 'top' }}>
                    <IconButton size="small" onClick={() => handleOpen(r)}>
                      <Iconify icon="mdi:pencil-outline" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <TablePagination
            component="div"
            count={filtered.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[25, 50, 100]}
          />
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{selected ? 'Edit translation' : 'Add translation'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Key (dot-notation)"
              name="key"
              value={form.key}
              onChange={handleChange}
              disabled={!!selected}
              fullWidth
              helperText={selected ? 'Cannot change key for existing rows.' : 'e.g. common.complianceScan'}
              InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
            />
            <TextField
              label="English"
              name="value_en"
              value={form.value_en}
              onChange={handleChange}
              fullWidth
              multiline
              minRows={2}
              maxRows={12}
            />
            <Box>
              <TextField
                label="中文 (Chinese)"
                name="value_zh"
                value={form.value_zh}
                onChange={handleChange}
                fullWidth
                multiline
                minRows={2}
                maxRows={12}
              />
              <Button size="small" sx={{ mt: 0.5 }} onClick={reuseEnglish}>
                Reuse English
              </Button>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
