'use client';

import Container from '@mui/material/Container';
import {
  Button, Card, CardContent, CardHeader, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';

import { useSettingsContext } from 'src/components/settings';
import Iconify from 'src/components/iconify';
import { get_media, create_media, update_media, delete_media } from 'src/components/api/api';

const EMPTY_FORM = { title: '', short_description: '', link: '', image: '' };

export default function MediaListView() {
  const settings = useSettingsContext();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const getData = async () => {
    const res = await get_media();
    if (res.status) setRows(res.data);
  };

  useEffect(() => { getData(); }, []);

  const handleOpen = (row = null) => {
    setSelected(row);
    setForm(row ? {
      title: row.title ?? '',
      short_description: row.short_description ?? '',
      link: row.link ?? '',
      image: row.image ?? '',
    } : EMPTY_FORM);
    setOpen(true);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    const payload = selected ? { ...form, id: selected.id } : form;
    const res = selected ? await update_media(payload) : await create_media(payload);
    if (res.status) {
      setOpen(false);
      getData();
    } else {
      alert(res.message || 'Error saving');
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete "${row.title}"?`)) return;
    const res = await delete_media({ id: row.id });
    if (res.status) getData();
    else alert(res.message || 'Error deleting');
  };

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <Card>
        <CardHeader
          title="Media"
          action={<Button variant="contained" onClick={() => handleOpen()}>Create</Button>}
        />
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Short Description</TableCell>
                <TableCell>Link</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>{r.title}</TableCell>
                  <TableCell>{r.short_description}</TableCell>
                  <TableCell>
                    {r.link ? (
                      <a href={r.link} target="_blank" rel="noreferrer">{r.link}</a>
                    ) : '-'}
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
        <DialogTitle>{selected ? 'Edit Media' : 'Create Media'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField fullWidth label="Title" name="title" value={form.title} onChange={handleChange} />
            <TextField fullWidth label="Short Description" name="short_description" value={form.short_description} onChange={handleChange} multiline rows={2} />
            <TextField fullWidth label="Image URL" name="image" value={form.image} onChange={handleChange} />
            <TextField fullWidth label="Link" name="link" value={form.link} onChange={handleChange} />
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
