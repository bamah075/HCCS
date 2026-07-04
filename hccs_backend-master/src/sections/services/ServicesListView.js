'use client';

import Container from '@mui/material/Container';
import {
  Button, Card, CardContent, CardHeader, Chip, Collapse, Dialog,
  DialogActions, DialogContent, DialogTitle, Divider, IconButton,
  List, ListItem, ListItemText, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

import { useSettingsContext } from 'src/components/settings';
import Iconify from 'src/components/iconify';
import {
  get_services, create_service, update_service, delete_service,
  create_service_feature, delete_service_feature,
  create_service_help, delete_service_help,
} from 'src/components/api/api';

const EMPTY_FORM = { title: '', short_description: '', long_description: '', slug: '' };

export default function ServicesListView() {
  const settings = useSettingsContext();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [expandedId, setExpandedId] = useState(null);

  // sub-item input state
  const [featureInput, setFeatureInput] = useState('');
  const [helpInput, setHelpInput] = useState('');

  const getData = async () => {
    const res = await get_services();
    if (res.status) setRows(res.data);
  };

  useEffect(() => { getData(); }, []);

  const handleOpen = (row = null) => {
    setSelected(row);
    setForm(row ? {
      title: row.title ?? '',
      short_description: row.short_description ?? '',
      long_description: row.long_description ?? '',
      slug: row.slug ?? '',
    } : EMPTY_FORM);
    setOpen(true);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    const payload = selected ? { ...form, id: selected.id } : form;
    const res = selected ? await update_service(payload) : await create_service(payload);
    if (res.status) {
      setOpen(false);
      getData();
    } else {
      alert(res.message || 'Error saving');
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete service "${row.title}"?`)) return;
    const res = await delete_service({ id: row.id });
    if (res.status) getData();
    else alert(res.message || 'Error deleting');
  };

  const handleAddFeature = async (serviceId) => {
    if (!featureInput.trim()) return;
    const res = await create_service_feature({ services_id: serviceId, text: featureInput.trim() });
    if (res.status) { setFeatureInput(''); getData(); }
    else alert(res.message || 'Error adding feature');
  };

  const handleDeleteFeature = async (id) => {
    const res = await delete_service_feature({ id });
    if (res.status) getData();
    else alert(res.message || 'Error deleting feature');
  };

  const handleAddHelp = async (serviceId) => {
    if (!helpInput.trim()) return;
    const res = await create_service_help({ services_id: serviceId, text: helpInput.trim() });
    if (res.status) { setHelpInput(''); getData(); }
    else alert(res.message || 'Error adding help item');
  };

  const handleDeleteHelp = async (id) => {
    const res = await delete_service_help({ id });
    if (res.status) getData();
    else alert(res.message || 'Error deleting help item');
  };

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <Card>
        <CardHeader
          title="Services"
          action={<Button variant="contained" onClick={() => handleOpen()}>Create</Button>}
        />
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Slug</TableCell>
                <TableCell>Features</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <>
                  <TableRow key={r.id}>
                    <TableCell>{r.id}</TableCell>
                    <TableCell>{r.title}</TableCell>
                    <TableCell>{r.slug}</TableCell>
                    <TableCell>
                      <Chip label={`${r.services_features?.length ?? 0} features`} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                        <Iconify icon={expandedId === r.id ? 'mdi:chevron-up' : 'mdi:chevron-down'} />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleOpen(r)}>
                        <Iconify icon="mdi:pencil-outline" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(r)}>
                        <Iconify icon="mdi:trash-can-outline" />
                      </IconButton>
                    </TableCell>
                  </TableRow>

                  {expandedId === r.id && (
                    <TableRow key={`${r.id}-expand`}>
                      <TableCell colSpan={5} sx={{ p: 2, bgcolor: 'background.neutral' }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                          {/* Features */}
                          <Stack flex={1} spacing={1}>
                            <Typography variant="subtitle2">Features</Typography>
                            <List dense disablePadding>
                              {(r.services_features ?? []).map((f) => (
                                <ListItem key={f.id} disableGutters secondaryAction={
                                  <IconButton size="small" color="error" onClick={() => handleDeleteFeature(f.id)}>
                                    <Iconify icon="mdi:trash-can-outline" />
                                  </IconButton>
                                }>
                                  <ListItemText primary={f.text} />
                                </ListItem>
                              ))}
                            </List>
                            <Stack direction="row" spacing={1}>
                              <TextField
                                size="small" fullWidth
                                placeholder="Add feature..." value={featureInput}
                                onChange={(e) => setFeatureInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddFeature(r.id)}
                              />
                              <Button variant="outlined" onClick={() => handleAddFeature(r.id)}>Add</Button>
                            </Stack>
                          </Stack>

                          <Divider orientation="vertical" flexItem />

                          {/* Help */}
                          <Stack flex={1} spacing={1}>
                            <Typography variant="subtitle2">Help Items</Typography>
                            <List dense disablePadding>
                              {(r.services_help ?? []).map((h) => (
                                <ListItem key={h.id} disableGutters secondaryAction={
                                  <IconButton size="small" color="error" onClick={() => handleDeleteHelp(h.id)}>
                                    <Iconify icon="mdi:trash-can-outline" />
                                  </IconButton>
                                }>
                                  <ListItemText primary={h.text} />
                                </ListItem>
                              ))}
                            </List>
                            <Stack direction="row" spacing={1}>
                              <TextField
                                size="small" fullWidth
                                placeholder="Add help item..." value={helpInput}
                                onChange={(e) => setHelpInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddHelp(r.id)}
                              />
                              <Button variant="outlined" onClick={() => handleAddHelp(r.id)}>Add</Button>
                            </Stack>
                          </Stack>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{selected ? 'Edit Service' : 'Create Service'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField fullWidth label="Title" name="title" value={form.title} onChange={handleChange} />
            <TextField fullWidth label="Slug" name="slug" value={form.slug} onChange={handleChange} />
            <TextField fullWidth label="Short Description" name="short_description" value={form.short_description} onChange={handleChange} multiline rows={2} />
            <TextField fullWidth label="Long Description" name="long_description" value={form.long_description} onChange={handleChange} multiline rows={4} />
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
