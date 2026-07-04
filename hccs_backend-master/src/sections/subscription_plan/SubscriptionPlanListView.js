'use client';

import Container from '@mui/material/Container';
import {
  Button, Card, CardContent, CardHeader, Chip, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, MenuItem, Stack, Switch,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip,
} from '@mui/material';
import { useEffect, useState } from 'react';

import { useSettingsContext } from 'src/components/settings';
import Iconify from 'src/components/iconify';
import {
  get_subscription_plans,
  create_subscription_plan,
  update_subscription_plan,
  delete_subscription_plan,
  get_user_tiers,
} from 'src/components/api/api';

const BILLING_CYCLES = ['monthly', 'annual'];

const EMPTY_FORM = {
  name: '',
  user_tier_id: '',
  billing_cycle: 'monthly',
  price: '',
  currency: 'MYR',
  description: '',
  is_active: 1,
};

export default function SubscriptionPlanListView() {
  const settings = useSettingsContext();
  const [rows, setRows] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const getData = async () => {
    const [plansRes, tiersRes] = await Promise.all([
      get_subscription_plans(),
      get_user_tiers(),
    ]);
    if (plansRes.status) setRows(plansRes.data);
    if (tiersRes.status) setTiers(tiersRes.data);
  };

  useEffect(() => { getData(); }, []);

  const handleOpen = (row = null) => {
    setSelected(row);
    setForm(row ? {
      name: row.name ?? '',
      user_tier_id: row.user_tier_id ?? '',
      billing_cycle: row.billing_cycle ?? 'monthly',
      price: row.price ?? '',
      currency: row.currency ?? 'MYR',
      description: row.description ?? '',
      is_active: row.is_active ?? 1,
    } : EMPTY_FORM);
    setOpen(true);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!form.name || !form.user_tier_id || !form.price) {
      alert('Name, tier, and price are required.');
      return;
    }
    const payload = selected ? { ...form, id: selected.id } : form;
    const res = selected
      ? await update_subscription_plan(payload)
      : await create_subscription_plan(payload);
    if (res.status) {
      setOpen(false);
      getData();
    } else {
      alert(res.message || 'Error saving');
    }
  };

  const handleToggleActive = async (row) => {
    const res = await update_subscription_plan({
      id: row.id,
      name: row.name,
      user_tier_id: row.user_tier_id,
      billing_cycle: row.billing_cycle,
      price: row.price,
      currency: row.currency,
      description: row.description ?? '',
      is_active: row.is_active ? 0 : 1,
    });
    if (res.status) getData();
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete plan "${row.name}"? This cannot be undone.`)) return;
    const res = await delete_subscription_plan({ id: row.id });
    if (res.status) getData();
    else alert(res.message || 'Error deleting');
  };

  const getTierName = (id) => tiers.find((t) => t.id === id)?.name ?? id;

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <Card>
        <CardHeader
          title="Subscription Plans"
          action={<Button variant="contained" onClick={() => handleOpen()}>Create Plan</Button>}
        />
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Tier</TableCell>
                <TableCell>Billing Cycle</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Active</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={r.user_tier?.name ?? getTierName(r.user_tier_id)}
                      size="small"
                      color={r.user_tier_id === 1 ? 'default' : 'primary'}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={r.billing_cycle}
                      size="small"
                      variant="outlined"
                      color={r.billing_cycle === 'annual' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>{r.currency} {Number(r.price).toFixed(2)}</TableCell>
                  <TableCell sx={{ maxWidth: 200, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {r.description ?? '-'}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={r.is_active ? 'Deactivate' : 'Activate'}>
                      <Switch
                        size="small"
                        checked={Boolean(r.is_active)}
                        onChange={() => handleToggleActive(r)}
                      />
                    </Tooltip>
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
        <DialogTitle>{selected ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              fullWidth label="Plan Name" name="name"
              value={form.name} onChange={handleChange}
              placeholder="e.g. Professional Monthly"
            />

            <TextField
              fullWidth select label="Tier" name="user_tier_id"
              value={form.user_tier_id} onChange={handleChange}
            >
              {tiers.filter((t) => t.id !== 1).map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth select label="Billing Cycle" name="billing_cycle"
              value={form.billing_cycle} onChange={handleChange}
            >
              {BILLING_CYCLES.map((c) => (
                <MenuItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</MenuItem>
              ))}
            </TextField>

            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth label="Price" name="price" type="number"
                inputProps={{ min: 0, step: '0.01' }}
                value={form.price} onChange={handleChange}
              />
              <TextField
                label="Currency" name="currency"
                value={form.currency} onChange={handleChange}
                sx={{ width: 120 }}
              />
            </Stack>

            <TextField
              fullWidth label="Description" name="description"
              value={form.description} onChange={handleChange}
              multiline rows={2}
            />

            <TextField
              fullWidth select label="Status" name="is_active"
              value={form.is_active} onChange={handleChange}
            >
              <MenuItem value={1}>Active</MenuItem>
              <MenuItem value={0}>Inactive</MenuItem>
            </TextField>
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
