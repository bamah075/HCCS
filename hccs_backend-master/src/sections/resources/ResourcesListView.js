'use client';

import Container from '@mui/material/Container';
import {
  Button, Card, CardContent, CardHeader, Checkbox, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControlLabel, IconButton, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';

import { useSettingsContext } from 'src/components/settings';
import Iconify from 'src/components/iconify';
import { get_resources, create_resource, update_resource, delete_resource } from 'src/components/api/api';

const TIER_FLAGS = ['public', 'free', 'essential', 'professional', 'strategic'];

const EMPTY_FORM = {
  title: '', short_description: '', link: '',
  public: 0, free: 0, essential: 0, professional: 0, strategic: 0,
};

export default function ResourcesListView() {
  const settings = useSettingsContext();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const getData = async () => {
    const res = await get_resources();
    if (res.status) setRows(res.data);
  };

  useEffect(() => { getData(); }, []);

  const handleOpen = (row = null) => {
    setSelected(row);
    setForm(row ? {
      title: row.title ?? '',
      short_description: row.short_description ?? '',
      link: row.link ?? '',
      public: row.public ?? 0,
      free: row.free ?? 0,
      essential: row.essential ?? 0,
      professional: row.professional ?? 0,
      strategic: row.strategic ?? 0,
    } : EMPTY_FORM);
    setOpen(true);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCheckbox = (name, checked) => setForm({ ...form, [name]: checked ? 1 : 0 });

  const handleSubmit = async () => {
    const payload = selected ? { ...form, id: selected.id } : form;
    const res = selected ? await update_resource(payload) : await create_resource(payload);
    if (res.status) {
      setOpen(false);
      getData();
    } else {
      alert(res.message || 'Error saving');
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete "${row.title}"?`)) return;
    const res = await delete_resource({ id: row.id });
    if (res.status) getData();
    else alert(res.message || 'Error deleting');
  };

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <Card>
        <CardHeader
          title="Resources"
          action={<Button variant="contained" onClick={() => handleOpen()}>Create</Button>}
        />
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Tiers</TableCell>
                <TableCell>Link</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>{r.title}</TableCell>
                  <TableCell>
                    {TIER_FLAGS.filter((f) => r[f]).join(', ') || '-'}
                  </TableCell>
                  <TableCell>
                    {r.link ? <a href={r.link} target="_blank" rel="noreferrer">{r.link}</a> : '-'}
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

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{selected ? 'Edit Resource' : 'Create Resource'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField fullWidth label="Title" name="title" value={form.title} onChange={handleChange} />
            <TextField fullWidth label="Short Description" name="short_description" value={form.short_description} onChange={handleChange} multiline rows={2} />
            <TextField fullWidth label="Link" name="link" value={form.link} onChange={handleChange} />
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {TIER_FLAGS.map((flag) => (
                <FormControlLabel
                  key={flag}
                  control={
                    <Checkbox
                      checked={Boolean(form[flag])}
                      onChange={(e) => handleCheckbox(flag, e.target.checked)}
                    />
                  }
                  label={flag.charAt(0).toUpperCase() + flag.slice(1)}
                />
              ))}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>Save</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
