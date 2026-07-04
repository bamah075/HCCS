'use client';

import Container from '@mui/material/Container';
import {
  Button, Card, CardContent, CardHeader, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, Table, TableBody,
  TableCell, TableHead, TableRow, TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';

import { useSettingsContext } from 'src/components/settings';
import Iconify from 'src/components/iconify';
import {
  get_news_categories,
  create_news_category,
  update_news_category,
  delete_news_category,
} from 'src/components/api/api';

const EMPTY_FORM = { text: '' };

export default function NewsCategoryListView() {
  const settings = useSettingsContext();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const getData = async () => {
    const res = await get_news_categories();
    if (res.status) setRows(res.data);
  };

  useEffect(() => { getData(); }, []);

  const handleOpen = (row = null) => {
    setSelected(row);
    setForm(row ? { text: row.text } : EMPTY_FORM);
    setOpen(true);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    const payload = selected ? { ...form, id: selected.id } : form;
    const res = selected ? await update_news_category(payload) : await create_news_category(payload);
    if (res.status) {
      setOpen(false);
      getData();
    } else {
      alert(res.message || 'Error saving');
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete category "${row.text}"?`)) return;
    const res = await delete_news_category({ id: row.id });
    if (res.status) getData();
    else alert(res.message || 'Error deleting');
  };

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <Card>
        <CardHeader
          title="News Categories"
          action={<Button variant="contained" onClick={() => handleOpen()}>Create</Button>}
        />
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Name</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>{r.text}</TableCell>
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

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{selected ? 'Edit Category' : 'Create Category'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth margin="dense"
            label="Category Name" name="text"
            value={form.text} onChange={handleChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>Save</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
