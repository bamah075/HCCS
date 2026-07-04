'use client';

import Container from '@mui/material/Container';
import {
  Box, Button, Card, CardContent, CardHeader, Checkbox, Chip, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControlLabel, IconButton, MenuItem, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';

import { useSettingsContext } from 'src/components/settings';
import Iconify from 'src/components/iconify';
import {
  get_news, create_news, update_news, delete_news, get_news_categories,
} from 'src/components/api/api';

const EMPTY_FORM = {
  title: '',
  title_cn: '',
  body: '',
  body_cn: '',
  url: '',
  agency_name: '',
  content_type: '',
  hero_image_url: '',
  category_id: '',
  published_at: '',
  is_published: true,
};

function rowToForm(row) {
  if (!row) return EMPTY_FORM;
  return {
    title: row.title ?? '',
    title_cn: row.title_cn ?? '',
    body: row.body ?? '',
    body_cn: row.body_cn ?? '',
    url: row.url ?? '',
    agency_name: row.agency_name ?? '',
    content_type: row.content_type ?? '',
    hero_image_url: row.hero_image ?? '',
    category_id: row.category_id ?? '',
    published_at: row.published_at ? new Date(row.published_at).toISOString().slice(0, 10) : '',
    is_published: !!row.is_published,
  };
}

function formatDate(v) {
  if (!v) return '-';
  try { return new Date(v).toLocaleDateString(); } catch { return String(v); }
}

export default function NewsListView() {
  const settings = useSettingsContext();
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [heroFile, setHeroFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const getData = async () => {
    const [newsRes, catRes] = await Promise.all([get_news(), get_news_categories()]);
    if (newsRes.status) setRows(newsRes.data);
    if (catRes.status) setCategories(catRes.data);
  };

  useEffect(() => { getData(); }, []);

  const handleOpen = (row = null) => {
    setSelected(row);
    setForm(rowToForm(row));
    setHeroFile(null);
    setOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { alert('Title is required'); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        title_cn: form.title_cn,
        body: form.body,
        body_cn: form.body_cn,
        url: form.url,
        agency_name: form.agency_name,
        content_type: form.content_type,
        hero_image_url: form.hero_image_url,
        category_id: form.category_id,
        published_at: form.published_at,
        is_published: form.is_published ? 'true' : 'false',
      };
      if (heroFile) payload.hero_image_file = heroFile;
      if (selected) payload.id = selected.id;
      const res = selected ? await update_news(payload) : await create_news(payload);
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

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete article "${row.title}"?`)) return;
    const res = await delete_news({ id: row.id });
    if (res.status) getData();
    else alert(res.message || 'Error deleting');
  };

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <Card>
        <CardHeader
          title="News Articles"
          subheader="Bilingual EN/中文 — frontend reads from these rows on /hr-news"
          action={
            <Button variant="contained" startIcon={<Iconify icon="mdi:plus" />} onClick={() => handleOpen()}>
              Create
            </Button>
          }
        />
        <CardContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 60 }}>#</TableCell>
                <TableCell>Title</TableCell>
                <TableCell sx={{ width: 140 }}>Agency</TableCell>
                <TableCell sx={{ width: 120 }}>Published</TableCell>
                <TableCell sx={{ width: 100 }}>Status</TableCell>
                <TableCell align="right" sx={{ width: 100 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                    No articles yet. Click Create to add one.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>
                    <Stack spacing={0.25}>
                      <span>{r.title}</span>
                      {r.title_cn && (
                        <span style={{ fontSize: '0.78rem', color: '#666' }}>{r.title_cn}</span>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {r.agency_name ? <Chip label={r.agency_name} size="small" /> : '-'}
                  </TableCell>
                  <TableCell>{formatDate(r.published_at)}</TableCell>
                  <TableCell>
                    {r.is_published ? (
                      <Chip label="Published" color="success" size="small" />
                    ) : (
                      <Chip label="Draft" size="small" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleOpen(r)}>
                      <Iconify icon="mdi:pencil-outline" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(r)}>
                      <Iconify icon="mdi:trash-can-outline" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{selected ? `Edit Article #${selected.id}` : 'Create Article'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField fullWidth label="Title (EN)" name="title" value={form.title} onChange={handleChange} required />
              <TextField fullWidth label="标题 (中文)" name="title_cn" value={form.title_cn} onChange={handleChange} />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth label="Body (EN)" name="body" value={form.body} onChange={handleChange}
                multiline minRows={4} maxRows={14}
              />
              <TextField
                fullWidth label="正文 (中文)" name="body_cn" value={form.body_cn} onChange={handleChange}
                multiline minRows={4} maxRows={14}
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth label="Source URL"
                name="url" value={form.url} onChange={handleChange}
                placeholder="https://..." helperText="External link the card opens. Leave empty for in-house posts (no link)."
              />
              <TextField
                fullWidth label="Agency / Publication" name="agency_name"
                value={form.agency_name} onChange={handleChange}
                placeholder="e.g. CNA, MOM, Straits Times"
                helperText="Shown as a tag on the card."
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth label="Published date"
                name="published_at" type="date"
                value={form.published_at} onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth select label="Category (optional)"
                name="category_id" value={form.category_id} onChange={handleChange}
              >
                <MenuItem value="">— None —</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.text}</MenuItem>
                ))}
              </TextField>
              <TextField
                fullWidth select label="Content type (optional)"
                name="content_type" value={form.content_type || ''} onChange={handleChange}
                helperText="Optional. DB constraint allows only the four values below."
              >
                <MenuItem value="">— None —</MenuItem>
                <MenuItem value="FAQ">FAQ</MenuItem>
                <MenuItem value="Information">Information</MenuItem>
                <MenuItem value="Update">Update</MenuItem>
                <MenuItem value="Advisory">Advisory</MenuItem>
              </TextField>
            </Stack>

            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
              <Stack spacing={1.5}>
                <TextField
                  fullWidth label="Hero image — URL"
                  name="hero_image_url" value={form.hero_image_url} onChange={handleChange}
                  placeholder="https://..."
                  helperText="Paste a hosted image URL. Or upload a file below — file wins if both are set."
                />
                <Stack direction="row" spacing={2} alignItems="center">
                  <Button variant="outlined" component="label" startIcon={<Iconify icon="mdi:image-plus" />}>
                    {heroFile ? 'Change image' : 'Upload image'}
                    <input
                      hidden type="file" accept="image/*"
                      onChange={(e) => setHeroFile(e.target.files?.[0] ?? null)}
                    />
                  </Button>
                  {heroFile && (
                    <Chip
                      label={`${heroFile.name} (${Math.round(heroFile.size / 1024)} KB)`}
                      onDelete={() => setHeroFile(null)}
                    />
                  )}
                  {!heroFile && form.hero_image_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={form.hero_image_url} alt=""
                      style={{ height: 40, borderRadius: 4, objectFit: 'cover' }}
                    />
                  )}
                </Stack>
              </Stack>
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  name="is_published" checked={!!form.is_published} onChange={handleChange}
                />
              }
              label="Published (visible on /hr-news)"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : (selected ? 'Save changes' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
