'use client';

import { useEffect, useState, useCallback } from 'react';
import Container from '@mui/material/Container';
import {
    Alert, Box, Button, Card, CardContent, CardHeader, Chip, CircularProgress, Dialog,
    DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Table, TableBody, TableCell,
    TableHead, TableRow, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';

import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';

function fmtSgd(n) {
    const v = Number(n) || 0;
    return `S$${v.toLocaleString('en-SG')}`;
}
function fmtDate(s) {
    if (!s) return '—';
    try { return new Date(s).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return String(s); }
}
function daysFromNow(iso) {
    if (!iso) return null;
    try { return Math.round((new Date(iso).getTime() - Date.now()) / 86400000); }
    catch { return null; }
}

const TABS = [
    { key: 'expiring_soon', label: 'Expiring soon (14d)' },
    { key: 'active',        label: 'Active' },
    { key: 'past_due',      label: 'Past due' },
    { key: 'suspended',     label: 'Suspended' },
    { key: 'expired',       label: 'Expired' },
    { key: 'cancelled',     label: 'Cancelled' },
    { key: 'all',           label: 'All' },
];

const STATUS_COLORS = {
    active: 'success',
    past_due: 'warning',
    suspended: 'default',
    expired: 'default',
    cancelled: 'error',
    pending: 'info',
};

const ACTIONS = [
    { key: 'extend',  label: 'Extend',  icon: 'mdi:calendar-plus',  color: 'primary',  needsDays: true,  needsReason: false },
    { key: 'suspend', label: 'Suspend', icon: 'mdi:pause-circle',   color: 'warning',  needsDays: false, needsReason: true  },
    { key: 'resume',  label: 'Resume',  icon: 'mdi:play-circle',    color: 'success',  needsDays: false, needsReason: false },
    { key: 'cancel',  label: 'Cancel',  icon: 'mdi:close-circle',   color: 'error',    needsDays: false, needsReason: true  },
];

function actionAllowed(action, status) {
    if (action === 'resume') return status === 'suspended';
    if (action === 'suspend') return status === 'active' || status === 'past_due';
    if (action === 'cancel')  return status !== 'cancelled' && status !== 'expired';
    if (action === 'extend')  return ['active', 'past_due', 'suspended'].includes(status);
    return false;
}

export default function SubscriptionsView() {
    const settings = useSettingsContext();
    const [tab, setTab] = useState('expiring_soon');
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialog, setDialog] = useState(null); // { row, action }
    const [days, setDays] = useState(7);
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const url = `/api/subscriptions?status=${tab}`;
            const res = await fetch(url, { cache: 'no-store' });
            const data = await res.json();
            setRows(data.status ? (data.data || []) : []);
            if (!data.status) setToast({ kind: 'error', text: data.message || 'Could not load.' });
        } finally {
            setLoading(false);
        }
    }, [tab]);

    useEffect(() => { load(); }, [load]);

    const openDialog = (row, action) => {
        setDialog({ row, action });
        setDays(7);
        setReason('');
    };
    const closeDialog = () => setDialog(null);

    const submit = async () => {
        if (!dialog) return;
        setSubmitting(true);
        try {
            const res = await fetch('/api/subscriptions/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: dialog.row.id, action: dialog.action.key, days, reason }),
            });
            const data = await res.json();
            if (data.status) {
                setToast({ kind: 'success', text: `${dialog.action.label} applied to sub #${dialog.row.id}.` });
                closeDialog();
                await load();
            } else {
                setToast({ kind: 'error', text: data.message || 'Action failed.' });
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container maxWidth={settings.themeStretch ? false : 'xl'}>
            <Card>
                <CardHeader
                    avatar={<Iconify icon="mdi:autorenew" sx={{ fontSize: 28, color: 'primary.main' }} />}
                    title="Subscriptions"
                    subheader="Lifecycle dashboard for manual-PayNow and gateway subscriptions. Daily cron handles nags + auto-demote at end of grace."
                    action={
                        <Button size="small" onClick={load} startIcon={<Iconify icon="mdi:refresh" />}>Refresh</Button>
                    }
                />
                <CardContent sx={{ pt: 0 }}>
                    <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }} variant="scrollable" scrollButtons="auto">
                        {TABS.map((f) => (<Tab key={f.key} value={f.key} label={f.label} />))}
                    </Tabs>

                    {toast && (
                        <Alert severity={toast.kind} onClose={() => setToast(null)} sx={{ mb: 2 }}>
                            {toast.text}
                        </Alert>
                    )}

                    {loading ? (
                        <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={28} /></Stack>
                    ) : rows.length === 0 ? (
                        <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                            No subscriptions match this filter.
                        </Box>
                    ) : (
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ width: 60 }}>#</TableCell>
                                    <TableCell>User</TableCell>
                                    <TableCell>Plan</TableCell>
                                    <TableCell align="right">Amount</TableCell>
                                    <TableCell sx={{ width: 100 }}>Status</TableCell>
                                    <TableCell>Ends</TableCell>
                                    <TableCell sx={{ width: 130 }}>Grace until</TableCell>
                                    <TableCell sx={{ width: 130 }}>Last nag</TableCell>
                                    <TableCell align="right" sx={{ width: 360 }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((r) => {
                                    const d = daysFromNow(r.ends_at);
                                    const lastNag = r.notifications?.[0];
                                    return (
                                        <TableRow key={r.id} hover>
                                            <TableCell>{r.id}</TableCell>
                                            <TableCell>
                                                <Stack spacing={0.25}>
                                                    <span>{r.user?.email || r.user_id?.slice(0, 8)}</span>
                                                    {r.user?.name && (
                                                        <Typography variant="caption" color="text.secondary">{r.user.name}</Typography>
                                                    )}
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                <Stack spacing={0.25}>
                                                    <span>{r.plan?.plan_name || `plan #${r.subscription_plan_id}`}</span>
                                                    <Typography variant="caption" color="text.secondary">{r.plan?.billing_cycle}</Typography>
                                                </Stack>
                                            </TableCell>
                                            <TableCell align="right">{fmtSgd(r.plan?.amount)}</TableCell>
                                            <TableCell>
                                                <Chip size="small" label={r.status} color={STATUS_COLORS[r.status] || 'default'} />
                                            </TableCell>
                                            <TableCell>
                                                <Stack spacing={0.25}>
                                                    <span>{fmtDate(r.ends_at)}</span>
                                                    {d !== null && (
                                                        <Typography variant="caption"
                                                            color={d < 0 ? 'error' : d <= 7 ? 'warning.main' : 'text.secondary'}>
                                                            {d < 0 ? `${-d}d overdue` : d === 0 ? 'today' : `in ${d}d`}
                                                        </Typography>
                                                    )}
                                                </Stack>
                                            </TableCell>
                                            <TableCell>{fmtDate(r.grace_until)}</TableCell>
                                            <TableCell>
                                                {lastNag ? (
                                                    <Tooltip arrow
                                                        title={`${lastNag.kind} · ${fmtDate(lastNag.created_at)}${lastNag.success ? '' : ' (failed)'}`}>
                                                        <Typography variant="caption">
                                                            {lastNag.kind.replace(/_/g, ' ')}
                                                        </Typography>
                                                    </Tooltip>
                                                ) : (
                                                    <Typography variant="caption" color="text.secondary">—</Typography>
                                                )}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                    {ACTIONS.filter((a) => actionAllowed(a.key, r.status)).map((a) => (
                                                        <Button key={a.key} size="small" variant="outlined" color={a.color}
                                                            startIcon={<Iconify icon={a.icon} />}
                                                            onClick={() => openDialog(r, a)}
                                                            sx={{ minWidth: 0, px: 1 }}
                                                        >
                                                            {a.label}
                                                        </Button>
                                                    ))}
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!dialog} onClose={closeDialog} fullWidth maxWidth="sm">
                <DialogTitle>
                    {dialog?.action.label} subscription #{dialog?.row.id}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        <strong>{dialog?.row.user?.email}</strong> · {dialog?.row.plan?.plan_name} ({dialog?.row.plan?.billing_cycle}).
                        Currently <strong>{dialog?.row.status}</strong>, ends <strong>{fmtDate(dialog?.row.ends_at)}</strong>.
                    </Typography>
                    {dialog?.action.key === 'extend' && (
                        <TextField select fullWidth label="Add days" value={days}
                            onChange={(e) => setDays(Number(e.target.value))} sx={{ mb: 2 }}>
                            {[3, 7, 14, 30, 60, 90].map((d) => (
                                <MenuItem key={d} value={d}>+{d} days</MenuItem>
                            ))}
                        </TextField>
                    )}
                    {dialog?.action.needsReason && (
                        <TextField label={`Reason for ${dialog.action.label.toLowerCase()}`}
                            fullWidth multiline minRows={2} maxRows={6}
                            value={reason} onChange={(e) => setReason(e.target.value)}
                            placeholder={dialog.action.key === 'suspend'
                                ? 'e.g. chargeback dispute opened 14 Jun.'
                                : 'e.g. customer requested cancellation by email.'}
                        />
                    )}
                    {dialog?.action.key === 'cancel' && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            Cancelling demotes the user to Free tier and closes the subscription. This is terminal.
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDialog} disabled={submitting}>Cancel</Button>
                    <Button variant="contained" color={dialog?.action.color} onClick={submit}
                        disabled={submitting} startIcon={submitting ? <CircularProgress size={16} /> : null}>
                        Confirm {dialog?.action.label}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
